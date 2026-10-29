import { ApiError } from "../api/ApiError";
import { storage } from "../utils/storage";
import { getCatalog, getCatalogEvent } from "./catalog";

const DEMO_STUDENT_ID = 2; // the demo student in authService
const LATE_GRACE_MS = 15 * 60 * 1000;
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const stateKey = (userId) => `attendly_student_v2_${userId}`;
const newToken = () => crypto.randomUUID();
const byStart = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function emptyState() {
  return {
    stats: { attended: 0, rate: 0, hours: 0 },
    registrations: [],
    history: [],
    studentId: null,
    activeSession: null,
  };
}

function demoState() {
  const reg = (id, eventId, registeredAt) => ({
    id,
    eventId,
    status: "registered",
    qrToken: newToken(),
    registeredAt,
  });

  return {
    stats: { attended: 18, rate: 96, hours: 7 },
    registrations: [
      reg(1, 101, "2026-10-01T09:15:00"),
      reg(2, 102, "2026-10-02T14:40:00"),
      reg(3, 103, "2026-10-03T10:05:00"),
      reg(4, 104, "2026-10-04T16:20:00"),
    ],
    history: [
      {
        id: 11,
        event: "Toastmasters Leadership Lab",
        timeIn: "2026-10-06T08:57:00",
        timeOut: "2026-10-06T11:46:00",
        attendance: "present",
        registeredAt: "2026-09-30T10:12:00",
      },
      {
        id: 12,
        event: "Talent Acquisition 101",
        timeIn: "2026-10-04T13:03:00",
        timeOut: "2026-10-04T16:18:00",
        attendance: "late",
        registeredAt: "2026-09-28T15:30:00",
      },
      {
        id: 13,
        event: "AI Career Readiness",
        timeIn: "2026-09-29T09:12:00",
        timeOut: "2026-09-29T12:09:00",
        attendance: "present",
        registeredAt: "2026-09-22T11:00:00",
      },
    ],
    studentId: "2026-10452",
    activeSession: null,
  };
}

export function saveState(userId, state) {
  storage.setJSON(stateKey(userId), state);
}

export function loadState(userId) {
  const saved = storage.getJSON(stateKey(userId), null);
  if (saved) return saved;

  // Saved right away so the QR tokens stay the same after a refresh.
  const fresh = userId === DEMO_STUDENT_ID ? demoState() : emptyState();
  saveState(userId, fresh);
  return fresh;
}

// A registration plus the event it belongs to. `id` is the registration id.
function joinEvent(registration) {
  const event = getCatalogEvent(registration.eventId);
  if (!event) return null;
  return {
    ...event,
    id: registration.id,
    eventId: event.id,
    qrToken: registration.qrToken,
    registeredAt: registration.registeredAt,
    status: registration.status,
  };
}

// Active registrations for events the student has not attended yet.
function upcomingRegistrations(state) {
  const attendedIds = new Set(state.history.map((entry) => entry.eventId).filter(Boolean));
  return state.registrations.filter(
    (registration) =>
      registration.status === "registered" && !attendedIds.has(registration.eventId),
  );
}

/* ---------- Dashboard ---------- */

export async function getDashboard(userId) {
  await delay();
  const state = loadState(userId);

  const upcoming = upcomingRegistrations(state)
    .map(joinEvent)
    .filter(Boolean)
    .filter((event) => new Date(event.startsAt) >= startOfToday())
    .sort(byStart);

  const next = upcoming[0] ?? null;
  const recent = [...state.history]
    .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn))
    .slice(0, 5);

  return {
    stats: { ...state.stats, upcoming: upcoming.length },
    nextEvent: next && { ...next, seat: next.registered },
    recent,
  };
}

/* ---------- Browse events and registrations ---------- */

export async function listEvents(userId) {
  await delay();
  const state = loadState(userId);
  const mine = new Map(state.registrations.map((r) => [r.eventId, r.status]));

  return getCatalog().map((event) => ({
    ...event,
    myStatus: mine.get(event.id) ?? null,
    isFull: event.registered >= event.capacity,
  }));
}

export async function registerForEvent(user, eventId) {
  await delay();
  const state = loadState(user.id);
  const event = getCatalogEvent(eventId);

  if (!event) throw new ApiError("Event not found.", 404);
  if (new Date(event.startsAt) < startOfToday()) {
    throw new ApiError("Registration is closed for this event.", 409);
  }

  const existing = state.registrations.find((r) => r.eventId === eventId);
  if (existing?.status === "registered") {
    throw new ApiError("You are already registered for this event.", 409);
  }
  if (event.registered >= event.capacity) throw new ApiError("This event is full.", 409);

  const now = new Date().toISOString();
  let registration;
  let registrations;

  if (existing) {
    // One row per student and event (like your ERD): re-registering reuses it.
    registration = { ...existing, status: "registered", qrToken: newToken(), registeredAt: now };
    registrations = state.registrations.map((r) => (r.id === existing.id ? registration : r));
  } else {
    registration = {
      id: Date.now(),
      eventId,
      status: "registered",
      qrToken: newToken(),
      registeredAt: now,
    };
    registrations = [registration, ...state.registrations];
  }

  saveState(user.id, { ...state, registrations });
  return registration;
}

