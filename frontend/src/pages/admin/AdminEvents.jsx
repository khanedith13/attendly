import { useCallback, useState } from "react";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import EventStatusPill from "../../components/EventStatusPill";
import LoadingBlock from "../../components/LoadingBlock";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import SearchInput from "../../components/SearchInput";
import StatCard from "../../components/StatCard";
import TextareaField from "../../components/TextareaField";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { approveEvent, flagEvent, listAdminEvents } from "../../services/adminService";
import { firstErrors } from "../../utils/apiErrors";
import { downloadCsv } from "../../utils/csv";
import { getDisplayStatus, statusMeta } from "../../utils/eventStatus";
import { formatDay, formatEventWhen } from "../../utils/format";
import "./Admin.css";

const PAGE_SIZE = 10;

const filters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Awaiting approval" },
  { value: "flagged", label: "Flagged" },
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

function InspectModal({ event, display, onClose }) {
  return (
    <Modal title="Event details" onClose={onClose}>
      <dl className="inspect">
        <dt>Title</dt>
        <dd>{event.title}</dd>
        <dt>Organizer</dt>
        <dd>{event.organizer}</dd>
        <dt>When</dt>
        <dd>{formatEventWhen(event.startsAt)}</dd>
        <dt>Venue</dt>
        <dd>{event.venue}</dd>
        <dt>Category</dt>
        <dd>{event.category}</dd>
        <dt>Seats</dt>
        <dd>
          {event.registered} registered of {event.capacity}
        </dd>
        <dt>Status</dt>
        <dd>{statusMeta[display].label}</dd>
        {event.reviewNote && (
          <>
            <dt>Review note</dt>
            <dd>{event.reviewNote}</dd>
          </>
        )}
        <dt>Description</dt>
        <dd>{event.description || "No description provided."}</dd>
      </dl>
      <Button variant="outline" className="btn--block" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}

function FlagModal({ event, onSubmit, onClose }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    setSaving(true);
    try {
      await onSubmit(reason);
    } catch (caught) {
      setError(firstErrors(caught.errors).reason ?? caught.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Flag event" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 14 }}>
        <p className="confirm-text" style={{ margin: 0 }}>
          <b>{event.title}</b> will be hidden from students until you clear the flag.
        </p>
        <TextareaField
          id="reason"
          label="Reason"
          maxLength={200}
          value={reason}
          onChange={(changeEvent) => {
            setReason(changeEvent.target.value);
            setError("");
          }}
          error={error}
        />
        <div className="confirm-actions">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={saving}>
            {saving ? "Flagging..." : "Flag event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminEvents() {
  const { user: admin } = useAuth();
  const { data, loading, reload } = useAsyncData(listAdminEvents);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [inspect, setInspect] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [message, setMessage] = useState(null);

  const closeInspect = useCallback(() => setInspect(null), []);
  const closeFlag = useCallback(() => setFlagTarget(null), []);

  if (loading) return <LoadingBlock />;

  const withStatus = data.map((event) => ({ event, display: getDisplayStatus(event) }));
  const count = (...statuses) =>
    withStatus.filter((item) => statuses.includes(item.display)).length;

  const query = search.trim().toLowerCase();
  const matches = withStatus
    .filter((item) => filter === "all" || item.display === filter)
    .filter(
      ({ event }) =>
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.organizer.toLowerCase().includes(query),
    )
    .map((item) => item.event);

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function approve(event) {
    setMessage(null);
    try {
      await approveEvent(admin, event.id);
      const wasFlagged = event.review === "flagged";
      setMessage({
        tone: "success",
        text: wasFlagged
          ? `The flag on ${event.title} was cleared.`
          : `${event.title} was approved and is now visible to students.`,
      });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    }
  }

  async function submitFlag(reason) {
    await flagEvent(admin, flagTarget.id, reason);
    setMessage({
      tone: "success",
      text: `${flagTarget.title} was flagged and hidden from students.`,
    });
    setFlagTarget(null);
    reload();
  }

  function exportCsv() {
    downloadCsv(
      "events.csv",
      ["Event", "Organizer", "Date", "Registered", "Capacity", "Status"],
      matches.map((event) => [
        event.title,
        event.organizer,
        formatDay(event.startsAt),
        event.registered,
        event.capacity,
        statusMeta[getDisplayStatus(event)].label,
      ]),
    );
  }

  const columns = [
    { key: "title", header: "Event", bold: true },
    { key: "organizer", header: "Organizer" },
    { key: "date", header: "Date", render: (row) => formatDay(row.startsAt) },
    {
      key: "seats",
      header: "Registered / Capacity",
      render: (row) => `${row.registered} / ${row.capacity}`,
    },
    { key: "status", header: "Status", render: (row) => <EventStatusPill event={row} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const display = getDisplayStatus(row);
        return (
          <div className="row-actions">
            <Button size="sm" variant="outline" onClick={() => setInspect(row)}>
              Inspect
            </Button>
            {display === "pending" && (
              <Button size="sm" onClick={() => approve(row)}>
                Approve
              </Button>
            )}
            {display === "flagged" && (
              <Button size="sm" onClick={() => approve(row)}>
                Clear flag
              </Button>
            )}
            {(display === "upcoming" || display === "live") && (
              <Button size="sm" variant="danger" onClick={() => setFlagTarget(row)}>
                Flag
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Event moderation"
        title="Events"
        subtitle="Approve submissions, inspect flagged events, and monitor status."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={matches.length === 0}>
            Export CSV
          </Button>
        }
      />

      <div className="grid-4">
        <StatCard value={count("upcoming", "live")} label="Active events" icon="▣" tone="primary" />
        <StatCard value={count("pending")} label="Awaiting approval" icon="◷" tone="warning" />
        <StatCard value={count("flagged")} label="Flagged" icon="⚑" tone="info" />
        <StatCard value={count("cancelled")} label="Cancelled" icon="✕" tone="success" />
      </div>

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search event or organizer"
        />
        {filters.map((item) => (
          <Chip
            key={item.value}
            active={filter === item.value}
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card>
        <DataTable columns={columns} rows={visible} empty="No events match your filters." />
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={matches.length}
          onChange={setPage}
          noun="events"
        />
      </Card>

      {inspect && (
        <InspectModal event={inspect} display={getDisplayStatus(inspect)} onClose={closeInspect} />
      )}
      {flagTarget && <FlagModal event={flagTarget} onSubmit={submitFlag} onClose={closeFlag} />}
    </>
  );
}
