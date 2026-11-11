import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Button from "./Button";
import Modal from "./Modal";
import "./LogoutDialog.css";

export default function LogoutDialog({ onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <Modal title="Log out of Attendly?" hideHeader maxWidth={424} onClose={onClose}>
      <div className="logout__icon">↪</div>
      <h3 className="logout__title">Log out of Attendly?</h3>
      <p className="logout__text">
        Your active session will end on this device. Any saved drafts will remain available the next
        time you sign in.
      </p>
      <div className="logout__actions">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" className="logout__confirm" disabled={busy} onClick={handleLogout}>
          {busy ? "Logging out..." : "Log out"}
        </Button>
      </div>
    </Modal>
  );
}
