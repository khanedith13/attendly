import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import FormField from "../../components/FormField";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import Pill from "../../components/Pill";
import SettingRow from "../../components/SettingRow";
import Switch from "../../components/Switch";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarNone } from "../../hooks/useTopbarBadge";
import { getAccount, saveAccount, updatePassword } from "../../services/accountService";
import { formatDaysAgo } from "../../utils/format";
import { joinName, splitName } from "../../utils/names";
import { getInitials } from "../../utils/roles";
import { isStudentId } from "../../utils/validators";
import "./Account.css";

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const load = useCallback(() => getAccount(user.id), [user.id]);
  const { data, loading, reload } = useAsyncData(load);

  const [edits, setEdits] = useState({});
  const [notifEdits, setNotifEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const closePassword = useCallback(() => setShowPassword(false), []);
  useTopbarNone();

  if (loading) return <LoadingBlock />;

  // Start from the saved data, then overlay whatever the user has typed.
  const name = splitName(user.name);
  const values = {
    firstName: name.firstName,
    lastName: name.lastName,
    studentId: data.studentId,
    course: data.course,
    ...edits,
  };
  const notifications = { ...data.notifications, ...notifEdits };

  function handleChange(event) {
    const { name: field, value } = event.target;
    setEdits((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setMessage(null);
  }

  function validate() {
    const next = {};
    if (!values.firstName.trim()) next.firstName = "First name is required.";
    if (!values.lastName.trim()) next.lastName = "Last name is required.";
    if (!values.studentId.trim()) next.studentId = "Student ID is required.";
    else if (!isStudentId(values.studentId)) next.studentId = "Use the format 2026-10452.";
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setMessage(null);
    try {
      await saveAccount(user, {
        name: joinName(values.firstName, values.lastName),
        studentId: values.studentId.trim(),
        course: values.course.trim(),
        notifications,
      });
      await refreshUser();
      reload();
      setMessage({ tone: "success", text: "Your changes were saved." });
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again later
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoError("Use a JPG or PNG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("The image must be 5 MB or smaller.");
      return;
    }

    if (photo) URL.revokeObjectURL(photo);
    setPhotoError("");
    setPhoto(URL.createObjectURL(file));
  }

  async function handlePassword(passwords) {
    await updatePassword(user, passwords);
    setMessage({ tone: "success", text: "Password updated." });
    reload();
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="My account"
        subtitle="Manage your profile, contact details, and account security."
        actions={
          <Button type="submit" form="account-form" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        }
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="account-grid">
        <Card title="Profile picture">
          <div className="account-photo">
            <Avatar initials={getInitials(user.name)} size={70} src={photo} />
            <label className="btn btn--outline btn--md btn--block account-upload">
              Upload new photo
              <input type="file" accept="image/png,image/jpeg" onChange={handlePhoto} hidden />
            </label>
            <span className="account-hint">JPG or PNG • Max 5 MB</span>
            {photoError && <Notice>{photoError}</Notice>}
          </div>

          <div className="account-divider" />

          <h3 className="account-title">Account status</h3>
          <Pill tone="success">Verified school account</Pill>
        </Card>

        <Card>
          <form id="account-form" onSubmit={handleSubmit} noValidate>
            <h3 className="account-title">Personal information</h3>
            <div className="account-fields">
              <FormField
                id="firstName"
                name="firstName"
                label="First name"
                value={values.firstName}
                onChange={handleChange}
                error={errors.firstName}
                autoComplete="given-name"
              />
              <FormField
                id="lastName"
                name="lastName"
                label="Last name"
                value={values.lastName}
                onChange={handleChange}
                error={errors.lastName}
                autoComplete="family-name"
              />
              <FormField
                id="studentId"
                name="studentId"
                label="Student ID"
                placeholder="2026-10452"
                value={values.studentId}
                onChange={handleChange}
                error={errors.studentId}
              />
              <FormField
                id="course"
                name="course"
                label="Course / Program"
                value={values.course}
                onChange={handleChange}
              />
              <div className="account-fields__wide">
                <FormField
                  id="email"
                  name="email"
                  type="email"
                  label="School Gmail"
                  hint="Contact an administrator to change your school email."
                  value={user.email}
                  readOnly
                />
              </div>
            </div>

            <div className="account-divider" />

            <h3 className="account-title">Notifications</h3>
            <SettingRow title="Event registration reminders" description="Remind me before registered events">
              <Switch
                checked={notifications.reminders}
                label="Event registration reminders"
                onChange={(value) => setNotifEdits((prev) => ({ ...prev, reminders: value }))}
              />
            </SettingRow>
            <SettingRow
              title="Attendance confirmations"
              description="Send a receipt after check-in/out"
              last
            >
              <Switch
                checked={notifications.confirmations}
                label="Attendance confirmations"
                onChange={(value) => setNotifEdits((prev) => ({ ...prev, confirmations: value }))}
              />
            </SettingRow>

            <div className="account-divider" />

            <SettingRow
              title="Change password"
              description={`Last updated ${formatDaysAgo(data.passwordChangedAt)}`}
              last
            >
              <Button variant="outline" onClick={() => setShowPassword(true)}>
                Update password
              </Button>
            </SettingRow>
          </form>
        </Card>
      </div>

      <Card className="account-signout">
        <div>
          <h3 className="account-title">Sign out</h3>
          <p className="account-hint">End your current session on this device.</p>
        </div>
        <Button variant="danger" onClick={handleLogout}>
          Log out
        </Button>
      </Card>

      {showPassword && <ChangePasswordModal onSubmit={handlePassword} onClose={closePassword} />}
    </>
  );
}