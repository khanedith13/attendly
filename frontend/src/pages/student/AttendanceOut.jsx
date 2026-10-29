import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import ScannerPreview from "../../components/ScannerPreview";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useNow } from "../../hooks/useNow";
import { useTopbarBadge } from "../../hooks/useTopbarBadge";
import { checkOut, getAttendanceOutData } from "../../services/studentService";
import { firstErrors } from "../../utils/apiErrors";
import { formatDuration, formatTime } from "../../utils/format";
import { isStudentId } from "../../utils/validators";
import "./Attendance.css";

export default function AttendanceOut() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => getAttendanceOutData(user), [user]);
  const { data, loading, reload } = useAsyncData(load);
  const now = useNow();

  const studentIdRef = useRef(null);
  const [typedId, setTypedId] = useState(null);
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = data?.activeSession ?? null;
  let badgeText = "";
  if (data) badgeText = active ? "1 active session" : "No active session";
  useTopbarBadge(active ? "info" : "neutral", badgeText);

  if (loading) return <LoadingBlock />;

  const studentId = typedId ?? active?.studentId ?? data.studentId ?? "";

  function handleChange(event) {
    setTypedId(event.target.value);
    setFieldError("");
    setFormError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!studentId.trim()) return setFieldError("Student ID is required.");
    if (!isStudentId(studentId)) return setFieldError("Use the format 2026-10452.");

    setSubmitting(true);
    try {
      const entry = await checkOut(user, { studentId: studentId.trim() });
      const duration = formatDuration(new Date(entry.timeOut) - new Date(entry.timeIn));
      setSuccess(`Checked out of ${entry.event}. Total time: ${duration}.`);
      setTypedId(null);
      reload();
    } catch (error) {
      const fields = firstErrors(error.errors);
      setFieldError(fields.studentId ?? "");
      setFormError(error.status === 422 ? "" : error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Departure"
        title="Attendance Out"
        subtitle="Complete your attendance record when leaving the event."
      />

      <div className="attendance-grid">
        <Card title="Scan event QR code">
          <ScannerPreview
            hint="Point your camera at the checkout QR"
            caption="Camera preview • QR scanner"
          />
          <div className="attendance__center">
            <Button variant="outline" onClick={() => studentIdRef.current?.focus()}>
              Use manual entry instead
            </Button>
          </div>
        </Card>

        <Card title="Current attendance">
          {success && <Notice tone="success">{success}</Notice>}

          {active ? (
            <>
              <div className="session">
                <div className="session__check">✓</div>
                <h4>You are checked in</h4>
                <p className="session__event">{active.eventTitle}</p>
                <div className="session__row">
                  <span>Check-in time</span>
                  <strong>{formatTime(active.checkedInAt)}</strong>
                </div>
                <div className="session__row">
                  <span>Duration</span>
                  <strong>{formatDuration(now - new Date(active.checkedInAt).getTime())}</strong>
                </div>
              </div>

              <form
                className="attendance__form attendance__form--spaced"
                onSubmit={handleSubmit}
                noValidate
              >
                <FormField
                  ref={studentIdRef}
                  id="studentId"
                  name="studentId"
                  label="Student ID"
                  placeholder="2026-10452"
                  value={studentId}
                  onChange={handleChange}
                  error={fieldError}
                />
                {formError && <Notice>{formError}</Notice>}
                <Button type="submit" size="lg" className="btn--block" disabled={submitting}>
                  {submitting ? "Confirming..." : "Confirm attendance out"}
                </Button>
                <p className="attendance__footnote">
                  This will close your active attendance session.
                </p>
              </form>
            </>
          ) : (
            <div className="empty-note">
              <p>You are not checked in to any event.</p>
              <Button size="sm" onClick={() => navigate("/student/attendance-in")}>
                Go to Attendance In
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
