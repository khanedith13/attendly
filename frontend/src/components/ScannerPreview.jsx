import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";
import "./ScannerPreview.css";

export default function ScannerPreview({ hint, caption, onScan }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const activeRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const startScanning = useCallback(async () => {
    activeRef.current = true;

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (!activeRef.current) return;
      setStarting(true);
      setError("");
      setResult("");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (decoded, _decodeError, controls) => {
          if (!decoded || !activeRef.current) return;

          activeRef.current = false;
          controls.stop();
          controlsRef.current = null;
          setScanning(false);
          setStarting(false);
          setResult(decoded.getText());
          onScanRef.current?.(decoded.getText());
        },
      );

      if (activeRef.current) {
        controlsRef.current = controls;
        setScanning(true);
        setStarting(false);
      } else {
        controls.stop();
      }
    } catch (scanError) {
      if (activeRef.current) {
        activeRef.current = false;
        setStarting(false);
        setError(
          `Could not start the camera. Check camera permission and use HTTPS or localhost. ${
            scanError instanceof Error ? scanError.message : String(scanError)
          }`,
        );
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) startScanning();
    });

    return () => {
      mounted = false;
      activeRef.current = false;
      controlsRef.current?.stop();
    };
  }, [startScanning]);

  return (
    <div>
      <div className="scanner">
        <p className="scanner__hint">{hint}</p>
        <div className="scanner__frame">
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "18px" }}
          />
          {(scanning || starting) && <span className="scanner__line" />}
          <span className="scanner__corner scanner__corner--tl" />
          <span className="scanner__corner scanner__corner--tr" />
          <span className="scanner__corner scanner__corner--bl" />
          <span className="scanner__corner scanner__corner--br" />
        </div>
        <p className="scanner__caption">{caption}</p>
      </div>
      {error && (
        <div className="attendance__center">
          <p role="alert">{error}</p>
          <Button variant="outline" onClick={startScanning} disabled={starting}>
            Retry camera
          </Button>
        </div>
      )}
      {result && <p aria-live="polite">QR detected: {result}</p>}
    </div>
  );
}
