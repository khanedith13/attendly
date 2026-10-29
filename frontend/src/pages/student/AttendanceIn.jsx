import { useCallback, useRef, useState } from "react";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import SelectField from "../../components/SelectField";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import { checkIn, getAttendanceInData } from "../../services/studentService";
import { firstErrors } from "../../utils/apiErrors";
import { formatShortDateTime, formatTime } from "../../utils/format";
import { isStudentId } from "../../utils/validators";
import "./Attendance.css";

export default function AttendanceIn() {
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceInData(user), [user]);
  const { data, loading, reload } = useAsyncData(load);

  const studentIdRef = useRef(null);
  const [edits, setEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useTopbarBadge("success", "Ready to scan");

  if (loading) return <LoadingBlock />;

  // Values come from the loaded data, unless the user has typed something.
  const values = {
    studentId: data.studentId ?? "",
    email: user.email,
    eventId: data.events[0] ? String(data.events[0].id) : "",
    ...edits,
  };
  const hasEvents = data.events.length > 0;

  function handleChange(event) {
    const { name, value } = event.target;
    setEdits((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
    setSuccess("");
  }

  function validate() {
    const next = {};
    if (!values.studentId.trim()) next.studentId = "Student ID is required.";
    else if (!isStudentId(values.studentId)) next.studentId = "Use the format 2026-10452.";
    if (!values.email.trim()) next.email = "Email is required.";
    if (!values.eventId) next.eventId = "Select an event.";
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const session = await checkIn(user, {
        studentId: values.studentId.trim(),
        email: values.email.trim().toLowerCase(),
        eventId: Number(values.eventId),
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
        subtitle="Scan the event QR code or enter your student details manually."
      />

      <div className="attendance-grid">
        <Card title="Scan event QR code">
          <ScannerPreview
            hint="Point your camera at the attendance QR"
            caption="Camera preview • QR scanner"
          />
          <div className="attendance__center">
            <Button variant="outline" onClick={() => studentIdRef.current?.focus()}>
              Use manual entry instead
            </Button>
          </div>
        </Card>

        <Card title="Manual attendance">
          <p className="attendance__note">
            Use this form when the QR scanner is unavailable. Your school Gmail must match your
            registered profile.
          </p>

          <form className="attendance__form" onSubmit={handleSubmit} noValidate>
            <FormField
              ref={studentIdRef}
              id="studentId"
              name="studentId"
              label="Student ID"
              placeholder="2026-10452"
              value={values.studentId}
              onChange={handleChange}
              error={errors.studentId}
            />
            <FormField
              id="email"
              name="email"
              type="email"
              label="School Gmail"
              value={values.email}
              onChange={handleChange}
              error={errors.email}
            />
            <SelectField
              id="eventId"
              name="eventId"
              label="Event"
              value={values.eventId}
              onChange={handleChange}
              error={errors.eventId}
              disabled={!hasEvents}
            >
              {!hasEvents && <option value="">No registered events</option>}
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </SelectField>

            {data.activeSession && (
              <Notice tone="info">
                You are checked in to {data.activeSession.eventTitle}. Use Attendance Out when you
                leave.
              </Notice>
            )}
            {errors.form && <Notice>{errors.form}</Notice>}
            {success && <Notice tone="success">{success}</Notice>}

            <Button
              type="submit"
              size="lg"
              className="btn--block"
              disabled={submitting || !hasEvents}
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