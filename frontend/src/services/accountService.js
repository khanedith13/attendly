import { getRoster, syncProfile } from "./roster";
import { dayAt } from "./catalog";
import * as authService from "./authService";
import { loadState, saveState } from "./studentService";
import { ApiError } from "../api/ApiError";

const DEMO_STUDENT_ID = 2;
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

function defaultProfile(userId) {
  const isDemo = userId === DEMO_STUDENT_ID;
  return {
    course: isDemo ? "BS Information Technology" : "",
    passwordChangedAt: isDemo ? dayAt(-32, 9, 0) : null,
    notifications: { reminders: true, confirmations: true },
  };
}

function profileOf(state, userId) {
  return { ...defaultProfile(userId), ...state.profile };
}

export async function getAccount(userId) {
  await delay();
  const state = loadState(userId);
  return { studentId: state.studentId ?? "", ...profileOf(state, userId) };
}

export async function saveAccount(user, { name, studentId, course, notifications }) {
  await delay();
  // Student IDs are unique (users.student_id is a UNIQUE column).
  const taken = getRoster().some((row) => row.studentId === studentId && row.userId !== user.id);
  if (taken) {
    throw new ApiError("Validation failed.", 422, {
      studentId: ["This student ID is already in use."],
    });
  }
  await authService.updateProfile(user.id, { name });

  const state = loadState(user.id);
  saveState(user.id, {
    ...state,
    studentId,
    profile: { ...profileOf(state, user.id), course, notifications },
  });
  syncProfile(user.id, { name, studentId, course });
}

export async function updatePassword(user, { currentPassword, newPassword }) {
  await delay();
  await authService.changePassword(user.id, { currentPassword, newPassword });

  const state = loadState(user.id);
  saveState(user.id, {
    ...state,
    profile: { ...profileOf(state, user.id), passwordChangedAt: new Date().toISOString() },
  });
}
