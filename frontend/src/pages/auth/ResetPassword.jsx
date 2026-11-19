import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import Notice from "../../components/Notice";
import { resetPassword } from "../../services/authService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token || !email) {
      setError("This password reset link is incomplete.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword({
        token,
        email,
        password,
        password_confirmation: confirmation,
      });

      setSuccess(true);
    } catch (requestError) {
      const responseMessage = requestError.response?.data?.message;

      setError(
        responseMessage ||
          "The reset link is invalid or expired. Request a new link.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout showLogo>
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <h1>Choose a new password</h1>
          <p>Enter and confirm your new Attendly account password.</p>
        </div>

        {success ? (
          <>
            <Notice tone="success">
              Your password has been reset successfully. You can now sign in
              using your new password.
            </Notice>

            <Button className="btn--block" onClick={() => {
              window.location.assign("/login");
            }}>
              Back to login
            </Button>
          </>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 14 }}
          >
            <FormField
              id="newPassword"
              name="newPassword"
              type="password"
              label="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />

            <FormField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm new password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
            />

            {error && <Notice tone="danger">{error}</Notice>}

            <Button
              type="submit"
              className="btn--block"
              disabled={submitting}
            >
              {submitting ? "Resetting..." : "Reset password"}
            </Button>

            <Link to="/login">Return to login</Link>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}