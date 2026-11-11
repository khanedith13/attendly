import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useNow } from "../../hooks/useNow";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import { getCatalog } from "../../services/catalog";
import { checkOut, getAttendanceOutData } from "../../services/studentService";
import { firstErrors } from "../../utils/apiErrors";
import { formatDuration, formatTime } from "../../utils/format";
import "./Attendance.css";

export default function AttendanceOut() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceOutData(user), [user]);
  const { data, loading, reload } = useAsyncData(load);
  const now = useNow();

  const [scanConfirmed, setScanConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const [scanMessage, setScanMessage] = useState(null);
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = data?.activeSession ?? null;
  let badgeText = "";
  if (data) badgeText = active ? "1 active session" : "No active session";
  useTopbarBadge(active ? "info" : "neutral", badgeText);

  if (loading) return <LoadingBlock />;

  function handleScan(value) {
    setScanConfirmed(false);
    let token;
    try {
      const path = new URL(value).pathname;
      const match = path.match(/^\/check-out\/([^/]+)$/);
      if (!match) throw new Error("This QR code is not an attendance-out code.");
      token = decodeURIComponent(match[1]);
    } catch (error) {
      setScanMessage({
        tone: "danger",
        text:
          error instanceof TypeError
            ? "This QR code is not a valid attendance link."
            : error.message,
      });
      return;
    }

    const event = getCatalog().find((item) => item.qrOut === token);
    if (!active || !event || event.id !== active.eventId) {
      setScanMessage({
        tone: "danger",
        text: "This checkout QR does not match your active event.",
      });
      return;
    }

    setScanMessage({
      tone: "success",
      text: `Checkout QR confirmed for ${active.eventTitle}.`,
    });
    setScanConfirmed(true);
    setFormError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!active || !scanConfirmed) {
      setFormError("Scan the checkout QR code for your active event to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const entry = await checkOut(user, { studentId: active.studentId });
      const duration = formatDuration(new Date(entry.timeOut) - new Date(entry.timeIn));
      setSuccess(`Checked out of ${entry.event}. Total time: ${duration}.`);
      setScanConfirmed(false);
      reload();
    } catch (error) {
      const fields = firstErrors(error.errors);
      setFormError(fields.studentId ?? error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Departure"
        title="Attendance Out"
        subtitle="Scan the checkout QR for your active event, then confirm."
      />

      <div className="attendance-grid">
        <Card title="Scan event QR code">
          <ScannerPreview
            hint="Point your camera at the checkout QR"
            caption="Camera preview • QR scanner"
            onScan={handleScan}
          />
          {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
        </Card>

        <Card title="Current attendance">
          {success && <Notice tone="success">{success}</Notice>}

          {active ? (
            <>
              <div className="session">
                <div className="session__check">✓</div>
                <h4>You are checked in</h4>
                <p className="session__event">{active.eventTitle}</p>
                <div className="session__row">
                  <span>Check-in time</span>
                  <strong>{formatTime(active.checkedInAt)}</strong>
                </div>
                <div className="session__row">
                  <span>Duration</span>
                  <strong>{formatDuration(now - new Date(active.checkedInAt).getTime())}</strong>
                </div>
              </div>

              <form
                className="attendance__form attendance__form--spaced"
                onSubmit={handleSubmit}
                noValidate
              >
                {formError && <Notice>{formError}</Notice>}
                <Button
                  type="submit"
                  size="lg"
                  className="btn--block"
                  disabled={submitting || !scanConfirmed}
                >
                  {submitting ? "Confirming..." : "Confirm attendance out"}
                </Button>
                <p className="attendance__footnote">
                  This will close your active attendance session.
                </p>
              </form>
            </>
          ) : (
            <div className="empty-note">
              <p>You are not checked in to any event.</p>
              <Button size="sm" onClick={() => navigate("/student/attendance-in")}>
                Go to Attendance In
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
