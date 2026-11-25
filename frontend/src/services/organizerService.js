import { ApiError } from "../api/ApiError";
import api from "../api/axios";
import { notifyReviewsChanged } from "../utils/reviewBus";

export async function getOrganizerDashboard() {
  const { data } = await api.get("/organizer/dashboard");
  return data;
}

export async function listMyEvents() {
  const { data } = await api.get("/organizer/events");
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function publishEvent(user, id) {
  void user;
  const { data } = await api.post(`/organizer/events/${id}/publish`);
  notifyReviewsChanged();
  return data.data ?? data;
}

export async function cancelEvent(user, id) {
  void user;
  const { data } = await api.post(`/organizer/events/${id}/cancel`);
  return data.data ?? data;
}

export async function getEventForEdit(user, id) {
  void user;
  const { data } = await api.get(`/organizer/events/${id}`);
  return data.data ?? data;
}

export async function createEvent(user, values, { publish = false } = {}) {
  void user;
  const { data } = await api.post("/organizer/events", {
    ...values,
    publish,
  });

  if (publish) notifyReviewsChanged();
  return data.data ?? data;
}

export async function updateEvent(user, id, values, { publish = false } = {}) {
  void user;
  const { data } = await api.put(`/organizer/events/${id}`, {
    ...values,
    publish,
  });

  if (publish) notifyReviewsChanged();
  return data.data ?? data;
}

export async function getAttendees(user, eventId) {
  void user;
  const { data } = await api.get("/organizer/attendees", {
    params: eventId ? { event_id: eventId } : {},
  });
  return data;
}

export async function getAttendeeSelfie(registrationId, direction) {
  const { data } = await api.get(
    `/organizer/attendees/${registrationId}/selfie/${direction}`,
    { responseType: "blob" },
  );
  return URL.createObjectURL(data);
}

export async function getRegistrations() {
  const { data } = await api.get("/organizer/registrations");
  return data;
}

export async function sendReminder() {
  throw new ApiError("Email reminders are not configured on the server.", 501);
}

export async function getOrganizerProfile() {
  const { data } = await api.get("/organizer/profile");
  return data;
}

export async function saveOrganizerProfile(user, values) {
  void user;
  const { data } = await api.put("/organizer/profile", {
    name: values.name.trim(),
    organizationName: values.organizationName.trim(),
    contactNumber: values.contactNumber.trim(),
    notifications: values.notifications,
  });
  return data;
}