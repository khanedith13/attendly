import { ApiError } from "../api/ApiError";
import { storage } from "../utils/storage";
import { logAudit } from "./audit";
import { findUserByEmail, readUsers, saveUsers } from "./userStore";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

function publicUser({ id, name, email, role, status }) {
  return { id, name, email, role, status };
}

export async function login({ email, password }) {
  await delay();
  const cleanEmail = email.trim().toLowerCase();
  const found = findUserByEmail(cleanEmail);

  if (!found || !found.password || found.password !== password) {
    logAudit({
      actor: cleanEmail,
      role: found?.role ?? "—",
      action: "Login attempt",
      target: cleanEmail,
      result: "failed",
    });
    throw new ApiError("Invalid email or password.", 422, {
      email: ["Invalid email or password."],
    });
  }

  if (found.status === "suspended") {
    logAudit({
      actor: found.name,
      role: found.role,
      action: "Login blocked (suspended)",
      target: found.email,
      result: "failed",
    });
    throw new ApiError("This account has been suspended. Contact an administrator.", 403);
  }

  const user = publicUser(found);
  const token = `mock-token-${found.id}`;
  storage.setSession({ token, user });
  logAudit({ actor: found.name, role: found.role, action: "Logged in", target: found.email });
  return { user, token };
}

export async function register(data) {
  await delay();
  const email = data.email.trim().toLowerCase();

  if (data.role === "admin") {
    throw new ApiError("Validation failed.", 422, {
      role: ["Admin accounts are created by the system administrator."],
    });
  }

  if (findUserByEmail(email)) {
    throw new ApiError("Validation failed.", 422, {
      email: ["An account with this email already exists."],
    });
  }

  const created = {
    id: Date.now(),
    name: `${data.firstName.trim()} ${data.lastName.trim()}`,
    email,
    password: data.password,
    role: data.role,
    // Organizers wait for an administrator to approve them.
    status: data.role === "organizer" ? "pending" : "active",
    joinedAt: new Date().toISOString(),
  };
  saveUsers([...readUsers(), created]);
  logAudit({
    actor: created.name,
    role: created.role,
    action: "Registered account",
    target: created.email,
  });

  return { user: publicUser(created) };
}

export async function logout() {
  await delay(100);
  storage.clearSession();
}

// Reads the account fresh, so name changes and suspensions take effect on reload.
export async function getCurrentUser() {
  const { token, user } = storage.getSession();
  if (!token || !user) return null;

  const fresh = readUsers().find((item) => item.id === user.id);
  if (!fresh || fresh.status === "suspended") {
    storage.clearSession();
    return null;
  }
  return publicUser(fresh);
}

export async function updateProfile(userId, { name }) {
  saveUsers(readUsers().map((user) => (user.id === userId ? { ...user, name } : user)));
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const found = readUsers().find((user) => user.id === userId);

  if (!found || found.password !== currentPassword) {
    throw new ApiError("Validation failed.", 422, {
      currentPassword: ["Current password is incorrect."],
    });
  }

  saveUsers(
    readUsers().map((user) => (user.id === userId ? { ...user, password: newPassword } : user)),
  );
}
