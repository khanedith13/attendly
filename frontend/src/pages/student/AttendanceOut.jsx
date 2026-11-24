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
import { checkOut, getAttendanceOutData } from "../../services/studentService";
import { formatShortDateTime } from "../../utils/format";
import "./Attendance.css";

function readQrToken(value) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/check-out\/([^/]+)$/);
  if (!match) throw new Error("This QR code is not an attendance-out code.");
  return decodeURIComponent(match[1]);
}

export default function AttendanceOut() {
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceOutData(user), [user]);
  const { data, loading, error: loadError, reload } = useAsyncData(load);

  const [scannerKey, setScannerKey] = useState(0);
  const [scanMessage, setScanMessage] = useState(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const active = data?.activeSession ?? null;
  useTopbarBadge(active ? "info" : "neutral", active ? "1 active session" : "No active session");

  if (loading) return <LoadingBlock />;
  if (loadError) return <AsyncError error={loadError} onRetry={reload} />;

  async function handleScan(value) {
    if (submitting) return;

    let token;
    try {
      token = readQrToken(value);
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
      const entry = await checkOut(user, { qrToken: token });
      setReceipt({ entry, student: data.student });
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
        eyebrow="Departure"
        title="Attendance Out"
        subtitle="Scan the matching event QR code to record your departure."
      />

      <Card title="Scan checkout QR code">
        {active ? (
          <>
            <p className="attendance__note">Active event: {active.eventTitle}</p>
            <ScannerPreview
              key={scannerKey}
              hint="Point your camera at the attendance-out QR"
              caption="Camera preview • QR scanner"
              onScan={handleScan}
            />
          </>
        ) : (
          <Notice tone="info">You do not have an active attendance session to check out.</Notice>
        )}
        {submitting && <Notice tone="info">Recording attendance out...</Notice>}
        {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
      </Card>

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