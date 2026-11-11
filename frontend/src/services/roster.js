import { COURSES, FIRST, LAST } from "./names";
import { ApiError } from "../api/ApiError";
import { storage } from "../utils/storage";
import { getCatalog } from "./catalog";

const ROSTER_KEY = "attendly_roster_v1";
const DAY = 86400000;
const HOUR = 3600000;

const DEMO_STUDENT = {
  userId: 2, // the demo student in authService
  name: "Delfin Octobre",
  studentId: "2026-10452",
  email: "student@school.edu.ph",
  course: "BS Information Technology",
  yearLevel: "",
};

// Made-up but repeatable students, so the demo looks the same every time.
function fakeStudent(eventId, i) {
  const first = FIRST[(i * 7 + eventId) % FIRST.length];
  const last = LAST[(i * 11 + eventId * 3) % LAST.length];
  return {
    userId: null,
    name: `${first} ${last}`,
    email: `${first}.${last}`.toLowerCase().replaceAll(" ", "") + "@school.edu.ph",
    studentId: `2026-${10000 + ((i * 97 + eventId * 131) % 89000)}`,
    course: COURSES[(i + eventId) % COURSES.length],
    yearLevel: "",
  };
}

function seedRoster() {
  const now = Date.now();
  const rows = [];

  for (const event of getCatalog()) {
    if (event.status === "draft") continue;

    const start = new Date(event.startsAt).getTime();
    const ended = new Date(event.endsAt).getTime() < now;
    const hasDemoStudent = [101, 102, 103, 104].includes(event.id);

    for (let i = 0; i < event.registered; i++) {
      const person = hasDemoStudent && i === 0 ? DEMO_STUDENT : fakeStudent(event.id, i);
      const arrived = i < event.checkedIn;

      rows.push({
        id: event.id * 100000 + i,
        eventId: event.id,
        ...person,
        // Registered at least two days ago, and never after the event began.
        registeredAt: new Date(
          Math.min(start, now) - (2 + (i % 12)) * DAY - ((i * 3571) % 80000) * 1000,
        ).toISOString(),
        status: "registered",
        timeIn: arrived ? new Date(start + (((i * 5) % 50) - 12) * 60000).toISOString() : null,
        timeOut:
          arrived && ended
            ? new Date(start + 2.5 * HOUR + ((i * 3) % 30) * 60000).toISOString()
            : null,
      });
    }
  }
  return rows;
}

function readRoster() {
  const saved = storage.getJSON(ROSTER_KEY, null);
  if (saved) return saved;

  const fresh = seedRoster();
  storage.setJSON(ROSTER_KEY, fresh);
  return fresh;
}

const saveRoster = (rows) => storage.setJSON(ROSTER_KEY, rows);

export function getRoster() {
  return readRoster();
}

export function recordPublicAttendance({
  token,
  direction,
  studentId,
  name,
  course,
  yearLevel,
  selfie,
}) {
  if (!["in", "out"].includes(direction)) {
    throw new ApiError("Invalid attendance direction.", 422);
  }
  if (!studentId.trim() || !name.trim() || !course.trim() || !yearLevel.trim() || !selfie) {
    throw new ApiError("Complete all fields and take a selfie.", 422);
  }

  const event = getCatalog().find((item) => item[direction === "in" ? "qrIn" : "qrOut"] === token);
  if (!event || event.status !== "published" || (event.review ?? "approved") !== "approved") {
    throw new ApiError("This attendance QR is invalid or inactive.", 404);
  }

  const now = new Date();
  if (now < new Date(event.startsAt) || now > new Date(event.endsAt)) {
    throw new ApiError("Attendance is only available during the event time.", 409);
  }

  const rows = readRoster();
  const index = rows.findIndex(
    (row) =>
      row.eventId === event.id && row.studentId === studentId.trim() && row.status === "registered",
  );
  if (index < 0) {
    throw new ApiError("This Student ID is not registered for this event.", 422, {
      studentId: ["This Student ID is not registered for this event."],
    });
  }

  const row = rows[index];
  if (direction === "in" && row.timeIn) {
    throw new ApiError("Attendance in has already been recorded.", 409);
  }
  if (direction === "out" && !row.timeIn) {
    throw new ApiError("Check in before recording attendance out.", 409);
  }
  if (direction === "out" && row.timeOut) {
    throw new ApiError("Attendance out has already been recorded.", 409);
  }

  const time = now.toISOString();
  const updated = {
    ...row,
    name: name.trim(),
    course: course.trim(),
    yearLevel: yearLevel.trim(),
    ...(direction === "in"
      ? { timeIn: time, selfieIn: selfie }
      : { timeOut: time, selfieOut: selfie }),
  };
  rows[index] = updated;
  saveRoster(rows);

  return { event, direction, time, student: updated };
}

const isMine = (row, eventId, userId) => row.eventId === eventId && row.userId === userId;

export function upsertRegistration({ eventId, user, studentId, course, yearLevel }) {
  const rows = readRoster();
  const now = new Date().toISOString();

  if (rows.some((row) => isMine(row, eventId, user.id))) {
    saveRoster(
      rows.map((row) =>
        isMine(row, eventId, user.id)
          ? { ...row, status: "registered", registeredAt: now, timeIn: null, timeOut: null }
          : row,
      ),
    );
    return;
  }

  saveRoster([
    {
      id: Date.now(),
      eventId,
      userId: user.id,
      name: user.name,
      studentId: studentId ?? "",
      email: user.email,
      course: course ?? "",
      yearLevel: yearLevel ?? "",
      registeredAt: now,
      status: "registered",
      timeIn: null,
      timeOut: null,
    },
    ...rows,
  ]);
}

function patchMine(eventId, userId, patch) {
  saveRoster(
    readRoster().map((row) => (isMine(row, eventId, userId) ? { ...row, ...patch } : row)),
  );
}

export const cancelRosterRegistration = (eventId, userId) =>
  patchMine(eventId, userId, { status: "cancelled" });

export const markCheckIn = (eventId, userId, iso, selfie) =>
  patchMine(eventId, userId, { timeIn: iso, selfieIn: selfie });

export const markCheckOut = (eventId, userId, iso, selfie) =>
  patchMine(eventId, userId, { timeOut: iso, selfieOut: selfie });

// Keeps the organizer's view in step when a student edits their account.
export function syncProfile(userId, { name, studentId, course, yearLevel }) {
  saveRoster(
    readRoster().map((row) =>
      row.userId === userId ? { ...row, name, studentId, course, yearLevel } : row,
    ),
  );
}
