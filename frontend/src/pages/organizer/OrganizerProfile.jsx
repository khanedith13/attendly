import { useCallback, useState } from "react";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import Pill from "../../components/Pill";
import SettingRow from "../../components/SettingRow";
import Switch from "../../components/Switch";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { getOrganizerProfile, saveOrganizerProfile } from "../../services/organizerService";
import { firstErrors } from "../../utils/apiErrors";
import { validateOrganizerProfile } from "../../utils/organizerValidation";
import { getInitials } from "../../utils/roles";
import "./OrganizerProfile.css";

export default function OrganizerProfile() {
  const { user, refreshUser } = useAuth();
  const load = useCallback(() => getOrganizerProfile(user), [user]);
  const { data, loading, reload } = useAsyncData(load);

  const [edits, setEdits] = useState({});
  const [notifEdits, setNotifEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState(null);
  const [logoError, setLogoError] = useState("");

  if (loading) return <LoadingBlock />;

  const values = {
    name: user.name,
    organizationName: data.organizationName,
    contactNumber: data.contactNumber,
    ...edits,
  };
  const notifications = { ...data.notifications, ...notifEdits };

  function handleChange(event) {
    const { name, value } = event.target;
    setEdits((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setMessage(null);
  }

  function handleDiscard() {
    setEdits({});
    setNotifEdits({});
    setErrors({});
    setMessage(null);
  }

  async function handleSave() {
    const found = validateOrganizerProfile(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setMessage(null);
    try {
      await saveOrganizerProfile(user, { ...values, notifications });
      await refreshUser();
      reload();
      setMessage({ tone: "success", text: "Your changes were saved." });
    } catch (error) {
      setErrors(firstErrors(error.errors));
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  function handleLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setLogoError("Use a JPG or PNG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("The image must be 5 MB or smaller.");
      return;
    }

    if (logo) URL.revokeObjectURL(logo);
    setLogoError("");
    setLogo(URL.createObjectURL(file));
  }

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Organizer profile"
        subtitle="Manage your organization details and contact information."
        actions={
          <>
            <Button variant="outline" onClick={handleDiscard}>
              Discard
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </>
        }
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="org-grid">
        <Card>
          <div className="org-photo">
            <Avatar initials={getInitials(values.organizationName)} size={72} src={logo} />
            <h3 className="org-name">{values.organizationName || "Your organization"}</h3>
            <p className="org-email">{user.email}</p>
            <Pill tone="success">Approved organizer</Pill>
            <p className="org-stats">
              {data.stats.events} events • {data.stats.registrations.toLocaleString()} registrations
            </p>
            <label className="btn btn--outline btn--md btn--block org-upload">
              Upload logo
              <input type="file" accept="image/png,image/jpeg" onChange={handleLogo} hidden />
            </label>
            {logoError && <Notice>{logoError}</Notice>}
          </div>
        </Card>

        <div className="org-stack">
          <Card title="Organization details">
            <div className="org-fields">
              <FormField
                id="organizationName"
                name="organizationName"
                label="Organization name"
                value={values.organizationName}
                onChange={handleChange}
                error={errors.organizationName}
              />
              <FormField
                id="contactNumber"
                name="contactNumber"
                label="Contact number"
                placeholder="+63 917 123 4567"
                value={values.contactNumber}
                onChange={handleChange}
                error={errors.contactNumber}
              />
              <FormField
                id="name"
                name="name"
                label="Contact person"
                value={values.name}
                onChange={handleChange}
                error={errors.name}
                autoComplete="name"
              />
              <FormField
                id="email"
                name="email"
                type="email"
                label="School Gmail"
                value={user.email}
                readOnly
              />
            </div>
          </Card>

          <Card title="Notifications">
            <SettingRow title="New registrations" description="Alert me when students register">
              <Switch
                checked={notifications.registrations}
                label="New registrations"
                onChange={(value) => setNotifEdits((prev) => ({ ...prev, registrations: value }))}
              />
            </SettingRow>
            <SettingRow title="Capacity warnings" description="Notify at 90% capacity">
              <Switch
                checked={notifications.capacity}
                label="Capacity warnings"
                onChange={(value) => setNotifEdits((prev) => ({ ...prev, capacity: value }))}
              />
            </SettingRow>
            <SettingRow title="Daily summary" description="Email digest of attendance" last>
              <Switch
                checked={notifications.daily}
                label="Daily summary"
                onChange={(value) => setNotifEdits((prev) => ({ ...prev, daily: value }))}
              />
            </SettingRow>
          </Card>
        </div>
      </div>
    </>
  );
}
