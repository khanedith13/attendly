import { ApiError } from "../api/ApiError";
import { toApiErrors } from "../utils/apiErrors";
import { notifyReviewsChanged } from "../utils/reviewBus";
import { userStatuses, validateUserForm } from "../utils/userValidation";
import { getAuditEntries, logAudit } from "./audit";
import { getCatalog, getCatalogEvent, updateCatalogEvent } from "./catalog";
import { organizerProfileOf } from "./organizerService";
import { findUserByEmail, readUsers, saveUsers } from "./userStore";
import { settingFields } from "../config/settings";
import { attendanceStatus } from "../utils/attendance";
import { validateSettings } from "../utils/settingsValidation";
import { getRoster } from "./roster";
import { readSettings, writeSettings } from "./settings";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const publicFields = ({ id, name, email, role, status, joinedAt }) => ({
  id,
  name,
  email,
  role,
  status,
  joinedAt,
});

function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw new ApiError("Validation failed.", 422, toApiErrors(errors));
  }
}

// What needs an administrator's attention.
function reviewCounts() {
  const users = readUsers();
  const events = getCatalog();
  return {
    organizers: users.filter((u) => u.role === "organizer" && u.status === "pending").length,
    events: events.filter((e) => e.review === "pending").length, // added in Step 16
    flagged: events.filter((e) => e.review === "flagged").length, // added in Step 16
  };
}

export async function getReviewCount() {
  const counts = reviewCounts();
  return counts.organizers + counts.events;
}

export async function getAdminDashboard() {
  await delay();
  const users = readUsers();
  const events = getCatalog();
  const now = Date.now();
  const count = (role, status) =>
    users.filter((u) => u.role === role && (!status || u.status === status)).length;

  return {
    stats: {
      users: users.length,
      organizers: count("organizer"),
      activeEvents: events.filter(
        (e) =>
          e.status === "published" &&
          (e.review ?? "approved") === "approved" &&
          new Date(e.endsAt).getTime() >= now,
      ).length,
      uptime: "97.2%", // placeholder: real uptime needs server monitoring
    },
    review: reviewCounts(),
    roles: ["student", "organizer", "admin"].map((role) => ({
      role,
      active: count(role, "active"),
      pending: count(role, "pending"),
    })),
    activity: getAuditEntries().slice(0, 5),
  };
}

export async function listUsers() {
  await delay();
  return readUsers()
    .map(publicFields)
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
}

export async function createUser(admin, data) {
  await delay();
  const values = { ...data, email: data.email.trim().toLowerCase() };
  const errors = validateUserForm(values, { mode: "add" });
  if (!errors.email && findUserByEmail(values.email)) {
    errors.email = "An account with this email already exists.";
  }
  assertValid(errors);

  const created = {
    id: Date.now(),
    name: values.name.trim(),
    email: values.email,
    password: values.password,
    role: values.role,
    status: "active",
    joinedAt: new Date().toISOString(),
  };
  saveUsers([...readUsers(), created]);
  logAudit({
    actor: admin.name,
    role: "admin",
    action: `Created ${created.role} account`,
    target: created.email,
  });
  notifyReviewsChanged();
  return publicFields(created);
}

// `changes` can hold any of: name, role, status.
export async function updateUser(admin, id, changes) {
  await delay();
  const users = readUsers();
  const target = users.find((user) => user.id === id);
  if (!target) throw new ApiError("User not found.", 404);

  const next = { ...target, ...changes };
  const errors = validateUserForm(next, { mode: "edit" });
  if (!userStatuses.includes(next.status)) errors.status = "Select a status.";
  assertValid(errors);

  if (target.id === admin.id && (next.role !== target.role || next.status !== target.status)) {
    throw new ApiError("You cannot change your own role or status.", 409);
  }

  const activeAdmins = users.filter((u) => u.role === "admin" && u.status === "active");
  const losesAdmin = next.role !== "admin" || next.status !== "active";
  if (
    target.role === "admin" &&
    target.status === "active" &&
    losesAdmin &&
    activeAdmins.length <= 1
  ) {
    throw new ApiError("At least one active admin is required.", 409);
  }

  saveUsers(
    users.map((user) =>
      user.id === id
        ? { ...user, name: next.name.trim(), role: next.role, status: next.status }
        : user,
    ),
  );

  let action = "Updated user";
  if (next.status !== target.status) {
    action = next.status === "suspended" ? "Suspended user" : "Activated user";
  } else if (next.role !== target.role) {
    action = "Changed user role";
  }
  logAudit({ actor: admin.name, role: "admin", action, target: target.email });
  notifyReviewsChanged();
}

/* ---------- Organizers ---------- */

