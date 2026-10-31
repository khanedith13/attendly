import { isSchoolEmail, isValidEmail, SCHOOL_DOMAIN } from "./validators";

export const userRoles = ["student", "organizer", "admin"];
export const userStatuses = ["active", "pending", "suspended"];

// mode "add" needs an email and a password. mode "edit" only changes name and role.
export function validateUserForm(values, { mode }) {
  const errors = {};

  if (!values.name.trim()) errors.name = "Name is required.";
  else if (values.name.trim().length > 100) errors.name = "Use 100 characters or fewer.";

  if (mode === "add") {
    if (!values.email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(values.email)) errors.email = "Enter a valid email address.";
    else if (!isSchoolEmail(values.email)) errors.email = `Use an @${SCHOOL_DOMAIN} email.`;

    if (!values.password) errors.password = "Temporary password is required.";
    else if (values.password.length < 8) errors.password = "Use at least 8 characters.";
  }

  if (!userRoles.includes(values.role)) errors.role = "Select a role.";
  return errors;
}
