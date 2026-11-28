import api from "../api/axios";
import { ApiError } from "../api/ApiError";
import { refreshPublicSettings } from "./settings";

const unwrapCollection = (response) => response.data?.data ?? [];
const unwrapResourceCollection = (data) => (Array.isArray(data) ? data : (data.data ?? []));

export async function getReviewCount() {
  const { data } = await api.get("/admin/dashboard");
  return (data.review?.organizers ?? 0) + (data.review?.events ?? 0);
}

export async function getAdminDashboard() {
  const { data } = await api.get("/admin/dashboard");
  return {
    ...data,
    stats: {
      ...data.stats,
      uptime: data.stats?.uptime ?? "Not monitored",
    },
  };
}

export async function listUsers() {
  const { data } = await api.get("/admin/users");
  return unwrapCollection({ data });
}

export async function createUser(admin, values) {
  void admin;
  const { data } = await api.post("/admin/users", {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    role: values.role,
    status: values.status ?? "active",
  });

  return {
    ...data.user,
    joinedAt: data.joinedAt,
  };
}

export async function updateUser(admin, id, changes) {
  void admin;
  const payload = Object.fromEntries(
    ["name", "role", "status"]
      .filter((key) => changes[key] !== undefined)
      .map((key) => [key, changes[key]]),
  );

  if (Object.keys(payload).length === 0) {
    throw new ApiError("Provide at least one user field to update.", 422);
  }

  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data.user;
}

export async function listOrganizers() {
  const { data } = await api.get("/admin/organizers");
  return unwrapCollection({ data });
}

export async function setOrganizerStatus(admin, id, action) {
  void admin;
  const { data } = await api.patch(`/admin/organizers/${id}/status`, { action });
  return data;
}

export async function listAdminEvents() {
  const { data } = await api.get("/admin/events");
  return unwrapResourceCollection(data);
}

export async function approveEvent(admin, id) {
  void admin;
  const { data } = await api.patch(`/admin/events/${id}/review`, {
    status: "approved",
  });
  return data;
}

export async function flagEvent(admin, id, reason) {
  void admin;
  try {
    const { data } = await api.patch(`/admin/events/${id}/review`, {
      status: "flagged",
      note: reason.trim(),
    });
    return data;
  } catch (error) {
    if (error.errors?.note) {
      throw new ApiError(error.message, error.status, {
        ...error.errors,
        reason: error.errors.note,
      });
    }
    throw error;
  }
}

export async function getSettings() {
  const { data } = await api.get("/admin/settings");
  return data.settings;
}

export async function saveSettings(admin, values) {
  void admin;
  const { data } = await api.put("/admin/settings", values);
  await refreshPublicSettings();
  return data;
}

export async function getAttendanceRecords() {
  const { data } = await api.get("/admin/attendance");
  return unwrapCollection({ data });
}

export async function getAuditLog() {
  const { data } = await api.get("/admin/audit-logs");
  return unwrapCollection({ data });
}
