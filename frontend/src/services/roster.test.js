import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  configFile: false,
  root: fileURLToPath(new URL("../..", import.meta.url)),
  server: { middlewareMode: true },
});
const { recordPublicAttendance } = await vite.ssrLoadModule("/src/services/roster.js");

const eventKey = "attendly_events_v1";
const rosterKey = "attendly_roster_v1";
const student = {
  studentId: "2026-12345",
  name: "Test Student",
  course: "BS Computer Science",
  yearLevel: "2nd Year",
  selfie: "data:image/jpeg;base64,selfie",
};

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function setup({ startsAt, endsAt, timeIn = null, timeOut = null } = {}) {
  const now = Date.now();
  const event = {
    id: 77,
    title: "Test Event",
    status: "published",
    review: "approved",
    qrIn: "check-in-token",
    qrOut: "check-out-token",
    startsAt: startsAt ?? new Date(now - 60_000).toISOString(),
    endsAt: endsAt ?? new Date(now + 60_000).toISOString(),
  };
  const row = {
    id: 7701,
    eventId: event.id,
    ...student,
    status: "registered",
    registeredAt: new Date(now - 3_600_000).toISOString(),
    timeIn,
    timeOut,
  };

  globalThis.localStorage = createStorage();
  localStorage.setItem(eventKey, JSON.stringify([event]));
  localStorage.setItem(rosterKey, JSON.stringify([row]));
  return { event, row };
}

function submit(direction, overrides = {}) {
  return recordPublicAttendance({
    token: direction === "in" ? "check-in-token" : "check-out-token",
    direction,
    ...student,
    ...overrides,
  });
}

beforeEach(() => {
  setup();
});

afterEach(() => {
  delete globalThis.localStorage;
});

after(async () => {
  await vite.close();
});

test("records check-in for a registered student with a selfie", () => {
  const result = submit("in");
  const rows = JSON.parse(localStorage.getItem(rosterKey));

  assert.equal(result.direction, "in");
  assert.equal(result.event.title, "Test Event");
  assert.ok(result.time);
  assert.equal(rows[0].timeIn, result.time);
  assert.equal(rows[0].selfieIn, student.selfie);
  assert.equal(rows[0].yearLevel, student.yearLevel);
});

test("rejects a student ID that is not registered for the event", () => {
  assert.throws(() => submit("in", { studentId: "2026-54321" }), /not registered for this event/);
});

test("rejects missing required student details or selfie", () => {
  assert.throws(() => submit("in", { name: "" }), /Complete all fields/);
  assert.throws(() => submit("in", { yearLevel: "" }), /Complete all fields/);
  assert.throws(() => submit("in", { selfie: "" }), /Complete all fields/);
});

test("rejects invalid QR tokens", () => {
  assert.throws(() => submit("in", { token: "invalid-token" }), /invalid or inactive/);
});

test("rejects attendance outside the event time window", () => {
  const now = Date.now();
  setup({
    startsAt: new Date(now - 7_200_000).toISOString(),
    endsAt: new Date(now - 3_600_000).toISOString(),
  });

  assert.throws(() => submit("in"), /only available during the event time/);
});

test("rejects duplicate check-in", () => {
  setup({ timeIn: new Date().toISOString() });

  assert.throws(() => submit("in"), /already been recorded/);
});

test("requires check-in before check-out", () => {
  assert.throws(() => submit("out"), /Check in before recording attendance out/);
});

test("records check-out selfie after check-in and rejects a duplicate", () => {
  setup({ timeIn: new Date(Date.now() - 30_000).toISOString() });

  const result = submit("out");
  const rows = JSON.parse(localStorage.getItem(rosterKey));

  assert.equal(result.direction, "out");
  assert.equal(rows[0].timeOut, result.time);
  assert.equal(rows[0].selfieOut, student.selfie);
  assert.throws(() => submit("out"), /already been recorded/);
});
