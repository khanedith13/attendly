import api from "../api/axios";
import { getAccount } from "./accountService";

export async function listEvents() {
  const { data } = await api.get("/events");
  return data;
}

export async function registerForEvent(user, eventId) {
  void user;
  const { data } = await api.post(`/student/events/${eventId}/register`);

  return data.registration;
}

export async function cancelRegistration(user, registrationId) {
  void user;
  const { data } = await api.delete(`/student/registrations/${registrationId}`);

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

function mapAttendance(attendance) {
  return {
    id: attendance.id,
    eventId: attendance.event.id,
    eventTitle: attendance.event.title,
    timeIn: attendance.timeIn,
    timeOut: attendance.timeOut,
    time: attendance.timeIn ?? attendance.timeOut,
    status: attendance.status,
    student: attendance.student,
    selfieInUrl: attendance.selfieInUrl ?? null,
    selfieOutUrl: attendance.selfieOutUrl ?? null,
  };
}

function createAttendanceForm({ qrToken, selfie, student }) {
  const form = new FormData();
  form.append("qr_token", qrToken);
  form.append("selfie", selfie);

  if (student) {
    form.append("student_id", student.studentId);
    form.append("name", student.name);
    form.append("email", student.email);
    form.append("course", student.course);
    form.append("year_level", student.yearLevel);
  }

  return form;
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
  const active = activeResponse.data.activeSession;

  return {
    activeSession: active
      ? {
          id: active.id,
          eventId: active.event.id,
          eventTitle: active.event.title,
          studentId: student.studentId,
          checkedInAt: active.timeIn,
          checkedOutAt: active.timeOut,
          attendance: active.status,
        }
      : null,
    student,
  };
}

export async function checkIn(user, { qrToken, selfie }) {
  void user;
  const { data } = await api.post(
    "/student/attendance/check-in",
    createAttendanceForm({ qrToken, selfie }),
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return mapAttendance(data.attendance);
}

export async function checkOut(user, { qrToken, selfie }) {
  void user;
  const { data } = await api.post(
    "/student/attendance/check-out",
    createAttendanceForm({ qrToken, selfie }),
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return mapAttendance(data.attendance);
}

export async function guestCheckIn({ qrToken, selfie, student }) {
  const { data } = await api.post(
    "/attendance/guest/check-in",
    createAttendanceForm({ qrToken, selfie, student }),
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return mapAttendance(data.attendance);
}

export async function guestCheckOut({ qrToken, selfie, student }) {
  const { data } = await api.post(
    "/attendance/guest/check-out",
    createAttendanceForm({ qrToken, selfie, student }),
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return mapAttendance(data.attendance);
}
