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
import { checkIn, getAttendanceInData } from "../../services/studentService";
import { firstErrors } from "../../utils/apiErrors";
import { formatShortDateTime } from "../../utils/format";
import "./Attendance.css";

export default function AttendanceIn() {
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceInData(user), [user]);
  const { data, loading, reload } = useAsyncData(load);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selfie, setSelfie] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [error, setError] = useState("");
  const [scanMessage, setScanMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useTopbarBadge("success", "Ready to scan");

  if (loading) return <LoadingBlock />;

  function handleScan(value) {
    let token;
    try {
      const path = new URL(value).pathname;
      const match = path.match(/^\/check-in\/([^/]+)$/);
      if (!match) throw new Error("This QR code is not an attendance-in code.");
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

    const event = getCatalog().find((item) => item.qrIn === token);
    if (!event || !data.events.some((item) => item.id === event.id)) {
      setScanMessage({
        tone: "danger",
        text: "This event QR is invalid or you are not registered for this event.",
      });
      setScannerKey((key) => key + 1);
      return;
    }

    setSelectedEvent(event);
    setSelfie("");
    setError("");
    setScanMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedEvent) return;
    if (!selfie) {
      setError("Take a selfie to submit attendance.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const session = await checkIn(user, {
        studentId: data.student.studentId,
        email: data.student.email,
        eventId: selectedEvent.id,
        selfie,
      });
      setReceipt({
        event: session.eventTitle,
        time: session.checkedInAt,
        student: data.student,
      });
      reload();
    } catch (submitError) {
      const fields = firstErrors(submitError.errors);
      setError(fields.eventId ?? submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function closeReceipt() {
    setReceipt(null);
    setSelectedEvent(null);
    setSelfie("");
  }

  return (
    <>
      <PageHeader
        eyebrow="Arrival"
        title="Attendance In"
        subtitle="Scan the event QR code, take a required selfie, and submit your attendance."
      />

      {!selectedEvent ? (
        <Card title="Scan event QR code">
          <ScannerPreview
            key={scannerKey}
            hint="Point your camera at the attendance QR"
            caption="Camera preview • QR scanner"
            onScan={handleScan}
          />
          {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
        </Card>
      ) : (
        <Card title="Take event selfie">
          <p className="attendance__note">{selectedEvent.title}</p>
          <form className="attendance__form" onSubmit={handleSubmit} noValidate>
            <SelfieCapture onCapture={setSelfie} />
            {error && <Notice tone="danger">{error}</Notice>}
            <Button type="submit" size="lg" className="btn--block" disabled={submitting || !selfie}>
              {submitting ? "Submitting..." : "Submit attendance in"}
            </Button>
          </form>
        </Card>
      )}

      {receipt && (
        <Modal title="Attendance confirmed" onClose={closeReceipt}>
          <div className="attendance__form">
            <p>
              <strong>Event:</strong> {receipt.event}
            </p>
            <p>
              <strong>Attendance in:</strong> {formatShortDateTime(receipt.time)}
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
