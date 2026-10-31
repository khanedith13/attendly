import { ApiError } from "../api/ApiError";
import { toApiErrors } from "../utils/apiErrors";
import { notifyReviewsChanged } from "../utils/reviewBus";
import { userStatuses, validateUserForm } from "../utils/userValidation";
import { getAuditEntries, logAudit } from "./audit";
import { getCatalog } from "./catalog";
import { findUserByEmail, readUsers, saveUsers } from "./userStore";

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
        (e) => e.status === "published" && new Date(e.endsAt).getTime() >= now,
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
