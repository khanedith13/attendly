import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import LoadingBlock from "../components/LoadingBlock";
import Modal from "../components/Modal";
import Notice from "../components/Notice";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { checkIn, checkOut } from "../services/studentService";
import { formatShortDateTime } from "../utils/format";

export default function BrowserAttendance({ direction }) {
  const { token } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  if (authLoading) return <LoadingBlock />;

  if (!user) {
    return (
      <main style={{ width: "min(100% - 32px, 680px)", margin: "48px auto" }}>
        <Card title="Log in to record attendance">
          <Notice tone="info">
            Sign in with your student account, then scan this event QR code again.
          </Notice>
          <Link to="/login" state={{ from: location }} className="link-muted">
            Go to login
          </Link>
        </Card>
      </main>
    );
  }

  if (user.role !== "student") {
    return (
      <main style={{ width: "min(100% - 32px, 680px)", margin: "48px auto" }}>
        <Card title="Student account required">
          <Notice tone="danger">Only a signed-in student can submit attendance.</Notice>
        </Card>
      </main>
    );
  }

  async function submitAttendance() {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const result =
        direction === "in"
          ? await checkIn(user, { qrToken: token })
          : await checkOut(user, { qrToken: token });

      setReceipt({
        event: direction === "in" ? result.eventTitle : result.event,
        time: direction === "in" ? result.checkedInAt : result.timeOut,
        direction,
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  const directionLabel = direction === "in" ? "Attendance in" : "Attendance out";

  return (
    <main style={{ width: "min(100% - 32px, 680px)", margin: "32px auto" }}>
      <PageHeader
        eyebrow="Event attendance"
        title={directionLabel}
        subtitle="Confirm to submit this QR code using your signed-in student account."
      />

      <Card title="Confirm attendance">
        <p>Signed in as {user.name} ({user.email}).</p>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button className="btn--block" disabled={submitting} onClick={submitAttendance}>
          {submitting ? "Submitting..." : `Confirm ${directionLabel.toLowerCase()}`}
        </Button>
      </Card>

      {receipt && (
        <Modal title="Attendance confirmed" onClose={() => setReceipt(null)}>
          <div className="attendance__form">
            <p>
              <strong>Event:</strong> {receipt.event}
            </p>
            <p>
              <strong>{directionLabel}:</strong> {formatShortDateTime(receipt.time)}
            </p>
            <p>
              <strong>Student:</strong> {user.name}
            </p>
            <Button variant="outline" className="btn--block" onClick={() => setReceipt(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}