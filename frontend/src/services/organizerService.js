import * as authService from "./authService";
import { getRoster } from "./roster";
import { storage } from "../utils/storage";
import { validateOrganizerProfile } from "../utils/organizerValidation";
import { ApiError } from "../api/ApiError";
import { toApiErrors } from "../utils/apiErrors";
import { toIso } from "../utils/dates";
import { validateEvent } from "../utils/eventValidation";
import { percent } from "../utils/format";
import { toneForCategory } from "../config/events";
import {
  addCatalogEvent,
  getCatalog,
  getCatalogEvent,
  updateCatalogEvent,
  updateOwnedEvents,
} from "./catalog";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const sum = (events, field) => events.reduce((total, event) => total + (event[field] ?? 0), 0);
const byStartAsc = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);
const byStartDesc = (a, b) => new Date(b.startsAt) - new Date(a.startsAt);

function ownEvents(user) {
  return getCatalog().filter((event) => event.ownerId === user.id);
}

// An organizer can only touch their own events.
function ownEvent(user, id) {
  const event = getCatalogEvent(id);
  if (!event || event.ownerId !== user.id) throw new ApiError("Event not found.", 404);
  return event;
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

export async function listMyEvents(user) {
  await delay();
  return ownEvents(user).sort(byStartDesc);
}

export async function publishEvent(user, id) {
  await delay();
  const event = ownEvent(user, id);

  if (event.status !== "draft") throw new ApiError("Only draft events can be published.", 409);
  if (new Date(event.endsAt) < new Date()) {
    throw new ApiError("This event's date has passed. Edit the date before publishing.", 409);
  }
  updateCatalogEvent(id, { status: "published" });
}

export async function cancelEvent(user, id) {
  await delay();
  const event = ownEvent(user, id);

  if (event.status !== "published")
    throw new ApiError("Only published events can be cancelled.", 409);
  if (new Date(event.endsAt) < new Date()) {
    throw new ApiError("This event has already ended.", 409);
  }
  updateCatalogEvent(id, { status: "cancelled" });
}

// The fields that come from the form, in the shape the store keeps.
function fieldsFromForm(data) {
  return {
    title: data.title.trim(),
    description: data.description.trim(),
    venue: data.venue.trim(),
    campus: "",
    category: data.category,
    capacity: Number(data.capacity),
    startsAt: toIso(data.date, data.startTime),
    endsAt: toIso(data.date, data.endTime),
    requireSchoolGmail: data.requireSchoolGmail,
    sendConfirmation: data.sendConfirmation,
    qrIn: data.qrIn,
    qrOut: data.qrOut,
    tone: toneForCategory[data.category],
  };
}

function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw new ApiError("Validation failed.", 422, toApiErrors(errors));
  }
}

export async function getEventForEdit(user, id) {
  await delay();
  return ownEvent(user, id);
}

export async function createEvent(user, data, { publish = false } = {}) {
  await delay();
  assertValid(validateEvent(data, { publish }));

  const event = {
    ...fieldsFromForm(data),
    id: Date.now(),
    status: publish ? "published" : "draft",
    ownerId: user.id,
    organizer: user.name,
    registered: 0,
    checkedIn: 0,
    createdAt: new Date().toISOString(),
  };
  addCatalogEvent(event);
  return event;
}

export async function updateEvent(user, id, data, { publish = false } = {}) {
  await delay();
  const event = ownEvent(user, id);

  if (event.status === "cancelled" || new Date(event.endsAt) < new Date()) {
    throw new ApiError("This event can no longer be edited.", 409);
  }

  assertValid(
    validateEvent(data, {
      publish: publish || event.status === "published",
      minCapacity: event.registered,
    }),
  );

  updateCatalogEvent(id, {
    ...fieldsFromForm(data),
    status: publish && event.status === "draft" ? "published" : event.status,
  });
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
    .filter((row) => titles.has(row.eventId) && ["registered", "waitlisted"].includes(row.status))
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
