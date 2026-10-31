import { storage } from "../utils/storage";

const EVENTS_KEY = "attendly_events_v1";
const DEMO_ORGANIZER_ID = 3; // the demo organizer in authService

// offsetDays: 0 = today, 3 = three days from now, -6 = six days ago
export function dayAt(offsetDays, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function make({ day, start, end, ...fields }) {
  return {
    description: "",
    status: "published", // "draft" | "published" | "cancelled"
    ownerId: DEMO_ORGANIZER_ID,
    organizer: "Events Team",
    campus: "",
    requireSchoolGmail: true,
    sendConfirmation: true,
    registered: 0,
    checkedIn: 0,
    qrIn: crypto.randomUUID(),
    qrOut: crypto.randomUUID(),
    createdAt: dayAt(day - 14, 9, 0),
    startsAt: dayAt(day, start[0], start[1]),
    endsAt: dayAt(day, end[0], end[1]),
    ...fields,
  };
}

function seed() {
  return [
    make({
      id: 101,
      title: "AI & Future Skills Summit",
      venue: "Innovation Hall",
      campus: "Main Campus",
      day: 0,
      start: [16, 30],
      end: [19, 30],
      capacity: 300,
      registered: 118,
      category: "Technology",
      tone: "violet",
    }),
    make({
      id: 102,
      title: "Toastmasters Leadership Lab",
      venue: "Room 204",
      campus: "Business Building",
      day: 3,
      start: [9, 0],
      end: [12, 0],
      capacity: 120,
      registered: 96,
      category: "Leadership",
      tone: "green",
    }),
    make({
      id: 103,
      title: "Talent Acquisition 101",
      venue: "Career Center",
      campus: "Main Campus",
      day: 5,
      start: [13, 0],
      end: [16, 0],
      capacity: 200,
      registered: 150,
      category: "Career",
      tone: "amber",
    }),
    make({
      id: 104,
      title: "Student Innovation Expo",
      venue: "Grand Atrium",
      campus: "Main Campus",
      day: 8,
      start: [10, 30],
      end: [15, 0],
      capacity: 500,
      registered: 320,
      category: "Technology",
      tone: "blue",
    }),
    make({
      id: 105,
      title: "Campus Volunteer Day",
      venue: "Community Hall",
      campus: "South Campus",
      day: 11,
      start: [14, 0],
      end: [17, 0],
      capacity: 160,
      registered: 88,
      category: "Community",
      tone: "green",
    }),
    make({
      id: 106,
      title: "Digital Skills Bootcamp",
      venue: "Computer Lab 3",
      campus: "Tech Building",
      day: 14,
      start: [8, 30],
      end: [12, 30],
      capacity: 80,
      registered: 52,
      category: "Technology",
      tone: "violet",
    }),
    make({
      id: 107,
      title: "Career Kickoff",
      venue: "Main Hall",
      campus: "Main Campus",
      day: -6,
      start: [9, 0],
      end: [12, 0],
      capacity: 200,
      registered: 180,
      checkedIn: 151,
      category: "Career",
      tone: "amber",
    }),
    make({
      id: 108,
      title: "Student Leaders Forum",
      venue: "Room 101",
      campus: "Business Building",
      day: -9,
      start: [13, 0],
      end: [16, 0],
      capacity: 250,
      registered: 250,
      checkedIn: 211,
      category: "Leadership",
      tone: "green",
    }),
    make({
      id: 109,
      title: "Night Run Fundraiser",
      venue: "University Oval",
      campus: "Main Campus",
      day: 20,
      start: [17, 0],
      end: [20, 0],
      capacity: 250,
      category: "Community",
      tone: "amber",
      status: "draft",
    }),
  ];
}

function readEvents() {
  const saved = storage.getJSON(EVENTS_KEY, null);
  if (saved) return saved;

  const fresh = seed();
  storage.setJSON(EVENTS_KEY, fresh);
  return fresh;
}

function saveEvents(events) {
  storage.setJSON(EVENTS_KEY, events);
}

// All events, whatever their status.
export function getCatalog() {
  return readEvents();
}

export function getCatalogEvent(id) {
  return readEvents().find((event) => event.id === id) ?? null;
}

export function addCatalogEvent(event) {
  saveEvents([event, ...readEvents()]);
}

export function updateCatalogEvent(id, patch) {
  saveEvents(readEvents().map((event) => (event.id === id ? { ...event, ...patch } : event)));
}

// Changes the live counters, for example when a student registers or checks in.
export function adjustCounts(id, { registered = 0, checkedIn = 0 }) {
  saveEvents(
    readEvents().map((event) =>
      event.id === id
        ? {
            ...event,
            registered: Math.max(0, event.registered + registered),
            checkedIn: Math.max(0, (event.checkedIn ?? 0) + checkedIn),
          }
        : event,
    ),
  );
}

// For example, when an organizer renames their organization.
export function updateOwnedEvents(ownerId, patch) {
  saveEvents(readEvents().map((event) => (event.ownerId === ownerId ? { ...event, ...patch } : event)));
}
