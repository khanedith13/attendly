import { useState } from "react";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import SettingRow from "../../components/SettingRow";
import Switch from "../../components/Switch";
import { settingsTabs } from "../../config/settings";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { getSettings, saveSettings } from "../../services/adminService";
import { firstErrors } from "../../utils/apiErrors";
import { validateSettings } from "../../utils/settingsValidation";
import "./Admin.css";

function LaterTag() {
  return <span className="later-tag">Backend later</span>;
}

export default function AdminSettings() {
  const { user: admin } = useAuth();
  const { data, loading, reload } = useAsyncData(getSettings);

  const [tab, setTab] = useState("general");
  const [edits, setEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingBlock />;

  const values = { ...data, ...edits };
  const dirty = Object.entries(edits).some(([key, value]) => String(value) !== String(data[key]));
  const active = settingsTabs.find((item) => item.id === tab);

  function setField(key, value) {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setMessage(null);
  }

  async function handleSave() {
    const found = validateSettings(values);
    setErrors(found);

    const firstKey = Object.keys(found)[0];
    if (firstKey) {
      // Jump to the tab that holds the first problem.
      const target = settingsTabs.find((item) =>
        item.sections.some((section) => section.fields.some((field) => field.key === firstKey)),
      );
      if (target) setTab(target.id);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const result = await saveSettings(admin, values);
      reload();
      setMessage({
        tone: "success",
        text:
          result.changed === 0 ? "Nothing changed." : `Settings saved (${result.changed} changed).`,
      });
    } catch (error) {
      setErrors(firstErrors(error.errors));
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Settings"
        subtitle="Configure registration, attendance rules, and security."
        actions={
          <>
            <Button
              variant="outline"
              disabled={!dirty}
              onClick={() => {
                setEdits({});
                setErrors({});
                setMessage(null);
              }}
            >
              Reset
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </>
        }
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="settings-grid">
        <Card className="settings-nav">
          {settingsTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === tab ? "settings-tab settings-tab--active" : "settings-tab"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </Card>

        <div className="settings-stack">
          {active.sections.map((section) => {
            const inputs = section.fields.filter((field) => field.type !== "switch");
            const switches = section.fields.filter((field) => field.type === "switch");

            return (
              <Card key={section.title} title={section.title}>
                {inputs.length > 0 && (
                  <div className="settings-fields">
                    {inputs.map((field) => (
                      <FormField
                        key={field.key}
                        id={field.key}
                        name={field.key}
                        type={field.type}
                        label={
                          <>
                            {field.label}
                            {!field.live && <LaterTag />}
                          </>
                        }
                        hint={field.hint}
                        value={String(values[field.key])}
                        onChange={(event) => setField(field.key, event.target.value)}
                        error={errors[field.key]}
                      />
                    ))}
                  </div>
                )}

                {switches.map((field, index) => (
                  <SettingRow
                    key={field.key}
                    title={
                      <>
                        {field.label}
                        {!field.live && <LaterTag />}
                      </>
                    }
                    description={field.description}
                    last={index === switches.length - 1}
                  >
                    <Switch
                      checked={Boolean(values[field.key])}
                      label={field.label}
                      onChange={(value) => setField(field.key, value)}
                    />
                  </SettingRow>
                ))}
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
