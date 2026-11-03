import { readSettings } from "../services/settings";

export function getSchoolDomain() {
  return readSettings().schoolDomain;
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isSchoolEmail(value) {
  return value.trim().toLowerCase().endsWith(`@${getSchoolDomain()}`);
}

// Respects the "Require school Gmail" setting.
export function isAllowedEmail(value) {
  return !readSettings().requireSchoolGmail || isSchoolEmail(value);
}

export function isStudentId(value) {
  return /^\d{4}-\d{5}$/.test(value.trim());
}
