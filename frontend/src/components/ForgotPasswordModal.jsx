import { useState } from "react";
import { requestPasswordReset } from "../services/authService";
import { isValidEmail } from "../utils/validators";
import Button from "./Button";
import FormField from "./FormField";
import Modal from "./Modal";
import Notice from "./Notice";

export default function ForgotPasswordModal({ initialEmail = "", onClose }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim()) return setError("Email is required.");
    if (!isValidEmail(email)) return setError("Enter a valid email address.");

    setSending(true);
    await requestPasswordReset(email);
    setSent(true);
    setSending(false);
  }

  return (
    <Modal title="Reset your password" onClose={onClose}>
      {sent ? (
        <div style={{ display: "grid", gap: 14 }}>
          <Notice tone="success">
            If an account exists for {email.trim()}, a password reset link is on its way. Check your
            inbox.
          </Notice>
          <Button className="btn--block" onClick={onClose}>
            Back to log in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 14 }}>
          <p className="confirm-text" style={{ margin: 0 }}>
            Enter your school Gmail and we will email you a link to choose a new password.
          </p>
          <FormField
            id="resetEmail"
            name="resetEmail"
            type="email"
            label="School Gmail"
            hint={import.meta.env.DEV ? "Demo mode: no email is actually sent." : undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            error={error}
            autoComplete="email"
          />
          <div className="confirm-actions">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send reset link"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
