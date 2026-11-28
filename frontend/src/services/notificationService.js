import api from "../api/axios";
import { formatDay, formatTime, percent } from "../utils/format";
import { getAccount } from "./accountService";
import { getMyRegistrations } from "./studentService";

const HOUR = 3600000;

function startsText(event, now) {
  const start = new Date(event.startsAt);
  if (start.getTime() <= now) return "Happening now";

  const days = Math.round(
    (new Date(start).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / (24 * HOUR),
  );

  if (days <= 0) return `Starts today at ${formatTime(event.startsAt)}`;
  if (days === 1) return `Starts tomorrow at ${formatTime(event.startsAt)}`;
  return `Starts ${formatDay(event.startsAt)} at ${formatTime(event.startsAt)}`;
}

async function studentAlerts() {
  const [registrations, account, activeResponse] = await Promise.all([
    getMyRegistrations(),
    getAccount(),
    api.get("/student/attendance/active"),
  ]);
  const prefs = { reminders: true, ...account.notifications };
  const now = Date.now();
  const items = [];

  for (const registration of registrations.upcoming ?? []) {
    const soon = new Date(registration.startsAt).getTime() - now <= 48 * HOUR;
    const notOver = new Date(registration.endsAt).getTime() >= now;

    if (prefs.reminders && soon && notOver) {
      items.push({
        id: `soon:${registration.id}`,
        tone: "info",
        title: registration.title,
        text: startsText(registration, now),
        to: "/student/registrations",
      });
    }
  }

  const active = activeResponse.data.activeSession;
  if (active) {
    items.push({
      id: "session",
      tone: "success",
      title: "You are checked in",
      text: `${active.event.title}. Remember to check out when you leave.`,
      to: "/student/attendance-out",
    });
  }

  return items;
}

async function organizerAlerts() {
  const [eventsResponse, registrationsResponse, profileResponse] = await Promise.all([
    api.get("/organizer/events"),
    api.get("/organizer/registrations"),
    api.get("/organizer/profile"),
  ]);
  const events = Array.isArray(eventsResponse.data)
    ? eventsResponse.data
    : (eventsResponse.data.data ?? []);
  const rows = registrationsResponse.data.rows ?? [];
  const prefs = {
    registrations: true,
    capacity: true,
    ...profileResponse.data.notifications,
  };
  const now = Date.now();
  const ownUpcoming = events.filter(
    (event) => event.status === "published" && new Date(event.endsAt).getTime() >= now,
  );
  const items = [];

  for (const event of ownUpcoming) {
    if (event.review === "pending") {
      items.push({
        id: `pending:${event.id}`,
        tone: "warning",
        title: event.title,
        text: "Waiting for admin approval. Students cannot see it yet.",
        to: "/organizer/events",
      });
    }
    if (event.review === "flagged") {
      items.push({
        id: `flag:${event.id}`,
        tone: "danger",
        title: event.title,
        text: event.reviewNote ? `Flagged: ${event.reviewNote}` : "Flagged by an admin.",
        to: "/organizer/events",
      });
    }

    if (prefs.capacity && event.capacity > 0 && event.registered >= event.capacity * 0.9) {
      const full = event.registered >= event.capacity;
      items.push({
        id: `capacity:${event.id}`,
        tone: "warning",
        title: event.title,
        text: full
          ? `Full: ${event.registered} of ${event.capacity} seats taken.`
          : `${percent(event.registered, event.capacity)}% full: ${event.registered} of ${event.capacity} seats taken.`,
        to: "/organizer/registrations",
      });
    }
  }

  if (prefs.registrations) {
    const since = now - 24 * HOUR;
    const counts = new Map();

    for (const row of rows) {
      if (new Date(row.registeredAt).getTime() < since) continue;
      counts.set(row.eventId, (counts.get(row.eventId) ?? 0) + 1);
    }

    for (const event of ownUpcoming) {
      const count = counts.get(event.id);
      if (!count) continue;
      items.push({
        id: `registrations:${event.id}`,
        tone: "info",
        title: event.title,
        text: `${count} new registration${count === 1 ? "" : "s"} in the last 24 hours.`,
        to: "/organizer/registrations",
      });
    }
  }

  return items;
}

async function adminAlerts() {
  const { data } = await api.get("/admin/dashboard");
  const items = [];

  if (data.review?.organizers > 0) {
    items.push({
      id: "pending-organizers",
      tone: "warning",
      title: "Organizer applications",
      text: `${data.review.organizers} organizer application${data.review.organizers === 1 ? "" : "s"} need review.`,
      to: "/admin/organizers",
    });
  }

  if (data.review?.events > 0) {
    items.push({
      id: "pending-events",
      tone: "warning",
      title: "Event submissions",
      text: `${data.review.events} event submission${data.review.events === 1 ? "" : "s"} need review.`,
      to: "/admin/events",
    });
  }

  if (data.review?.flagged > 0) {
    items.push({
      id: "flagged-events",
      tone: "danger",
      title: "Flagged events",
      text: `${data.review.flagged} event${data.review.flagged === 1 ? "" : "s"} are flagged.`,
      to: "/admin/events",
    });
  }

  return items;
}

export async function getNotifications(user) {
  if (user.role === "student") return studentAlerts();
  if (user.role === "organizer") return organizerAlerts();
  if (user.role === "admin") return adminAlerts();
  return [];
}
