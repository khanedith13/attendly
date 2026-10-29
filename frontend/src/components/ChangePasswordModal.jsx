import { useState } from "react";
import { firstErrors } from "../utils/apiErrors";
import Button from "./Button";
import FormField from "./FormField";
import Modal from "./Modal";
import Notice from "./Notice";

const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordModal({ onSubmit, onClose }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.currentPassword) next.currentPassword = "Current password is required.";

    if (!form.newPassword) next.newPassword = "New password is required.";
    else if (form.newPassword.length < 8) next.newPassword = "Use at least 8 characters.";
    else if (form.newPassword === form.currentPassword) {
      next.newPassword = "Choose a password different from the current one.";
    }

    if (!form.confirmPassword) next.confirmPassword = "Confirm your new password.";
    else if (form.confirmPassword !== form.newPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      onClose();
    } catch (error) {
      setErrors({
        ...firstErrors(error.errors),
        form: error.status === 422 ? undefined : error.message,
      });
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Update password" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 14 }}>
        <FormField
          id="currentPassword"
          name="currentPassword"
          type="password"
          label="Current password"
          value={form.currentPassword}
          onChange={handleChange}
          error={errors.currentPassword}
          autoComplete="current-password"
        />
        <FormField
          id="newPassword"
          name="newPassword"
          type="password"
          label="New password"
          value={form.newPassword}
          onChange={handleChange}
          error={errors.newPassword}
          autoComplete="new-password"
        />
        <FormField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm new password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        {errors.form && <Notice>{errors.form}</Notice>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
