import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import QrCard from "../../components/QrCard";
import SelectField from "../../components/SelectField";
import TextareaField from "../../components/TextareaField";
import ToggleTile from "../../components/ToggleTile";
import TopbarPortal from "../../components/TopbarPortal";
import { eventCategories } from "../../config/events";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarNone } from "../../hooks/useTopbarBadge";
import { createEvent, getEventForEdit, updateEvent } from "../../services/organizerService";
import { firstErrors } from "../../utils/apiErrors";
import { toDateInput, toTimeInput } from "../../utils/dates";
import { getDisplayStatus } from "../../utils/eventStatus";
import { validateEvent } from "../../utils/eventValidation";
import "./EventForm.css";

const emptyValues = {
  title: "",
  category: "",
  capacity: "",
  date: "",
  startTime: "",
  endTime: "",
  venue: "",
  description: "",
  requireSchoolGmail: true,
  sendConfirmation: true,
};

function valuesFromEvent(event) {
  return {
    title: event.title,
    category: event.category,
    capacity: String(event.capacity),
    date: toDateInput(event.startsAt),
    startTime: toTimeInput(event.startsAt),
    endTime: toTimeInput(event.endsAt),
    venue: [event.venue, event.campus].filter(Boolean).join(", "),
    description: event.description ?? "",
    requireSchoolGmail: event.requireSchoolGmail,
    sendConfirmation: event.sendConfirmation,
  };
}

