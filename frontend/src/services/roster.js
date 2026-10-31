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
};

const FIRST = [
  "Ana",
  "John",
  "Lea",
  "Rafael",
  "Mika",
  "Paolo",
  "Carla",
  "Jose",
  "Bea",
  "Miguel",
  "Sofia",
  "Luis",
  "Nina",
  "Carlo",
  "Trina",
  "Marco",
  "Hannah",
  "Ian",
  "Kyle",
  "Pia",
  "Enzo",
  "Gwen",
  "Noel",
  "Rhea",
  "Vince",
  "Tess",
  "Dino",
  "Alma",
  "Rey",
  "Joy",
];
const LAST = [
  "Santos",
  "Reyes",
  "Cruz",
  "Kim",
  "Garcia",
  "Lopez",
  "Torres",
  "Ramos",
  "Flores",
  "Mendoza",
  "Bautista",
  "Aquino",
  "Castro",
  "Navarro",
  "Salazar",
  "Domingo",
  "Pascual",
  "Tan",
  "Lim",
  "Go",
  "Rivera",
  "Soriano",
  "Hernandez",
  "Gonzales",
  "Aguilar",
  "Ocampo",
  "Valdez",
  "Mercado",
  "Dizon",
  "Evangelista",
];
const COURSES = ["BSIT", "BSBA", "BSCS", "BA Comm", "BSED", "BSN"];

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
        registeredAt: new Date(
          start - (1 + (i % 12)) * DAY - ((i * 3571) % 80000) * 1000,
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

  // A few waitlisted students (demo only; waiting lists are not in the ERD).
  for (let i = 0; i < 4; i++) {
    rows.push({
      id: 103 * 100000 + 90000 + i,
      eventId: 103,
      ...fakeStudent(103, 500 + i),
      registeredAt: new Date(now - (i + 1) * HOUR * 5).toISOString(),
      status: "waitlisted",
      timeIn: null,
      timeOut: null,
    });
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

const isMine = (row, eventId, userId) => row.eventId === eventId && row.userId === userId;

export function upsertRegistration({ eventId, user, studentId, course }) {
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

export const markCheckIn = (eventId, userId, iso) => patchMine(eventId, userId, { timeIn: iso });

export const markCheckOut = (eventId, userId, iso) => patchMine(eventId, userId, { timeOut: iso });

// Keeps the organizer's view in step when a student edits their account.
export function syncProfile(userId, { name, studentId, course }) {
  saveRoster(
    readRoster().map((row) => (row.userId === userId ? { ...row, name, studentId, course } : row)),
  );
}
