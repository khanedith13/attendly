import { ApiError } from "../api/ApiError";
import { storage } from "../utils/storage";

const DEMO_STUDENT_ID = 2; // the demo student in authService
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const stateKey = (userId) => `attendly_student_${userId}`;

// offsetDays: 0 = today, 3 = three days from now
function dayAt(offsetDays, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function emptyState() {
  return {
    stats: { attended: 0, rate: 0, upcoming: 0, hours: 0 },
    events: [],
    history: [],
    studentId: null,
    activeSession: null,
  };
}

function demoState() {
  return {
    stats: { attended: 18, rate: 96, upcoming: 4, hours: 7 },
    events: [
      {
        id: 101,
        title: "AI & Future Skills Summit",
        venue: "Innovation Hall",
        campus: "Main Campus",
        startsAt: dayAt(0, 16, 30),
        seat: 118,
        capacity: 300,
      },
      {
        id: 102,
        title: "Toastmasters Leadership Lab",
        venue: "Room 204",
        campus: "Business Building",
        startsAt: dayAt(3, 9, 0),
        seat: 96,
        capacity: 120,
      },
      {
        id: 103,
        title: "Talent Acquisition 101",
        venue: "Career Center",
        campus: "Main Campus",
        startsAt: dayAt(5, 13, 0),
        seat: 150,
        capacity: 200,
      },
    ],
    history: [
      {
        id: 1,
        event: "Toastmasters Leadership Lab",
        timeIn: "2026-10-06T08:57:00",
        timeOut: "2026-10-06T11:46:00",
      },
      {
        id: 2,
        event: "Talent Acquisition 101",
        timeIn: "2026-10-04T13:03:00",
        timeOut: "2026-10-04T16:18:00",
      },
      {
        id: 3,
        event: "AI Career Readiness",
        timeIn: "2026-09-29T09:12:00",
        timeOut: "2026-09-29T12:09:00",
      },
    ],
    studentId: "2026-10452",
    activeSession: null,
  };
}

export function loadState(userId) {
  const saved = storage.getJSON(stateKey(userId), null);
  if (saved) return saved;
  return userId === DEMO_STUDENT_ID ? demoState() : emptyState();
}

export function saveState(userId, state) {
  storage.setJSON(stateKey(userId), state);
}

export async function getDashboard(userId) {
  await delay();
  const state = loadState(userId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const nextEvent =
    state.events
      .filter((event) => new Date(event.startsAt) >= startOfToday)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] ?? null;

  const recent = [...state.history]
    .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn))
    .slice(0, 5);

  return { stats: state.stats, nextEvent, recent };
}

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
  return {
    events: state.events,
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

  const event = state.events.find((item) => item.id === eventId);
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

  const session = {
    id: Date.now(),
    eventId: event.id,
    eventTitle: event.title,
    studentId,
    checkedInAt: new Date().toISOString(),
  };
  saveState(user.id, { ...state, studentId, activeSession: session });
  return session;
}

export async function checkOut(user, { studentId }) {
  await delay();
  const state = loadState(user.id);
  const session = state.activeSession;

  if (!session) {
    throw new ApiError("You are not checked in to any event.", 409);
  }

  if (session.studentId !== studentId) {
    throw new ApiError("Validation failed.", 422, {
      studentId: ["Student ID does not match your active session."],
    });
  }

  const entry = {
    id: session.id,
    event: session.eventTitle,
    timeIn: session.checkedInAt,
    timeOut: new Date().toISOString(),
  };

  saveState(user.id, {
    ...state,
    history: [entry, ...state.history],
    stats: { ...state.stats, attended: state.stats.attended + 1 },
    activeSession: null,
  });
  return entry;
}