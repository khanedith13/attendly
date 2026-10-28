import { useAuth } from "../../hooks/useAuth";
import { firstErrors } from "../../utils/apiErrors";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import RoleTabs from "../../components/RoleTabs";
import Stepper from "../../components/Stepper";
import AuthLayout from "../../layouts/AuthLayout";
import { isSchoolEmail, isValidEmail, SCHOOL_DOMAIN } from "../../utils/validators";

const art = (
  <>
    <h1 className="art-title">Join your campus event ecosystem.</h1>
    <p className="art-sub">
      Create one account using your official school Gmail. Your role controls which tools you can
      access.
    </p>

    <div className="art-roles">
      <div className="art-role">
        <b>Student</b>
        <span>Register &amp; attend</span>
      </div>
      <div className="art-role">
        <b>Organizer</b>
        <span>Create &amp; track</span>
      </div>
      <div className="art-role">
        <b>Admin</b>
        <span>Manage platform</span>
      </div>
    </div>
  </>
);

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  agree: false,
};

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState("student");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";

    if (!form.email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    else if (!isSchoolEmail(form.email)) next.email = `Use your @${SCHOOL_DOMAIN} email.`;

    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 8) next.password = "Use at least 8 characters.";

    if (!form.confirmPassword) next.confirmPassword = "Confirm your password.";
    else if (form.confirmPassword !== form.password)
      next.confirmPassword = "Passwords do not match.";

    if (!form.agree) next.agree = "You must agree to continue.";
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await register({ ...form, role });
      navigate("/login", { state: { registered: true } });
    } catch (error) {
      const fieldErrors = firstErrors(error.errors);
      // The role tabs have no inline error slot, so a role error shows in the red box.
      setErrors({
        ...fieldErrors,
        form: fieldErrors.role ?? (error.status === 422 ? undefined : error.message),
      });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout art={art} wide>
      <h2 className="auth__title">Create an account</h2>
      <p className="auth__lead">Use your official school Gmail address to get started.</p>

      <Stepper steps={["Account", "Profile", "Verify"]} current={1} />
      <RoleTabs value={role} onChange={setRole} />

      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <div className="auth__row">
          <FormField
            id="firstName"
            name="firstName"
            label="First name"
            value={form.firstName}
            onChange={handleChange}
            error={errors.firstName}
            autoComplete="given-name"
          />
          <FormField
            id="lastName"
            name="lastName"
            label="Last name"
            value={form.lastName}
            onChange={handleChange}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        <FormField
          id="email"
          name="email"
          type="email"
          label="School Gmail"
          placeholder={`name@${SCHOOL_DOMAIN}`}
          hint="Only verified school domains can create accounts."
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />

        <div className="auth__row">
          <FormField
            id="password"
            name="password"
            type="password"
            label="Password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="new-password"
          />
          <FormField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
        </div>

        <label className="auth__check">
          <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} />I agree
          to the Terms &amp; Privacy Policy
        </label>
        {errors.agree && <p className="auth__check-error">{errors.agree}</p>}

        {errors.form && <p className="auth__form-error">{errors.form}</p>}

        <Button type="submit" size="lg" className="btn--block" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="auth__foot">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
