import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AsyncError from "../../components/AsyncError";
import Card from "../../components/Card";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import { getAttendanceOutData } from "../../services/studentService";
import "./Attendance.css";

function readQrToken(value) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/check-out\/([^/]+)$/);
  if (!match) throw new Error("This QR code is not an attendance-out code.");
  return decodeURIComponent(match[1]);
}

export default function AttendanceOut() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceOutData(user), [user]);
  const { data, loading, error: loadError, reload } = useAsyncData(load);
  const [scannerKey, setScannerKey] = useState(0);
  const [scanMessage, setScanMessage] = useState(null);
  const [opening, setOpening] = useState(false);

  const active = data?.activeSession ?? null;
  useTopbarBadge(active ? "info" : "neutral", active ? "1 active session" : "No active session");

  if (loading) return <LoadingBlock />;
  if (loadError) return <AsyncError error={loadError} onRetry={reload} />;

  function handleScan(value) {
    if (opening) return;

    try {
      const token = readQrToken(value);
      setOpening(true);
      navigate(`/check-out/${encodeURIComponent(token)}`);
    } catch (scanError) {
      setScanMessage({
        tone: "danger",
        text:
          scanError instanceof TypeError
            ? "This QR code is not a valid attendance link."
            : scanError.message,
      });
      setScannerKey((key) => key + 1);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Departure"
        title="Attendance Out"
        subtitle="Scan the matching event QR code, review your details, and take a selfie."
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
        {opening && <Notice tone="info">Opening attendance form...</Notice>}
        {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
      </Card>
    </>
  );
}
