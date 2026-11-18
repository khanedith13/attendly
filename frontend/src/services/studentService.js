import { markCheckIn, markCheckOut } from "./roster";
import { ApiError } from "../api/ApiError";
import { storage } from "../utils/storage";
import { adjustCounts, getCatalogEvent } from "./catalog";
import { readSettings } from "./settings";
import { uuid } from "../utils/uuid";
import api from "../api/axios";

const DEMO_STUDENT_ID = 2; // the demo student in authService
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const stateKey = (userId) => `attendly_student_v2_${userId}`;
const newToken = () => uuid();
const isOpen = (event) =>
  event.status === "published" && (event.review ?? "approved") === "approved";
const courseOf = (state, userId) =>
  state.profile?.course ?? (userId === DEMO_STUDENT_ID ? "BS Information Technology" : "");
const yearLevelOf = (state) => state.profile?.yearLevel ?? "";

function emptyState() {
  return {
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
    registrationStatus: registration.status,
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

export async function listEvents() {
  const { data } = await api.get("/events");
  return data;
}

export async function registerForEvent(user, eventId) {
  const { data } = await api.post(
    `/student/events/${eventId}/register`,
  );

  return data.registration;
}

export async function cancelRegistration(user, registrationId) {
  const { data } = await api.delete(
    `/student/registrations/${registrationId}`,
  );

  return data.registration;
}

export async function getMyRegistrations() {
  const { data } = await api.get("/student/registrations");

  return data;
}

/* ---------- Attendance ---------- */

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
    .filter(isOpen)
    .map((event) => ({ id: event.eventId, title: event.title }));

  return {
    events,
    studentId: state.studentId,
    student: {
      name: user.name,
      email: user.email,
      studentId: state.studentId ?? "",
      course: courseOf(state, user.id),
      yearLevel: yearLevelOf(state, user.id),
    },
    activeSession: state.activeSession,
    lastCheckIn: lastCheckInOf(state),
  };
}

export async function getAttendanceOutData(user) {
  await delay();
  const state = loadState(user.id);
  return {
    activeSession: state.activeSession,
    studentId: state.studentId,
    student: {
      name: user.name,
      studentId: state.studentId ?? "",
      course: courseOf(state, user.id),
      yearLevel: yearLevelOf(state, user.id),
    },
  };
}

export async function checkIn(user, { studentId, email, eventId, selfie }) {
  await delay();
  const state = loadState(user.id);

  if (!selfie) {
    throw new ApiError("Validation failed.", 422, {
      selfie: ["A selfie is required for attendance."],
    });
  }

  if (email !== user.email) {
    throw new ApiError("Validation failed.", 422, {
      email: ["Email must match your registered profile."],
    });
  }

  const registration = upcomingRegistrations(state).find((r) => r.eventId === eventId);
  const event = registration ? getCatalogEvent(eventId) : null;
  if (!event || !isOpen(event)) {
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
  const graceMs = readSettings().lateGraceMinutes * 60000;
  const late = new Date(checkedInAt) - new Date(event.startsAt) > graceMs;

  const session = {
    id: Date.now(),
    eventId: event.id,
    eventTitle: event.title,
    studentId,
    checkedInAt,
    selfieIn: selfie,
    attendance: late ? "late" : "present",
    registeredAt: registration.registeredAt,
  };
  saveState(user.id, { ...state, studentId, activeSession: session });
  markCheckIn(event.id, user.id, checkedInAt, selfie);
  adjustCounts(event.id, { checkedIn: 1 });
  return session;
}

export async function checkOut(user, { studentId, selfie }) {
  await delay();
  const state = loadState(user.id);
  const session = state.activeSession;

  if (!session) throw new ApiError("You are not checked in to any event.", 409);

  if (!selfie) {
    throw new ApiError("Validation failed.", 422, {
      selfie: ["A selfie is required for attendance."],
    });
  }

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
    selfieIn: session.selfieIn,
    selfieOut: selfie,
    attendance: session.attendance,
    registeredAt: session.registeredAt,
  };

  markCheckOut(session.eventId, user.id, entry.timeOut, selfie);
  saveState(user.id, {
    ...state,
    history: [entry, ...state.history],
    activeSession: null,
  });
  return entry;
}
