import { storage } from "../utils/storage";

const SETTINGS_KEY = "attendly_settings_v1";

export const defaultSettings = {
  platformName: "Attendly",
  schoolDomain: "school.edu.ph",
  requireSchoolGmail: true,
  requireEventApproval: false,
  allowOrganizerSignup: true,
  lateGraceMinutes: 15,
  autoMarkAbsent: true,
  sessionTimeoutMinutes: 60,
  twoFactorAdmins: false,
  emailNewOrganizer: true,
  emailFlaggedEvent: true,
};

export function readSettings() {
  return { ...defaultSettings, ...storage.getJSON(SETTINGS_KEY, {}) };
}

export function writeSettings(values) {
  storage.setJSON(SETTINGS_KEY, values);
}