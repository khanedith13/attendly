import { useCallback, useState } from "react";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import { checkIn, getAttendanceInData } from "../../services/studentService";
import { getCatalog } from "../../services/catalog";
import { firstErrors } from "../../utils/apiErrors";
import { formatShortDateTime, formatTime } from "../../utils/format";
import "./Attendance.css";

export default function AttendanceIn() {
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceInData(user), [user]);
  const { data, loading, reload } = useAsyncData(load);

  const [eventId, setEventId] = useState("");
  const [errors, setErrors] = useState({});
  const [scanMessage, setScanMessage] = useState(null);
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useTopbarBadge("success", "Ready to scan");

  if (loading) return <LoadingBlock />;

  const selectedEvent = data.events.find((event) => event.id === Number(eventId));

  function handleScan(value) {
    let token;
    try {
      const path = new URL(value).pathname;
      const match = path.match(/^\/check-in\/([^/]+)$/);
      if (!match) throw new Error("This QR code is not an attendance-in code.");
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

    const event = getCatalog().find((item) => item.qrIn === token);
    if (!event || !data.events.some((item) => item.id === event.id)) {
      setScanMessage({
        tone: "danger",
        text: "This event QR is invalid or you are not registered for this event.",
      });
      return;
    }

    setEventId(String(event.id));
    setErrors({});
    setScanMessage({ tone: "success", text: `${event.title} selected for attendance in.` });
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedEvent) {
      setErrors({ eventId: "Scan the QR code for one of your registered events." });
      return;
    }

    setSubmitting(true);
    try {
      const session = await checkIn(user, {
        studentId: data.student.studentId,
        email: data.student.email,
        eventId: selectedEvent.id,
      });
      setSuccess(`Checked in to ${session.eventTitle} at ${formatTime(session.checkedInAt)}.`);
      reload();
    } catch (error) {
      setErrors({
        ...firstErrors(error.errors),
        form: error.status === 422 ? undefined : error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Arrival"
        title="Attendance In"
        subtitle="Scan your registered event QR code, review your details, and confirm attendance."
      />

      <div className="attendance-grid">
        <Card title="Scan event QR code">
          <ScannerPreview
            hint="Point your camera at the attendance QR"
            caption="Camera preview • QR scanner"
            onScan={handleScan}
          />
          {scanMessage && <Notice tone={scanMessage.tone}>{scanMessage.text}</Notice>}
        </Card>

        <Card title="Confirm attendance">
          <form className="attendance__form" onSubmit={handleSubmit} noValidate>
            <FormField
              id="event"
              label="Event"
              value={selectedEvent?.title ?? "Scan your event QR code"}
              readOnly
            />
            <FormField id="studentId" label="Student ID" value={data.student.studentId} readOnly />
            <FormField id="fullName" label="Full name" value={data.student.name} readOnly />
            <FormField id="course" label="Course" value={data.student.course} readOnly />
            <FormField id="yearLevel" label="Year level" value={data.student.yearLevel} readOnly />

            {data.activeSession && (
              <Notice tone="info">
                You are checked in to {data.activeSession.eventTitle}. Use Attendance Out when you
                leave.
              </Notice>
            )}
            {errors.eventId && <Notice>{errors.eventId}</Notice>}
            {errors.form && <Notice>{errors.form}</Notice>}
            {success && <Notice tone="success">{success}</Notice>}

            <Button
              type="submit"
              size="lg"
              className="btn--block"
              disabled={submitting || !selectedEvent || Boolean(data.activeSession)}
            >
              {submitting ? "Confirming..." : "Confirm attendance in"}
            </Button>
          </form>

          <div className="attendance__last">
            <span>Last successful check-in</span>
            <strong>
              {data.lastCheckIn
                ? `${data.lastCheckIn.event} • ${formatShortDateTime(data.lastCheckIn.at)}`
                : "No check-ins yet"}
            </strong>
          </div>
        </Card>
      </div>
    </>
  );
}
