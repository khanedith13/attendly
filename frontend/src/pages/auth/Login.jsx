import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import RoleTabs from "../../components/RoleTabs";
import { useAuth } from "../../hooks/useAuth";
import AuthLayout from "../../layouts/AuthLayout";
import { firstErrors } from "../../utils/apiErrors";
import { homePath } from "../../utils/roles";
import { isValidEmail } from "../../utils/validators";

const art = (
  <>
    <h1 className="art-title">
      Simple attendance.
      <br />
      Smarter events.
    </h1>
    <p className="art-sub">
      A unified campus platform for event registration, QR attendance in/out, organizer management,
      and administration.
    </p>

    <div className="art-card">
      <div className="art-card__row">
        <b>Today's campus attendance</b>
        <span>Updated just now</span>
      </div>
      <div className="art-card__body">
        <div>
          <div className="art-card__number">1,284</div>
          <div className="art-card__label">check-ins</div>
        </div>
        <div className="art-bar">
          <div className="art-bar__track">
            <span className="art-bar__fill" />
          </div>
          <div className="art-bar__label">82% of registered attendees</div>
        </div>
      </div>
    </div>
  </>
);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Password is required.";
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login({ email: form.email, password: form.password }, role);
      navigate(homePath(user.role), { replace: true });
    } catch (error) {
      setErrors({
        ...firstErrors(error.errors),
        form: error.status === 422 ? undefined : error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout art={art} showLogo>
      <h2 className="auth__title">Welcome back</h2>
      <p className="auth__lead">Log in to manage your attendance and events.</p>

      {location.state?.registered && (
        <p className="auth__notice">Account created. Log in to continue.</p>
      )}

      <RoleTabs value={role} onChange={setRole} />

      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          type="email"
          label="School Gmail"
          placeholder="student@school.edu.ph"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />
        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="auth__meta">
          <label className="auth__check">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            Remember me
          </label>
          <button type="button" className="auth__link-btn">
            Forgot password?
          </button>
        </div>

        {errors.form && <p className="auth__form-error">{errors.form}</p>}

        <Button type="submit" size="lg" className="btn--block" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in to Attendly"}
        </Button>
      </form>

      <p className="auth__foot">
        New to Attendly? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
