import { useState } from "react";
import { firstErrors } from "../utils/apiErrors";
import { validateUserForm } from "../utils/userValidation";
import Button from "./Button";
import FormField from "./FormField";
import Modal from "./Modal";
import Notice from "./Notice";
import SelectField from "./SelectField";

// mode: "add" | "edit". `onSubmit` returns a promise and may throw an ApiError.
export default function UserFormModal({ mode, user, onSubmit, onClose }) {
  const isAdd = mode === "add";
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "student",
    status: user?.status ?? "active",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateUserForm(form, { mode });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(isAdd ? form : { name: form.name, role: form.role, status: form.status });
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
    <Modal title={isAdd ? "Add user" : "Edit user"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 14 }}>
        <FormField
          id="name"
          name="name"
          label="Full name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
        />
        <FormField
          id="email"
          name="email"
          type="email"
          label="School Gmail"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          readOnly={!isAdd}
        />
        <SelectField
          id="role"
          name="role"
          label="Role"
          value={form.role}
          onChange={handleChange}
          error={errors.role}
        >
          <option value="student">Student</option>
          <option value="organizer">Organizer</option>
          <option value="admin">Admin</option>
        </SelectField>

        {isAdd ? (
          <FormField
            id="password"
            name="password"
            type="password"
            label="Temporary password"
            hint="Ask the person to change it after their first login."
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="new-password"
          />
        ) : (
          <SelectField
            id="status"
            name="status"
            label="Status"
            value={form.status}
            onChange={handleChange}
            error={errors.status}
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </SelectField>
        )}

        {errors.form && <Notice>{errors.form}</Notice>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : isAdd ? "Add user" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
