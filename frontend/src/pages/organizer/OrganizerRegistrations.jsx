import { useCallback, useState } from "react";
import AccentNote from "../../components/AccentNote";
import Button from "../../components/Button";
import Card from "../../components/Card";
import DataTable from "../../components/DataTable";
import InlineSelect from "../../components/InlineSelect";
import LoadingBlock from "../../components/LoadingBlock";
import MiniStat from "../../components/MiniStat";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import PersonCell from "../../components/PersonCell";
import Pill from "../../components/Pill";
import SearchInput from "../../components/SearchInput";
import SelectField from "../../components/SelectField";
import TextareaField from "../../components/TextareaField";
import TopbarPortal from "../../components/TopbarPortal";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarNone } from "../../hooks/useTopbarBadge";
import { getRegistrations, sendReminder } from "../../services/organizerService";
import { registrationMeta } from "../../utils/attendance";
import { downloadCsv } from "../../utils/csv";
import { firstErrors } from "../../utils/apiErrors";
import { formatShortDateTime } from "../../utils/format";
import "./Roster.css";

const PAGE_SIZE = 10;

const columns = [
  { key: "name", header: "Registrant", render: (row) => <PersonCell name={row.name} /> },
  { key: "studentId", header: "Student ID" },
  { key: "course", header: "Course" },
  { key: "eventTitle", header: "Event" },
  { key: "registered", header: "Registered on", render: (row) => formatShortDateTime(row.registeredAt) },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Pill tone={registrationMeta[row.status].tone}>{registrationMeta[row.status].label}</Pill>
    ),
  },
];

function ReminderModal({ events, onClose, onSent }) {
  const { user } = useAuth();
  const [eventId, setEventId] = useState("all");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    setSending(true);
    setErrors({});
    try {
      const result = await sendReminder(user, {
        eventId: eventId === "all" ? null : Number(eventId),
        message,
      });
      onSent(result.count);
    } catch (error) {
      setErrors({
        ...firstErrors(error.errors),
        form: error.status === 422 ? undefined : error.message,
      });
      setSending(false);
    }
  }

  return (
    <Modal title="Send reminder" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 14 }}>
        <SelectField
          id="reminderEvent"
          label="Send to"
          value={eventId}
          onChange={(changeEvent) => setEventId(changeEvent.target.value)}
        >
          <option value="all">All upcoming events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </SelectField>

        <TextareaField
          id="reminderMessage"
          label="Message"
          maxLength={500}
          placeholder="Remind students about the venue, time, or what to bring."
          value={message}
          onChange={(changeEvent) => {
            setMessage(changeEvent.target.value);
            setErrors({});
          }}
          error={errors.message}
        />

        {errors.form && <Notice>{errors.form}</Notice>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send reminder"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OrganizerRegistrations() {
  const { user } = useAuth();
  const load = useCallback(() => getRegistrations(user), [user]);
  const { data, loading } = useAsyncData(load);

  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState("all");
  const [page, setPage] = useState(1);
  const [showReminder, setShowReminder] = useState(false);
  const [message, setMessage] = useState(null);

  const closeReminder = useCallback(() => setShowReminder(false), []);
  useTopbarNone();

  if (loading) return <LoadingBlock />;

  const { events, rows, upcoming } = data;

  const scoped = rows.filter((row) => eventId === "all" || row.eventId === Number(eventId));
  const query = search.trim().toLowerCase();
  const matches = scoped.filter(
    (row) =>
      !query ||
      [row.name, row.studentId, row.email, row.course].some((field) =>
        field.toLowerCase().includes(query),
      ),
  );

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function exportList() {
    downloadCsv(
      "upcoming-registrations.csv",
      ["Registrant", "Student ID", "Course", "Event", "Registered on", "Status"],
      matches.map((row) => [
        row.name,
        row.studentId,
        row.course,
        row.eventTitle,
        formatShortDateTime(row.registeredAt),
        registrationMeta[row.status].label,
      ]),
    );
  }

  return (
    <>
      <TopbarPortal>
        <Button variant="outline" onClick={() => setShowReminder(true)}>
          Send reminder
        </Button>
      </TopbarPortal>

      <PageHeader
        eyebrow="Registration pipeline"
        title="Upcoming registrations"
        subtitle="See who registered for upcoming events and review their complete details."
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card>
        <div className="roster-toolbar">
          <SearchInput
            value={search}
            onChange={(changeEvent) => {
              setSearch(changeEvent.target.value);
              setPage(1);
            }}
            placeholder="Search by name, ID, email, or course"
          />
          <div className="roster-toolbar__right">
            <InlineSelect
              label="Event"
              width={190}
              value={eventId}
              options={[
                { value: "all", label: "All upcoming events" },
                ...events.map((event) => ({ value: event.id, label: event.title })),
              ]}
              onChange={(changeEvent) => {
                setEventId(changeEvent.target.value);
                setPage(1);
              }}
            />
            <Button disabled={matches.length === 0} onClick={exportList}>
              Export list
            </Button>
          </div>
        </div>

        <div className="roster-tiles roster-tiles--3">
          <MiniStat label="Upcoming events" value={upcoming} />
          <MiniStat
            label="Total registrations"
            value={scoped.filter((row) => row.status === "registered").length.toLocaleString()}
          />
          <MiniStat
            label="Waiting list"
            value={scoped.filter((row) => row.status === "waitlisted").length.toLocaleString()}
          />
        </div>

        <div className="roster-note" />
        <DataTable columns={columns} rows={visible} empty="No registrations match your search." />
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={matches.length}
          onChange={setPage}
          noun="registrations"
        />

        <div className="roster-note">
          <AccentNote>
            Organizer can use this list for event preparation, reminder messages, and capacity
            monitoring. Personal details are visible only to authorized organizers.
          </AccentNote>
        </div>
      </Card>

      {showReminder && (
        <ReminderModal
          events={events}
          onClose={closeReminder}
          onSent={(count) => {
            setShowReminder(false);
            setMessage({
              tone: "success",
              text: `Reminder sent to ${count.toLocaleString()} registered students.`,
            });
          }}
        />
      )}
    </>
  );
}