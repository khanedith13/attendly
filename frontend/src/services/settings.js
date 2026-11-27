import { storage } from "../utils/storage";
import api from "../api/axios";

const SETTINGS_KEY = "attendly_settings_v1";

export const defaultSettings = {
  platformName: "Attendly",
  schoolDomain: "usjr.edu.ph",
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

// Copies public settings from the API into local storage so the
// synchronous frontend validators can continue reading them.
export async function refreshPublicSettings() {
  try {
    const { data } = await api.get("/settings/public");

    storage.setJSON(SETTINGS_KEY, {
      ...storage.getJSON(SETTINGS_KEY, {}),
      ...data,
    });
  } catch {
    // Keep the last cached settings if the API is unavailable.
  }
}
