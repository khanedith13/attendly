import { useCallback, useState } from "react";
import AsyncError from "../../components/AsyncError";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingBlock from "../../components/LoadingBlock";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import { checkIn, getAttendanceInData } from "../../services/studentService";
import { formatShortDateTime } from "../../utils/format";
import "./Attendance.css";

function readQrToken(value, pathPrefix) {
  const url = new URL(value);
  const match = url.pathname.match(new RegExp(`^/${pathPrefix}/([^/]+)$`));
  if (!match) throw new Error("This QR code is not an attendance-in code.");
  return decodeURIComponent(match[1]);
}

export default function AttendanceIn() {
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceInData(user), [user]);
  const { data, loading, error: loadError, reload } = useAsyncData(load);

  const [receipt, setReceipt] = useState(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [error, setError] = useState("");
  const [scanMessage, setScanMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useTopbarBadge("success", "Ready to scan");

  if (loading) return <LoadingBlock />;
  if (loadError) return <AsyncError error={loadError} onRetry={reload} />;

  async function handleScan(value) {
    if (submitting) return;

    let token;
    try {
      token = readQrToken(value, "check-in");
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

    setSubmitting(true);
    setError("");
    setScanMessage(null);

    try {
      const session = await checkIn(user, { qrToken: token });
      setReceipt({
        event: session.eventTitle,
        time: session.checkedInAt,
        student: data.student,
      });
      await reload();
    } catch (submitError) {
      setError(submitError.message);
      setScannerKey((key) => key + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function closeReceipt() {
    setReceipt(null);
    setScannerKey((key) => key + 1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Arrival"
        title="Attendance In"
        subtitle="Scan the event QR code to record your attendance."
      />

      <Card title="Scan event QR code">
        <ScannerPreview
          key={scannerKey}
          hint="Point your camera at the attendance-in QR"
          caption="Camera preview • QR scanner"
          onScan={handleScan}
        />
        {submitting && <Notice tone="info">Recording attendance...</Notice>}
        {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
      </Card>

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
              <strong>Course:</strong> {receipt.student.course || "—"}
            </p>
            <p>
              <strong>Year level:</strong> {receipt.student.yearLevel || "—"}
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