import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import FormField from "../components/FormField";
import Modal from "../components/Modal";
import Notice from "../components/Notice";
import PageHeader from "../components/PageHeader";
import SelfieCapture from "../components/SelfieCapture";
import { getCatalog } from "../services/catalog";
import { recordPublicAttendance } from "../services/roster";
import { firstErrors } from "../utils/apiErrors";
import { formatShortDateTime } from "../utils/format";
import { isStudentId } from "../utils/validators";

export default function BrowserAttendance({ direction }) {
  const { token } = useParams();
  const [values, setValues] = useState({
    studentId: "",
    name: "",
    course: "",
    yearLevel: "",
  });
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const event = useMemo(() => {
    const tokenField = direction === "in" ? "qrIn" : "qrOut";
    return getCatalog().find((item) => item[tokenField] === token) ?? null;
  }, [direction, token]);

  function handleChange(changeEvent) {
    const { name, value } = changeEvent.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setErrorMessage("");
  }

  async function handleSelfieCapture(selfie) {
    if (!selfie || submitting || !event) return;

    const nextErrors = {};
    if (!values.studentId.trim()) nextErrors.studentId = "Student ID is required.";
    else if (!isStudentId(values.studentId)) {
      nextErrors.studentId = "Use the format 2026-10452.";
    }
    if (!values.name.trim()) nextErrors.name = "Full name is required.";
    if (!values.course.trim()) nextErrors.course = "Course is required.";
    if (!values.yearLevel.trim()) nextErrors.yearLevel = "Year level is required.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    setErrorMessage("");
    try {
      const attendance = recordPublicAttendance({
        token,
        direction,
        ...values,
        selfie,
      });
      setReceipt(attendance);
    } catch (submitError) {
      setErrors(firstErrors(submitError.errors));
      setErrorMessage(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!event) {
    return (
      <main style={{ width: "min(100% - 32px, 680px)", margin: "48px auto" }}>
        <Card title="Invalid attendance QR">
          <Notice tone="danger">
            This attendance link is invalid or does not belong to an event in this browser.
          </Notice>
        </Card>
      </main>
    );
  }

  const directionLabel = direction === "in" ? "Attendance in" : "Attendance out";

  return (
    <main style={{ width: "min(100% - 32px, 680px)", margin: "32px auto" }}>
      <PageHeader
        eyebrow="Event attendance"
        title={directionLabel}
        subtitle="Enter your registered student details and take a required selfie to submit."
      />

      <Card title={event.title}>
        <form className="attendance__form" onSubmit={(submitEvent) => submitEvent.preventDefault()}>
          <FormField
            id="studentId"
            name="studentId"
            label="Student ID"
            placeholder="2026-10452"
            value={values.studentId}
            onChange={handleChange}
            error={errors.studentId}
            autoComplete="off"
          />
          <FormField
            id="fullName"
            name="name"
            label="Full name"
            value={values.name}
            onChange={handleChange}
            error={errors.name}
            autoComplete="name"
          />
          <FormField
            id="course"
            name="course"
            label="Course"
            value={values.course}
            onChange={handleChange}
            error={errors.course}
          />
          <FormField
            id="yearLevel"
            name="yearLevel"
            label="Year level"
            placeholder="e.g. 3rd Year"
            value={values.yearLevel}
            onChange={handleChange}
            error={errors.yearLevel}
          />

          <p className="attendance__note">
            Your selfie is shared with the event organizer for attendance verification.
          </p>
          <SelfieCapture
            key={`${token}-${receipt ? "submitted" : "form"}`}
            onCapture={handleSelfieCapture}
          />
          {submitting && <Notice tone="info">Submitting attendance...</Notice>}
          {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
        </form>
      </Card>

      {receipt && (
        <Modal title="Attendance confirmed" onClose={() => setReceipt(null)}>
          <div className="attendance__form">
            <p>
              <strong>Event:</strong> {receipt.event.title}
            </p>
            <p>
              <strong>{directionLabel}:</strong> {formatShortDateTime(receipt.time)}
            </p>
            <p>
              <strong>Student ID:</strong> {receipt.student.studentId}
            </p>
            <p>
              <strong>Full name:</strong> {receipt.student.name}
            </p>
            <p>
              <strong>Course:</strong> {receipt.student.course}
            </p>
            <p>
              <strong>Year level:</strong> {receipt.student.yearLevel}
            </p>
            <Button variant="outline" className="btn--block" onClick={() => setReceipt(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
