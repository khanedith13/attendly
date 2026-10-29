import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import EventCover from "../../components/EventCover";
import LoadingBlock from "../../components/LoadingBlock";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import Pill from "../../components/Pill";
import StatCard from "../../components/StatCard";
import TicketModal from "../../components/TicketModal";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import {
  cancelRegistration,
  getMyRegistrations,
  registerForEvent,
} from "../../services/studentService";
import { formatDate, formatEventWhen, formatShortDateTime } from "../../utils/format";
import "./Registrations.css";

const filters = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "attended", label: "Attended" },
  { value: "cancelled", label: "Cancelled" },
];

const attendanceTone = { present: "success", late: "warning", absent: "danger" };
const attendanceLabel = { present: "Present", late: "Late", absent: "Absent" };

const pastColumns = [
  { key: "event", header: "Event", bold: true },
  { key: "date", header: "Date", render: (row) => formatDate(row.timeIn) },
  { key: "registered", header: "Registered on", render: (row) => formatShortDateTime(row.registeredAt) },
  {
    key: "attendance",
    header: "Attendance",
    render: (row) => (
      <Pill tone={attendanceTone[row.attendance]}>{attendanceLabel[row.attendance]}</Pill>
    ),
  },
];

function RegistrationCard({ item, cancelled, onTicket, onCancel, onRegisterAgain }) {
  return (
    <Card>
      <div className="reg-card__cover">
        <EventCover tone={item.tone} height={72} />
      </div>
      <Pill tone={cancelled ? "danger" : "success"}>{cancelled ? "Cancelled" : "Registered"}</Pill>
      <h3 className="reg-card__title">{item.title}</h3>
      <p className="reg-card__meta">
        {formatEventWhen(item.startsAt)}
        <br />
        {item.venue} • {item.campus}
      </p>
      <div className="reg-card__actions">
        {cancelled ? (
          <Button size="sm" onClick={() => onRegisterAgain(item)}>
            Register again
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={() => onTicket(item)}>
              View QR ticket
            </Button>
            <Button size="sm" variant="danger" onClick={() => onCancel(item)}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function MyRegistrations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => getMyRegistrations(user.id), [user.id]);
  const { data, loading, reload } = useAsyncData(load);

  const [filter, setFilter] = useState("all");
  const [ticket, setTicket] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const closeTicket = useCallback(() => setTicket(null), []);
  const closeCancel = useCallback(() => setCancelTarget(null), []);

  if (loading) return <LoadingBlock />;

  const { counts, upcoming, cancelled, past } = data;
  const showUpcoming = filter === "all" || filter === "upcoming";
  const showCancelled = filter === "all" || filter === "cancelled";
  const showPast = filter === "all" || filter === "attended";
  const nothingToShow =
    (!showUpcoming || upcoming.length === 0) &&
    (!showCancelled || cancelled.length === 0) &&
    (!showPast || past.length === 0);

  async function confirmCancel() {
    setBusy(true);
    try {
      await cancelRegistration(user, cancelTarget.id);
      setMessage({ tone: "success", text: `Registration for ${cancelTarget.title} was cancelled.` });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setBusy(false);
      setCancelTarget(null);
    }
  }

  async function registerAgain(item) {
    setMessage(null);
    try {
      await registerForEvent(user, item.eventId);
      setMessage({ tone: "success", text: `You are registered again for ${item.title}.` });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Registered events"
        title="My registrations"
        subtitle="View your event tickets, QR codes, and registration status."
        actions={<Button onClick={() => navigate("/student/events")}>+ Browse events</Button>}
      />

      <div className="grid-4">
        <StatCard value={counts.total} label="Total registered" icon="◷" tone="primary" />
        <StatCard value={counts.upcoming} label="Upcoming" icon="↗" tone="warning" />
        <StatCard value={counts.attended} label="Attended" icon="✓" tone="success" />
        <StatCard value={counts.cancelled} label="Cancelled" icon="◒" tone="info" />
      </div>

      <div className="reg-filters">
        {filters.map((item) => (
          <Chip key={item.value} active={filter === item.value} onClick={() => setFilter(item.value)}>
            {item.label}
          </Chip>
        ))}
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {showUpcoming && upcoming.length > 0 && (
        <div className="grid-3">
          {upcoming.map((item) => (
            <RegistrationCard
              key={item.id}
              item={item}
              onTicket={setTicket}
              onCancel={setCancelTarget}
            />
          ))}
        </div>
      )}

      {showCancelled && cancelled.length > 0 && (
        <div className="grid-3">
          {cancelled.map((item) => (
            <RegistrationCard key={item.id} item={item} cancelled onRegisterAgain={registerAgain} />
          ))}
        </div>
      )}

      {showPast && past.length > 0 && (
        <Card title="Past registrations">
          <DataTable columns={pastColumns} rows={past} />
        </Card>
      )}

      {nothingToShow && (
        <div className="empty-note">
          <p>No registrations here yet.</p>
          <Button size="sm" onClick={() => navigate("/student/events")}>
            Browse events
          </Button>
        </div>
      )}

      {ticket && <TicketModal registration={ticket} onClose={closeTicket} />}

      {cancelTarget && (
        <Modal title="Cancel registration?" onClose={closeCancel}>
          <p className="reg-confirm">
            You are about to cancel your registration for <b>{cancelTarget.title}</b>. Your QR
            ticket will stop working. You can register again later if seats are available.
          </p>
          <div className="reg-confirm__actions">
            <Button variant="outline" onClick={closeCancel}>
              Keep registration
            </Button>
            <Button variant="danger" disabled={busy} onClick={confirmCancel}>
              {busy ? "Cancelling..." : "Yes, cancel"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}