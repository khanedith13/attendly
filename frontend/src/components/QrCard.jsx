import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Button from "./Button";
import "./QrCard.css";

export default function QrCard({ label, value, filename }) {
  const canvasRef = useRef(null);

  function download() {
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = filename;
    link.click();
  }

  return (
    <div className="qr-card">
      <div className="qr-card__label">{label}</div>
      <div className="qr-card__code">
        <QRCodeCanvas
          ref={canvasRef}
          value={value}
          size={300}
          marginSize={2}
          fgColor="#111827"
          style={{ width: 150, height: 150 }}
        />
      </div>
      <Button variant="outline" className="btn--block" onClick={download}>
        Download QR
      </Button>
    </div>
  );
}