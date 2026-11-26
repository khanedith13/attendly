import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import "./Attendance.css";

function readQrToken(value) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/check-in\/([^/]+)$/);
  if (!match) throw new Error("This QR code is not an attendance-in code.");
  return decodeURIComponent(match[1]);
}

export default function AttendanceIn() {
  const navigate = useNavigate();
  const [scannerKey, setScannerKey] = useState(0);
  const [scanMessage, setScanMessage] = useState(null);
  const [opening, setOpening] = useState(false);

  useTopbarBadge("success", "Ready to scan");

  function handleScan(value) {
    if (opening) return;

    try {
      const token = readQrToken(value);
      setOpening(true);
      navigate(`/check-in/${encodeURIComponent(token)}`);
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
        eyebrow="Arrival"
        title="Attendance In"
        subtitle="Scan the event QR code, review your student details, and take a selfie."
      />
      <Card title="Scan event QR code">
        <ScannerPreview
          key={scannerKey}
          hint="Point your camera at the attendance-in QR"
          caption="Camera preview • QR scanner"
          onScan={handleScan}
        />
        {opening && <Notice tone="info">Opening attendance form...</Notice>}
        {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
      </Card>
    </>
  );
}