export default function CreateEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = useCallback(
    () => (id ? getEventForEdit(user, Number(id)) : Promise.resolve(null)),
    [id, user],
  );
  const { data: event, loading, error } = useAsyncData(load);

  const [edits, setEdits] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newCodes] = useState(() => ({ in: crypto.randomUUID(), out: crypto.randomUUID() }));
  const [refreshedCodes, setRefreshedCodes] = useState(null);

  useTopbarNone();

  if (loading) return <LoadingBlock />;

  if (error) {
    return (
      <div className="empty-note">
        <p>{error.message}</p>
        <Button size="sm" onClick={() => navigate("/organizer/events")}>
          Back to My events
        </Button>
      </div>
    );
  }

  const isEdit = Boolean(event);
  const display = event ? getDisplayStatus(event) : "draft";

  if (display === "closed" || display === "cancelled") {
    return (
      <div className="empty-note">
        <p>This event is {display} and can no longer be edited.</p>
        <Button size="sm" onClick={() => navigate("/organizer/events")}>
          Back to My events
        </Button>
      </div>
    );
  }

  const isPublished = isEdit && event.status === "published";
  const values = { ...(event ? valuesFromEvent(event) : emptyValues), ...edits };
  const codes = refreshedCodes ?? (event ? { in: event.qrIn, out: event.qrOut } : newCodes);

  function setField(name, value) {
    setEdits((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  }

  function handleChange(changeEvent) {
    setField(changeEvent.target.name, changeEvent.target.value);
  }

  // mode: "draft" | "publish" | "save"
  async function handleSave(mode) {
    const publish = mode === "publish";
    const found = validateEvent(values, {
      publish: publish || isPublished,
      minCapacity: event?.registered ?? 0,
    });

    if (Object.keys(found).length > 0) {
      setErrors({ ...found, form: "Please fix the highlighted fields." });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const payload = { ...values, qrIn: codes.in, qrOut: codes.out };
      if (isEdit) await updateEvent(user, event.id, payload, { publish });
      else await createEvent(user, payload, { publish });

      const text = publish
        ? `${values.title.trim()} was published.`
        : mode === "draft"
          ? `${values.title.trim()} was saved as a draft.`
          : `${values.title.trim()} was updated.`;
      navigate("/organizer/events", { state: { notice: text } });
    } catch (saveError) {
      setErrors({
        ...firstErrors(saveError.errors),
        form: saveError.status === 422 ? "Please fix the highlighted fields." : saveError.message,
      });
      setSaving(false);
    }
  }

  const primaryMode = isPublished ? "save" : "publish";
  const primaryLabel = isPublished ? "Save changes" : "Publish event";

  return (
    <>
      {!isPublished && (
        <TopbarPortal>
          <Button variant="outline" disabled={saving} onClick={() => handleSave("draft")}>
            Save draft
          </Button>
        </TopbarPortal>
      )}

      <PageHeader
        eyebrow="Event setup"
        title={isEdit ? "Edit event" : "Create an event"}
        subtitle="Publish complete event details, registration rules, and attendance QR codes."
        actions={
          <Button disabled={saving} onClick={() => handleSave(primaryMode)}>
            {saving ? "Saving..." : primaryLabel}
          </Button>
        }
      />

      {errors.form && <Notice>{errors.form}</Notice>}

      <div className="event-form">
        <Card title="Event details">
          <form
            className="event-form__fields"
            noValidate
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              handleSave(primaryMode);
            }}
          >
            <FormField
              id="title"
              name="title"
              label="Event title"
              value={values.title}
              onChange={handleChange}
              error={errors.title}
            />

            <div className="event-form__row">
              <SelectField
                id="category"
                name="category"
                label="Category"
                value={values.category}
                onChange={handleChange}
                error={errors.category}
              >
                <option value="">Select a category</option>
                {eventCategories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </SelectField>
              <FormField
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                label="Capacity"
                hint={event ? `${event.registered} students registered so far.` : undefined}
                value={values.capacity}
                onChange={handleChange}
                error={errors.capacity}
              />
            </div>

            <div className="event-form__row event-form__row--3">
              <FormField
                id="date"
                name="date"
                type="date"
                label="Date"
                value={values.date}
                onChange={handleChange}
                error={errors.date}
              />
              <FormField
                id="startTime"
                name="startTime"
                type="time"
                label="Start time"
                value={values.startTime}
                onChange={handleChange}
                error={errors.startTime}
              />
              <FormField
                id="endTime"
                name="endTime"
                type="time"
                label="End time"
                value={values.endTime}
                onChange={handleChange}
                error={errors.endTime}
              />
            </div>

            <FormField
              id="venue"
              name="venue"
              label="Venue"
              placeholder="Innovation Hall, Main Campus"
              value={values.venue}
              onChange={handleChange}
              error={errors.venue}
            />

            <TextareaField
              id="description"
              name="description"
              label="Short description"
              maxLength={1000}
              value={values.description}
              onChange={handleChange}
              error={errors.description}
            />

            <div className="event-form__divider" />
            <h3 className="event-form__section">Registration settings</h3>
            <div className="event-form__tiles">
              <ToggleTile
                title="Require school Gmail"
                description="Verified campus accounts only"
                checked={values.requireSchoolGmail}
                onChange={(value) => setField("requireSchoolGmail", value)}
              />
              <ToggleTile
                title="Send confirmation email"
                description="Receipt after successful registration"
                checked={values.sendConfirmation}
                onChange={(value) => setField("sendConfirmation", value)}
              />
            </div>
          </form>
        </Card>

        <Card title="Attendance QR codes">
          <p className="qr-note">
            Generate separate codes for arrival and departure. Each code is tied to this event and
            can be refreshed at any time.
          </p>

          <div className="qr-grid">
            <QrCard
              label="Attendance in"
              value={`attendly:in:${codes.in}`}
              filename="attendance-in-qr.png"
            />
            <QrCard
              label="Attendance out"
              value={`attendly:out:${codes.out}`}
              filename="attendance-out-qr.png"
            />
          </div>

          <div className="qr-refresh">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setRefreshedCodes({ in: crypto.randomUUID(), out: crypto.randomUUID() })
              }
            >
              Refresh codes
            </Button>
          </div>

          <div className="qr-info">
            <div>
              <span>QR expiration</span>
              <b>Event end time</b>
            </div>
            <div>
              <span>Scanner protection</span>
              <b>One scan / session</b>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
