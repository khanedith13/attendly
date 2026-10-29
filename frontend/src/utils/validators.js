// Placeholder school domain. Later this comes from the Admin Settings screen.
export const SCHOOL_DOMAIN = "school.edu.ph";

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isSchoolEmail(value) {
  return value.trim().toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`);
}

export function isStudentId(value) {
  return /^\d{4}-\d{5}$/.test(value.trim());
}