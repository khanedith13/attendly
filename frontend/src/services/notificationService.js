import { formatDay, formatTime, percent } from "../utils/format";
import { storage } from "../utils/storage";
import { getCatalog } from "./catalog";
import { getRoster } from "./roster";
import { loadState } from "./studentService";

const HOUR = 3600000;

function startsText(event, now) {
  const start = new Date(event.startsAt);
  if (start.getTime() <= now) return "Happening now";

  const startDay = new Date(start).setHours(0, 0, 0, 0);
  const today = new Date(now).setHours(0, 0, 0, 0);
  const days = Math.round((startDay - today) / (24 * HOUR));

  if (days <= 0) return `Starts today at ${formatTime(event.startsAt)}`;
  if (days === 1) return `Starts tomorrow at ${formatTime(event.startsAt)}`;
  return `Starts ${formatDay(event.startsAt)} at ${formatTime(event.startsAt)}`;
}

// Things a student should know about right now.
function studentAlerts(user) {
  const state = loadState(user.id);
  const prefs = { reminders: true, ...state.profile?.notifications };
  const events = new Map(getCatalog().map((event) => [event.id, event]));
  const attended = new Set(state.history.map((entry) => entry.eventId).filter(Boolean));
  const now = Date.now();
  const items = [];

  for (const registration of state.registrations) {
    if (registration.status !== "registered" || attended.has(registration.eventId)) continue;

    const event = events.get(registration.eventId);
    if (!event) continue;

    const visible = event.status === "published" && (event.review ?? "approved") === "approved";
    if (!visible) {
      items.push({
        id: `gone:${registration.id}`,
        tone: "danger",
        title: event.title,
        text:
          event.status === "cancelled"
            ? "This event was cancelled."
            : "This event is not available right now.",
        to: "/student/registrations",
      });
      continue;
    }

    const soon = new Date(event.startsAt).getTime() - now <= 48 * HOUR;
    const notOver = new Date(event.endsAt).getTime() >= now;
    if (prefs.reminders && soon && notOver) {
      items.push({
        id: `soon:${registration.id}`,
        tone: "info",
        title: event.title,
        text: startsText(event, now),
        to: "/student/registrations",
      });
    }
  }

  if (state.activeSession) {
    items.push({
      id: "session",
      tone: "success",
      title: "You are checked in",
      text: `${state.activeSession.eventTitle}. Remember to check out when you leave.`,
      to: "/student/attendance-out",
    });
  }
  return items;
}

// Things an organizer needs to act on or keep an eye on.
function organizerAlerts(user) {
  const saved = storage.getJSON(`attendly_organizer_${user.id}`, {});
  const prefs = { registrations: true, capacity: true, ...saved.notifications };
  const now = Date.now();
  const own = getCatalog().filter(
    (event) => event.ownerId === user.id && event.status === "published",
  );
  const items = [];

  for (const event of own) {
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

    const notOver = new Date(event.endsAt).getTime() >= now;
    if (prefs.capacity && notOver && event.registered >= event.capacity * 0.9) {
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
    for (const row of getRoster()) {
      if (row.status !== "registered" || new Date(row.registeredAt).getTime() < since) continue;
      counts.set(row.eventId, (counts.get(row.eventId) ?? 0) + 1);
    }

    for (const event of own) {
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

export async function getNotifications(user) {
  if (user.role === "student") return studentAlerts(user);
  if (user.role === "organizer") return organizerAlerts(user);
  return [];
}
