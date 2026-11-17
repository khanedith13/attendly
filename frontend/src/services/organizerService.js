import { notifyReviewsChanged } from "../utils/reviewBus";
import * as authService from "./authService";
import { getRoster } from "./roster";
import { storage } from "../utils/storage";
import { validateOrganizerProfile } from "../utils/organizerValidation";
import { ApiError } from "../api/ApiError";
import { toApiErrors } from "../utils/apiErrors";
import { percent } from "../utils/format";
import api from "../api/axios";
import { getCatalog, updateOwnedEvents } from "./catalog";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const sum = (events, field) => events.reduce((total, event) => total + (event[field] ?? 0), 0);
const byStartAsc = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);
const byStartDesc = (a, b) => new Date(b.startsAt) - new Date(a.startsAt);

function ownEvents(user) {
  return getCatalog().filter((event) => event.ownerId === user.id);
}

export async function getOrganizerDashboard(user) {
  await delay();
  const now = Date.now();
  const published = ownEvents(user).filter((event) => event.status === "published");
  const started = published.filter((event) => new Date(event.startsAt).getTime() <= now);

  const startedRegistered = sum(started, "registered");
  const startedCheckedIn = sum(started, "checkedIn");

  return {
    stats: {
      published: published.length,
      registrations: sum(published, "registered"),
      checkedIn: sum(published, "checkedIn"),
      showUpRate: percent(startedCheckedIn, startedRegistered),
    },
    performance:
      started.length > 0
        ? {
            rate: percent(startedCheckedIn, startedRegistered),
            checkedIn: startedCheckedIn,
            noShow: startedRegistered - startedCheckedIn,
            registered: startedRegistered,
          }
        : null,
    upcoming: published
      .filter((event) => new Date(event.endsAt).getTime() >= now)
      .sort(byStartAsc)
      .slice(0, 3),
    recent: started.sort(byStartDesc).slice(0, 5),
  };
}

export async function listMyEvents() {
  const { data } = await api.get("/organizer/events");
  return data;
}

export async function publishEvent(user, id) {
  await api.post(`/organizer/events/${id}/publish`);
  notifyReviewsChanged();
}

export async function cancelEvent(user, id) {
  await api.post(`/organizer/events/${id}/cancel`);
}

function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw new ApiError("Validation failed.", 422, toApiErrors(errors));
  }
}

export async function getEventForEdit(user, id) {
  const { data } = await api.get(`/organizer/events/${id}`);
  return data;
}

export async function createEvent(user, data, { publish = false } = {}) {
  const { data: event } = await api.post("/organizer/events", {
    ...data,
    publish,
  });

  if (publish) {
    notifyReviewsChanged();
  }

  return event;
}

export async function updateEvent(user, id, data, { publish = false } = {}) {
  await api.put(`/organizer/events/${id}`, {
    ...data,
    publish,
  });

  if (publish) {
    notifyReviewsChanged();
  }
}

/* ---------- Attendees ---------- */

export async function getAttendees(user, eventId) {
  await delay();
  const now = Date.now();
  const events = ownEvents(user)
    .filter((event) => event.status === "published")
    .sort(byStartDesc);

  // Default: the most recent event that has already started.
  const fallback =
    events.find((event) => new Date(event.startsAt).getTime() <= now) ?? events[0] ?? null;
  const event = events.find((item) => item.id === eventId) ?? fallback;

  return {
    events: events.map(({ id, title }) => ({ id, title })),
    event,
    rows: event
      ? getRoster().filter((row) => row.eventId === event.id && row.status === "registered")
      : [],
  };
}

/* ---------- Upcoming registrations ---------- */

export async function getRegistrations(user) {
  await delay();
  const now = Date.now();
  const events = ownEvents(user)
    .filter((event) => event.status === "published" && new Date(event.endsAt).getTime() >= now)
    .sort(byStartAsc);
  const titles = new Map(events.map((event) => [event.id, event.title]));

  const rows = getRoster()
    .filter((row) => titles.has(row.eventId) && row.status === "registered")
    .map((row) => ({ ...row, eventTitle: titles.get(row.eventId) }))
    .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

  return {
    events: events.map(({ id, title }) => ({ id, title })),
    rows,
    upcoming: events.length,
  };
}

export async function sendReminder(user, { eventId, message }) {
  await delay();
  const text = message.trim();

  if (text.length < 10) assertValid({ message: "Write at least 10 characters." });
  if (text.length > 500) assertValid({ message: "Use 500 characters or fewer." });

  const { rows } = await getRegistrations(user);
  const recipients = rows.filter(
    (row) => row.status === "registered" && (!eventId || row.eventId === eventId),
  );
  if (recipients.length === 0) {
    throw new ApiError("There are no registered students to notify.", 409);
  }
  return { count: recipients.length };
}

/* ---------- Organizer profile ---------- */

const DEMO_ORGANIZER_ID = 3; // the demo organizer in authService
const profileKey = (userId) => `attendly_organizer_${userId}`;

function defaultProfile(user) {
  const isDemo = user.id === DEMO_ORGANIZER_ID;
  return {
    organizationName: isDemo ? "Events Team" : user.name,
    contactNumber: isDemo ? "+63 917 123 4567" : "",
    notifications: { registrations: true, capacity: true, daily: false },
  };
}

export function organizerProfileOf(user) {
  return { ...defaultProfile(user), ...storage.getJSON(profileKey(user.id), {}) };
}

export async function getOrganizerProfile(user) {
  await delay();
  const saved = storage.getJSON(profileKey(user.id), {});
  const published = ownEvents(user).filter((event) => event.status === "published");

  return {
    ...defaultProfile(user),
    ...saved,
    stats: { events: published.length, registrations: sum(published, "registered") },
  };
}

export async function saveOrganizerProfile(user, values) {
  await delay();
  assertValid(validateOrganizerProfile(values));

  await authService.updateProfile(user.id, { name: values.name.trim() });
  storage.setJSON(profileKey(user.id), {
    organizationName: values.organizationName.trim(),
    contactNumber: values.contactNumber.trim(),
    notifications: values.notifications,
  });
  // Students see the organization name on the events.
  updateOwnedEvents(user.id, { organizer: values.organizationName.trim() });
}