export async function cancelRegistration(user, registrationId) {
  await delay();
  const state = loadState(user.id);
  const registration = state.registrations.find(
    (r) => r.id === registrationId && r.status === "registered",
  );

  if (!registration) throw new ApiError("Registration not found.", 404);

  const event = getCatalogEvent(registration.eventId);
  if (state.activeSession?.eventId === registration.eventId) {
    throw new ApiError("You are checked in to this event. Check out first.", 409);
  }
  if (event && new Date(event.startsAt) < new Date()) {
    throw new ApiError("This event has already started and can no longer be cancelled.", 409);
  }

  saveState(user.id, {
    ...state,
    registrations: state.registrations.map((r) =>
      r.id === registrationId ? { ...r, status: "cancelled" } : r,
    ),
  });
}

export async function getMyRegistrations(userId) {
  await delay();
  const state = loadState(userId);

  const upcoming = upcomingRegistrations(state).map(joinEvent).filter(Boolean).sort(byStart);
  const cancelled = state.registrations
    .filter((r) => r.status === "cancelled")
    .map(joinEvent)
    .filter(Boolean);
  const past = [...state.history].sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));

  return {
    upcoming,
    cancelled,
    past,
    counts: {
      total: upcoming.length + past.length + cancelled.length,
      upcoming: upcoming.length,
      attended: past.length,
      cancelled: cancelled.length,
    },
  };
}

/* ---------- Attendance (Step 9) ---------- */

function lastCheckInOf(state) {
  const items = state.history.map((entry) => ({ event: entry.event, at: entry.timeIn }));
  if (state.activeSession) {
    items.push({ event: state.activeSession.eventTitle, at: state.activeSession.checkedInAt });
  }
  return items.sort((a, b) => new Date(b.at) - new Date(a.at))[0] ?? null;
}

export async function getAttendanceInData(user) {
  await delay();
  const state = loadState(user.id);
  const events = upcomingRegistrations(state)
    .map(joinEvent)
    .filter(Boolean)
    .map((event) => ({ id: event.eventId, title: event.title }));

  return {
    events,
    studentId: state.studentId,
    activeSession: state.activeSession,
    lastCheckIn: lastCheckInOf(state),
  };
}

export async function getAttendanceOutData(user) {
  await delay();
  const state = loadState(user.id);
  return { activeSession: state.activeSession, studentId: state.studentId };
}

export async function checkIn(user, { studentId, email, eventId }) {
  await delay();
  const state = loadState(user.id);

  if (email !== user.email) {
    throw new ApiError("Validation failed.", 422, {
      email: ["Email must match your registered profile."],
    });
  }

  const registration = upcomingRegistrations(state).find((r) => r.eventId === eventId);
  const event = registration ? getCatalogEvent(eventId) : null;
  if (!event) {
    throw new ApiError("Validation failed.", 422, {
      eventId: ["Select one of your registered events."],
    });
  }

  if (state.activeSession) {
    throw new ApiError(
      `You are already checked in to ${state.activeSession.eventTitle}. Check out first.`,
      409,
    );
  }

  const checkedInAt = new Date().toISOString();
  const late = new Date(checkedInAt) - new Date(event.startsAt) > LATE_GRACE_MS;

  const session = {
    id: Date.now(),
    eventId: event.id,
    eventTitle: event.title,
    studentId,
    checkedInAt,
    attendance: late ? "late" : "present",
    registeredAt: registration.registeredAt,
  };
  saveState(user.id, { ...state, studentId, activeSession: session });
  return session;
}

export async function checkOut(user, { studentId }) {
  await delay();
  const state = loadState(user.id);
  const session = state.activeSession;

  if (!session) throw new ApiError("You are not checked in to any event.", 409);

  if (session.studentId !== studentId) {
    throw new ApiError("Validation failed.", 422, {
      studentId: ["Student ID does not match your active session."],
    });
  }

  const entry = {
    id: session.id,
    eventId: session.eventId,
    event: session.eventTitle,
    timeIn: session.checkedInAt,
    timeOut: new Date().toISOString(),
    attendance: session.attendance,
    registeredAt: session.registeredAt,
  };

  saveState(user.id, {
    ...state,
    history: [entry, ...state.history],
    stats: { ...state.stats, attended: state.stats.attended + 1 },
    activeSession: null,
  });
  return entry;
}
