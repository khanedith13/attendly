import { useEffect, useRef, useState } from "react";
import Button from "./Button";
import Notice from "./Notice";

export default function SelfieCapture({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const onCaptureRef = useRef(onCapture);
  const [attempt, setAttempt] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!cancelled) setCameraReady(true);
      } catch (error) {
        if (!cancelled) {
          setCameraError(
            `Could not start the selfie camera. Check camera permission and use HTTPS or localhost. ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const image = canvas.toDataURL("image/jpeg", 0.85);
    setPhoto(image);
    onCaptureRef.current(image);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function retakePhoto() {
    setPhoto("");
    setCameraError("");
    setCameraReady(false);
    setAttempt((value) => value + 1);
    onCaptureRef.current("");
  }

  return (
    <div>
      {photo ? (
        <img
          src={photo}
          alt="Captured event selfie"
          style={{ display: "block", width: "100%", maxWidth: 480, borderRadius: 12 }}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Live selfie camera preview"
            style={{
              display: "block",
              width: "100%",
              maxWidth: 480,
              minHeight: 240,
              borderRadius: 12,
              background: "var(--navy)",
              objectFit: "cover",
            }}
          />
          {!cameraReady && !cameraError && <p>Starting selfie camera...</p>}
        </>
      )}

      {cameraError && (
        <Notice tone="danger">
          {cameraError}{" "}
          <Button variant="outline" onClick={retakePhoto}>
            Retry camera
          </Button>
        </Notice>
      )}

      <div className="attendance__center">
        {photo ? (
          <Button variant="outline" onClick={retakePhoto}>
            Retake selfie
          </Button>
        ) : (
          <Button onClick={capturePhoto} disabled={!cameraReady}>
            Capture selfie
          </Button>
        )}
      </div>
    </div>
  );
}
