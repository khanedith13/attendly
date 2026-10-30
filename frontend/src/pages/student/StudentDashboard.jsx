import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import DataTable from "../../components/DataTable";
import EventCover from "../../components/EventCover";
import LoadingBlock from "../../components/LoadingBlock";
import PageHeader from "../../components/PageHeader";
import Pill from "../../components/Pill";
import StatCard from "../../components/StatCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { getDashboard } from "../../services/studentService";
import { formatDate, formatTime, getGreeting, isToday } from "../../utils/format";
import "./StudentDashboard.css";

const columns = [
  { key: "event", header: "Event", bold: true },
  { key: "date", header: "Date", render: (row) => formatDate(row.timeIn) },
  { key: "in", header: "Check in", render: (row) => formatTime(row.timeIn) },
  {
    key: "out",
    header: "Check out",
    render: (row) => (row.timeOut ? formatTime(row.timeOut) : "—"),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Pill tone={row.timeOut ? "success" : "info"}>
        {row.timeOut ? "Completed" : "In progress"}
      </Pill>
    ),
  },
];

function NextEvent({ event, onBrowse }) {
  if (!event) {
    return (
      <Card title="Next registered event">
        <div className="empty-note">
          <p>No upcoming registrations yet.</p>
          <Button size="sm" onClick={onBrowse}>
            Browse events
          </Button>
        </div>
      </Card>
    );
  }

  const when = isToday(event.startsAt) ? "Today" : formatDate(event.startsAt);

  return (
    <Card title="Next registered event">
      <div className="next-event">
        <EventCover />
        <div className="next-event__body">
          <div className="next-event__when">
            {when} • {formatTime(event.startsAt)}
          </div>
          <h4 className="next-event__title">{event.title}</h4>
          <div className="next-event__meta">
            {formatVenue(event)}
          </div>
        </div>
        <div className="next-event__foot">
          <Pill tone="success">Registered</Pill>
          <span>
            Seat {event.seat} / {event.capacity}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = useCallback(() => getDashboard(user.id), [user.id]);
  const { data, loading } = useAsyncData(load);

  if (loading) return <LoadingBlock />;

  const { stats, nextEvent, recent } = data;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={getGreeting()}
        title={`${firstName}, ready for today?`}
        subtitle="Track attendance, discover campus events, and keep your records up to date."
        actions={<Button onClick={() => navigate("/student/events")}>+ Browse events</Button>}
      />

      <div className="grid-4">
        <StatCard value={stats.attended} label="Events attended" icon="✓" tone="primary" />
        <StatCard value={`${stats.rate}%`} label="Attendance rate" icon="↗" tone="success" />
        <StatCard value={stats.upcoming} label="Upcoming events" icon="◷" tone="warning" />
        <StatCard value={stats.hours} label="Hours this month" icon="◒" tone="info" />
      </div>

      <div className="grid-2">
        <Card title="Quick attendance" action={<Pill tone="success">System online</Pill>}>
          <div className="quick">
            <div className="quick__tile">
              <div className="quick__icon quick__icon--primary">⌗</div>
              <h4>Attendance In</h4>
              <p>Scan the event QR code when you arrive.</p>
              <Button size="sm" onClick={() => navigate("/student/attendance-in")}>
                Scan QR
              </Button>
            </div>
            <div className="quick__tile">
              <div className="quick__icon quick__icon--info">↗</div>
              <h4>Attendance Out</h4>
              <p>Scan when you leave or enter your details manually.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/student/attendance-out")}
              >
                Check out
              </Button>
            </div>
          </div>
        </Card>

        <NextEvent event={nextEvent} onBrowse={() => navigate("/student/events")} />
      </div>

      <Card
        title="Recent attendance"
        action={
          <Link to="/student/registrations" className="link-muted">
            View all →
          </Link>
        }
      >
        <DataTable columns={columns} rows={recent} empty="No attendance records yet." />
      </Card>
    </>
  );
}
