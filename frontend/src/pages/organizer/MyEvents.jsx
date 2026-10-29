import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import EventStatusPill from "../../components/EventStatusPill";
import LoadingBlock from "../../components/LoadingBlock";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import SearchInput from "../../components/SearchInput";
import StatCard from "../../components/StatCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { cancelEvent, listMyEvents, publishEvent } from "../../services/organizerService";
import { getDisplayStatus } from "../../utils/eventStatus";
import { formatEventWhen } from "../../utils/format";
import "./Organizer.css";

const filters = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => listMyEvents(user), [user]);
  const { data, loading, reload } = useAsyncData(load);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const closeCancel = useCallback(() => setCancelTarget(null), []);

  if (loading) return <LoadingBlock />;

  const withStatus = data.map((event) => ({ event, display: getDisplayStatus(event) }));
  const count = (...statuses) =>
    withStatus.filter((item) => statuses.includes(item.display)).length;

  const query = search.trim().toLowerCase();
  const rows = withStatus
    .filter((item) => filter === "all" || item.display === filter)
    .filter(
      ({ event }) =>
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query),
    )
    .map((item) => item.event);

  function goEdit(event) {
    navigate(`/organizer/events/${event.id}/edit`);
  }

  async function handlePublish(event) {
    setMessage(null);
    try {
      await publishEvent(user, event.id);
      setMessage({ tone: "success", text: `${event.title} is now published.` });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    }
  }

  async function confirmCancel() {
    setBusy(true);
    try {
      await cancelEvent(user, cancelTarget.id);
      setMessage({ tone: "success", text: `${cancelTarget.title} was cancelled.` });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setBusy(false);
      setCancelTarget(null);
    }
  }

  const columns = [
    { key: "title", header: "Event", bold: true },
    { key: "when", header: "Date & time", render: (row) => formatEventWhen(row.startsAt) },
    { key: "venue", header: "Venue" },
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
        if (display === "draft") {
          return (
            <div className="row-actions">
              <Button size="sm" variant="outline" onClick={() => goEdit(row)}>
                Edit
              </Button>
              <Button size="sm" onClick={() => handlePublish(row)}>
                Publish
              </Button>
            </div>
          );
        }
        if (display === "upcoming" || display === "live") {
          return (
            <div className="row-actions">
              <Button size="sm" variant="outline" onClick={() => goEdit(row)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => setCancelTarget(row)}>
                Cancel
              </Button>
            </div>
          );
        }
        return <span className="row-none">—</span>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Event management"
        title="My events"
        subtitle="Edit, publish, and track every event you have created."
        actions={
          <Button onClick={() => navigate("/organizer/events/create")}>+ Create event</Button>
        }
      />

      <div className="grid-4">
        <StatCard
          value={count("upcoming", "live", "closed")}
          label="Published"
          icon="▣"
          tone="primary"
        />
        <StatCard value={count("draft")} label="Drafts" icon="✎" tone="warning" />
        <StatCard value={count("closed")} label="Closed" icon="✓" tone="success" />
        <StatCard value={count("cancelled")} label="Cancelled" icon="✕" tone="info" />
      </div>

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search event title or venue"
        />
        {filters.map((item) => (
          <Chip
            key={item.value}
            active={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card>
        <DataTable columns={columns} rows={rows} empty="No events match your filters." />
      </Card>

      {cancelTarget && (
        <Modal title="Cancel event?" onClose={closeCancel}>
          <p className="confirm-text">
            You are about to cancel <b>{cancelTarget.title}</b>. Students will no longer see it, and
            their QR tickets for it will stop working. This cannot be undone.
          </p>
          <div className="confirm-actions">
            <Button variant="outline" onClick={closeCancel}>
              Keep event
            </Button>
            <Button variant="danger" disabled={busy} onClick={confirmCancel}>
              {busy ? "Cancelling..." : "Yes, cancel event"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