const transitions = {
  approve: { from: "pending", to: "active", log: "Approved organizer" },
  reject: { from: "pending", to: "suspended", log: "Rejected organizer application" },
  suspend: { from: "active", to: "suspended", log: "Suspended organizer" },
  reactivate: { from: "suspended", to: "active", log: "Reactivated organizer" },
};

const statusOrder = { pending: 0, active: 1, suspended: 2 };

export async function listOrganizers() {
  await delay();
  const events = getCatalog();

  return readUsers()
    .filter((user) => user.role === "organizer")
    .map((user) => {
      // Fake organizers carry their own numbers; real ones are calculated.
      let organization = user.org;
      if (!organization) {
        const profile = organizerProfileOf(user);
        const own = events.filter((e) => e.ownerId === user.id && e.status === "published");
        organization = {
          name: profile.organizationName,
          phone: profile.contactNumber,
          events: own.length,
          registrations: own.reduce((total, e) => total + e.registered, 0),
        };
      }

      return {
        id: user.id,
        name: organization.name,
        phone: organization.phone || "—",
        events: organization.events,
        registrations: organization.registrations,
        status: user.status,
        contactPerson: user.name,
        email: user.email,
      };
    })
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.name.localeCompare(b.name));
}

// action: "approve" | "reject" | "suspend" | "reactivate"
export async function setOrganizerStatus(admin, id, action) {
  await delay();
  const rule = transitions[action];
  const users = readUsers();
  const target = users.find((user) => user.id === id && user.role === "organizer");

  if (!rule || !target) throw new ApiError("Organizer not found.", 404);
  if (target.status !== rule.from) {
    throw new ApiError(`This organizer is already ${target.status}.`, 409);
  }

  saveUsers(users.map((user) => (user.id === id ? { ...user, status: rule.to } : user)));
  logAudit({
    actor: admin.name,
    role: "admin",
    action: rule.log,
    target: target.org?.name ?? organizerProfileOf(target).organizationName,
  });
  notifyReviewsChanged();
}

/* ---------- Event moderation ---------- */

export async function listAdminEvents() {
  await delay();
  return getCatalog()
    .filter((event) => event.status !== "draft")
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
}

function setReview(admin, id, review, note, action) {
  const event = getCatalogEvent(id);
  if (!event || event.status === "draft") throw new ApiError("Event not found.", 404);

  updateCatalogEvent(id, { review, reviewNote: note });
  logAudit({ actor: admin.name, role: "admin", action, target: event.title });
  notifyReviewsChanged();
}

export async function approveEvent(admin, id) {
  await delay();
  const wasFlagged = getCatalogEvent(id)?.review === "flagged";
  setReview(admin, id, "approved", "", wasFlagged ? "Cleared event flag" : "Approved event");
}

export async function flagEvent(admin, id, reason) {
  await delay();
  const text = reason.trim();

  if (text.length < 10) assertValid({ reason: "Write at least 10 characters." });
  if (text.length > 200) assertValid({ reason: "Use 200 characters or fewer." });
  if (getCatalogEvent(id)?.status === "cancelled") {
    throw new ApiError("Cancelled events cannot be flagged.", 409);
  }

  setReview(admin, id, "flagged", text, "Flagged event");
}

/* ---------- Settings ---------- */

export async function getSettings() {
  await delay();
  return readSettings();
}

export async function saveSettings(admin, values) {
  await delay();
  assertValid(validateSettings(values));

  const before = readSettings();
  const after = {
    ...before,
    ...values,
    platformName: String(values.platformName).trim(),
    schoolDomain: String(values.schoolDomain).trim().toLowerCase(),
    lateGraceMinutes: Number(values.lateGraceMinutes),
    sessionTimeoutMinutes: Number(values.sessionTimeoutMinutes),
  };

  const changed = settingFields.filter((field) => before[field.key] !== after[field.key]);
  writeSettings(after);

  changed.forEach((field) =>
    logAudit({ actor: admin.name, role: "admin", action: "Changed setting", target: field.label }),
  );
  return { changed: changed.length };
}

/* ---------- Attendance report ---------- */

export async function getAttendanceRecords() {
  await delay();
  const events = new Map(getCatalog().map((event) => [event.id, event]));
  const graceMs = readSettings().lateGraceMinutes * 60000;
  const now = Date.now();

  return getRoster()
    .filter((row) => row.status === "registered" && events.has(row.eventId))
    .map((row) => {
      const event = events.get(row.eventId);
      return {
        ...row,
        eventTitle: event.title,
        eventStart: event.startsAt,
        outcome: attendanceStatus(row, event, graceMs, now),
      };
    })
    .filter((row) => row.outcome !== null)
    .sort((a, b) => new Date(b.timeIn ?? b.eventStart) - new Date(a.timeIn ?? a.eventStart));
}

/* ---------- Audit log ---------- */

export async function getAuditLog() {
  await delay();
  return getAuditEntries();
}
