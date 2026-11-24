import api from "../api/axios";
import { getAccount } from "./accountService";

export async function listEvents() {
  const { data } = await api.get("/events");
  return data;
}

export async function registerForEvent(user, eventId) {
  void user;
  const { data } = await api.post(
    `/student/events/${eventId}/register`,
  );

  return data.registration;
}

export async function cancelRegistration(user, registrationId) {
  void user;
  const { data } = await api.delete(
    `/student/registrations/${registrationId}`,
  );

  return data.registration;
}

export async function getMyRegistrations() {
  const { data } = await api.get("/student/registrations");

  return data;
}

/* ---------- Attendance ---------- */

function studentProfile(user, account) {
  return {
    name: user.name,
    email: user.email,
    studentId: account.studentId ?? "",
    course: account.course ?? "",
    yearLevel: account.yearLevel ?? "",
  };
}

function mapActiveSession(attendance, student) {
  if (!attendance) return null;

  return {
    id: attendance.id,
    eventId: attendance.event.id,
    eventTitle: attendance.event.title,
    studentId: student.studentId,
    checkedInAt: attendance.timeIn,
    checkedOutAt: attendance.timeOut,
    attendance: attendance.status,
  };
}

export async function getAttendanceInData(user) {
  const account = await getAccount();

  return { student: studentProfile(user, account) };
}

export async function getAttendanceOutData(user) {
  const [activeResponse, account] = await Promise.all([
    api.get("/student/attendance/active"),
    getAccount(),
  ]);
  const student = studentProfile(user, account);

  return {
    activeSession: mapActiveSession(activeResponse.data.activeSession, student),
    student,
  };
}

export async function checkIn(user, { qrToken }) {
  void user;
  const { data } = await api.post("/student/attendance/check-in", {
    qr_token: qrToken,
  });
  const attendance = data.attendance;

  return {
    id: attendance.id,
    eventId: attendance.event.id,
    eventTitle: attendance.event.title,
    checkedInAt: attendance.timeIn,
    attendance: attendance.status,
  };
}

export async function checkOut(user, { qrToken }) {
  void user;
  const { data } = await api.post("/student/attendance/check-out", {
    qr_token: qrToken,
  });
  const attendance = data.attendance;

  return {
    id: attendance.id,
    eventId: attendance.event.id,
    event: attendance.event.title,
    timeIn: attendance.timeIn,
    timeOut: attendance.timeOut,
    attendance: attendance.status,
  };
}