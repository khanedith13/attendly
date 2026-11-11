import { useCallback, useState } from "react";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingBlock from "../../components/LoadingBlock";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import SelfieCapture from "../../components/SelfieCapture";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import { getCatalog } from "../../services/catalog";
import { checkOut, getAttendanceOutData } from "../../services/studentService";
import { firstErrors } from "../../utils/apiErrors";
import { formatShortDateTime } from "../../utils/format";
import "./Attendance.css";

export default function AttendanceOut() {
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceOutData(user), [user]);
  const { data, loading, reload } = useAsyncData(load);

  const [scanConfirmed, setScanConfirmed] = useState(false);
  const [selfie, setSelfie] = useState("");
  const [scannerKey, setScannerKey] = useState(0);
  const [scanMessage, setScanMessage] = useState(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const active = data?.activeSession ?? null;
  useTopbarBadge(active ? "info" : "neutral", active ? "1 active session" : "No active session");

  if (loading) return <LoadingBlock />;

  function handleScan(value) {
    setScanConfirmed(false);
    let token;
    try {
      const path = new URL(value).pathname;
      const match = path.match(/^\/check-out\/([^/]+)$/);
      if (!match) throw new Error("This QR code is not an attendance-out code.");
      token = decodeURIComponent(match[1]);
    } catch (scanError) {
      setScanMessage({
        tone: "danger",
        text:
          scanError instanceof TypeError
            ? "This QR code is not a valid attendance link."
            : scanError.message,
      });
      setScannerKey((key) => key + 1);
      return;
    }

    const event = getCatalog().find((item) => item.qrOut === token);
    if (!active || !event || event.id !== active.eventId) {
      setScanMessage({
        tone: "danger",
        text: "This checkout QR does not match your active event.",
      });
      setScannerKey((key) => key + 1);
      return;
    }

    setScanConfirmed(true);
    setSelfie("");
    setError("");
    setScanMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!active || !scanConfirmed) return;
    if (!selfie) {
      setError("Take a selfie to submit attendance.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const entry = await checkOut(user, { studentId: active.studentId, selfie });
      setReceipt({ entry, student: data.student });
      reload();
    } catch (submitError) {
      const fields = firstErrors(submitError.errors);
      setError(fields.studentId ?? fields.selfie ?? submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function closeReceipt() {
    setReceipt(null);
    setScanConfirmed(false);
    setSelfie("");
  }

  return (
    <>
      <PageHeader
        eyebrow="Departure"
        title="Attendance Out"
        subtitle="Scan the checkout QR, take a required selfie, and submit your attendance."
      />

      {!scanConfirmed ? (
        <Card title="Scan event QR code">
          <ScannerPreview
            key={scannerKey}
            hint="Point your camera at the checkout QR"
            caption="Camera preview • QR scanner"
            onScan={handleScan}
          />
          {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
        </Card>
      ) : (
        <Card title="Take event selfie">
          <p className="attendance__note">{active.eventTitle}</p>
          <form className="attendance__form" onSubmit={handleSubmit} noValidate>
            <SelfieCapture onCapture={setSelfie} />
            {error && <Notice tone="danger">{error}</Notice>}
            <Button type="submit" size="lg" className="btn--block" disabled={submitting || !selfie}>
              {submitting ? "Submitting..." : "Submit attendance out"}
            </Button>
          </form>
        </Card>
      )}

      {receipt && (
        <Modal title="Attendance confirmed" onClose={closeReceipt}>
          <div className="attendance__form">
            <p>
              <strong>Event:</strong> {receipt.entry.event}
            </p>
            <p>
              <strong>Attendance out:</strong> {formatShortDateTime(receipt.entry.timeOut)}
            </p>
            <p>
              <strong>Student ID:</strong> {receipt.student.studentId}
            </p>
            <p>
              <strong>Full name:</strong> {receipt.student.name}
            </p>
            <p>
              <strong>Course:</strong> {receipt.student.course}
            </p>
            <p>
              <strong>Year level:</strong> {receipt.student.yearLevel}
            </p>
            <Button variant="outline" className="btn--block" onClick={closeReceipt}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
