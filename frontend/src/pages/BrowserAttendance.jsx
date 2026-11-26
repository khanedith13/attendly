import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import FormField from "../components/FormField";
import LoadingBlock from "../components/LoadingBlock";
import Modal from "../components/Modal";
import Notice from "../components/Notice";
import PageHeader from "../components/PageHeader";
import SelfieCapture from "../components/SelfieCapture";
import { useAuth } from "../hooks/useAuth";
import { useAsyncData } from "../hooks/useAsyncData";
import { getAccount } from "../services/accountService";
import {
  checkIn,
  checkOut,
  guestCheckIn,
  guestCheckOut,
} from "../services/studentService";
import { formatShortDateTime } from "../utils/format";

const emptyStudent = {
  studentId: "",
  name: "",
  email: "",
  course: "",
  yearLevel: "",
};

async function selfieFile(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], "attendance-selfie.jpg", {
    type: blob.type || "image/jpeg",
  });
}

export default function BrowserAttendance({ direction }) {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [guestStudent, setGuestStudent] = useState(emptyStudent);
  const [selfie, setSelfie] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const loadProfile = useCallback(async () => {
    if (!user || user.role !== "student") return null;
    const account = await getAccount();
    return {
      studentId: account.studentId ?? "",
      name: user.name ?? "",
      email: user.email ?? "",
      course: account.course ?? "",
      yearLevel: account.yearLevel ?? "",
    };
  }, [user]);
  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
  } = useAsyncData(loadProfile);
  const student = user ? profile ?? emptyStudent : guestStudent;
  const profilePending = user?.role === "student" && profile === null && !profileError;

  if (authLoading || profileLoading || profilePending) return <LoadingBlock />;

  if (user && user.role !== "student") {
    return (
      <main style={{ width: "min(100% - 32px, 680px)", margin: "48px auto" }}>
        <Card title="Student account required">
          <Notice tone="danger">Only a student account can submit attendance.</Notice>
        </Card>
      </main>
    );
  }

  const directionLabel = direction === "in" ? "Attendance in" : "Attendance out";
  const isGuest = !user;

  function handleStudentChange(event) {
    const { name, value } = event.target;
    setGuestStudent((current) => ({ ...current, [name]: value }));
  }

  async function submitAttendance(event) {
    event.preventDefault();
    if (submitting || !selfie) return;

    setSubmitting(true);
    setError("");

    try {
      const photo = await selfieFile(selfie);
      const result = isGuest
        ? direction === "in"
          ? await guestCheckIn({ qrToken: token, selfie: photo, student })
          : await guestCheckOut({ qrToken: token, selfie: photo, student })
        : direction === "in"
          ? await checkIn(user, { qrToken: token, selfie: photo })
          : await checkOut(user, { qrToken: token, selfie: photo });

      setReceipt({
        event: result.eventTitle,
        time: direction === "in" ? result.timeIn : result.timeOut,
        direction,
        student: result.student ?? student,
        selfie,
        status: result.status,
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  const requiredFieldsComplete = Object.values(student).every((value) => value.trim());

  return (
    <main style={{ width: "min(100% - 32px, 680px)", margin: "32px auto" }}>
      <PageHeader
        eyebrow="Event attendance"
        title={directionLabel}
        subtitle={
          isGuest
            ? "Enter the details used for your event registration, then take a selfie."
            : "Review your registered details and take a selfie before submitting attendance."
        }
      />

      <form className="attendance__form" onSubmit={submitAttendance}>
        <Card title={isGuest ? "Student information" : "Your registered information"}>
          {profileError && <Notice tone="danger">{profileError.message}</Notice>}
          {isGuest ? (
            <div className="attendance__form">
              <FormField
                id="studentId"
                name="studentId"
                label="Student ID"
                placeholder="2026-12345"
                value={student.studentId}
                onChange={handleStudentChange}
                required
              />
              <FormField
                id="studentName"
                name="name"
                label="Full name"
                placeholder="Enter your registered full name"
                value={student.name}
                onChange={handleStudentChange}
                required
              />
              <FormField
                id="studentEmail"
                name="email"
                type="email"
                label="School email"
                placeholder="student@school.edu.ph"
                value={student.email}
                onChange={handleStudentChange}
                required
              />
              <FormField
                id="course"
                name="course"
                label="Course"
                placeholder="Enter your registered course"
                value={student.course}
                onChange={handleStudentChange}
                required
              />
              <FormField
                id="yearLevel"
                name="yearLevel"
                label="Year level"
                placeholder="e.g. 1st Year"
                value={student.yearLevel}
                onChange={handleStudentChange}
                required
              />
            </div>
          ) : (
            <div className="attendance__form">
              <p><strong>Student ID:</strong> {student.studentId || "Not set in your account"}</p>
              <p><strong>Full name:</strong> {student.name}</p>
              <p><strong>School email:</strong> {student.email}</p>
              <p><strong>Course:</strong> {student.course || "Not set"}</p>
              <p><strong>Year level:</strong> {student.yearLevel || "Not set"}</p>
              {!requiredFieldsComplete && (
                <Notice tone="warning">
                  Complete your student profile before submitting attendance.
                </Notice>
              )}
            </div>
          )}
        </Card>

        <Card title="Take your attendance selfie">
          <p>Allow camera access and capture a clear photo before submitting.</p>
          <SelfieCapture onCapture={setSelfie} />
        </Card>

        {error && <Notice tone="danger">{error}</Notice>}
        <Button
          type="submit"
          className="btn--block"
          disabled={submitting || !selfie || !requiredFieldsComplete}
        >
          {submitting ? "Submitting attendance..." : `Submit ${directionLabel}`}
        </Button>
      </form>

      {receipt && (
        <Modal title="Attendance receipt" onClose={() => setReceipt(null)} maxWidth={560}>
          <div className="attendance__form">
            <p><strong>Event:</strong> {receipt.event}</p>
            <p><strong>Attendance:</strong> {directionLabel}</p>
            <p><strong>Date and time:</strong> {formatShortDateTime(receipt.time)}</p>
            <p><strong>Student ID:</strong> {receipt.student.studentId}</p>
            <p><strong>Full name:</strong> {receipt.student.name}</p>
            <p><strong>School email:</strong> {receipt.student.email}</p>
            <p><strong>Course:</strong> {receipt.student.course || "—"}</p>
            <p><strong>Year level:</strong> {receipt.student.yearLevel || "—"}</p>
            <p><strong>Status:</strong> {receipt.status}</p>
            <img
              src={receipt.selfie}
              alt="Attendance selfie receipt"
              style={{ width: "100%", maxWidth: 320, borderRadius: 12, alignSelf: "center" }}
            />
            <Button variant="outline" className="btn--block" onClick={() => setReceipt(null)}>
              Close receipt
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
