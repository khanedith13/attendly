import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import DataTable from "../../components/DataTable";
import EventStatusPill from "../../components/EventStatusPill";
import LoadingBlock from "../../components/LoadingBlock";
import MeterRow from "../../components/MeterRow";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { getOrganizerDashboard } from "../../services/organizerService";
import { downloadCsv } from "../../utils/csv";
import { getDisplayStatus, statusMeta } from "../../utils/eventStatus";
import { formatDay, formatEventWhen, percent } from "../../utils/format";
import "./Organizer.css";

const rateOf = (event) => (event.registered > 0 ? `${percent(event.checkedIn, event.registered)}%` : "—");

const columns = [
  { key: "title", header: "Event", bold: true },
  { key: "date", header: "Date", render: (row) => formatDay(row.startsAt) },
  { key: "registered", header: "Registered" },
  { key: "checkedIn", header: "Checked in" },
  { key: "rate", header: "Rate", render: rateOf },
  { key: "status", header: "Status", render: (row) => <EventStatusPill event={row} /> },
  {
    key: "more",
    header: "",
    render: (row) => (
      <Link to={`/organizer/events/${row.id}/edit`} className="row-more" aria-label="Manage event">
        ⋯
      </Link>
    ),
  },
];

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => getOrganizerDashboard(user), [user]);
  const { data, loading } = useAsyncData(load);

  if (loading) return <LoadingBlock />;

  const { stats, performance, upcoming, recent } = data;

  function exportCsv() {
    downloadCsv(
      "recent-events.csv",
      ["Event", "Date", "Registered", "Checked in", "Rate", "Status"],
      recent.map((event) => [
        event.title,
        formatDay(event.startsAt),
        event.registered,
        event.checkedIn,
        rateOf(event),
        statusMeta[getDisplayStatus(event)].label,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Event operations"
        title="Organizer dashboard"
        subtitle="Create events, monitor registration, and manage attendance in one place."
        actions={<Button onClick={() => navigate("/organizer/events/create")}>+ Create event</Button>}
      />

      <div className="grid-4">
        <StatCard value={stats.published} label="Published events" icon="▣" tone="primary" />
        <StatCard value={stats.registrations.toLocaleString()} label="Registrations" icon="◷" tone="info" />
        <StatCard value={stats.checkedIn.toLocaleString()} label="Checked in" icon="✓" tone="success" />
        <StatCard value={`${stats.showUpRate}%`} label="Show-up rate" icon="↗" tone="warning" />
      </div>

      <div className="grid-2">
        <Card title="Attendance performance" action={<span className="card-note">This month</span>}>
          {performance ? (
            <div className="perf">
              <div className="perf__rate">{performance.rate}%</div>
              <div className="perf__bars">
                <MeterRow
                  label="Check-ins"
                  value={performance.checkedIn.toLocaleString()}
                  percent={performance.rate}
                />
                <MeterRow
                  label="No-show"
                  value={performance.noShow.toLocaleString()}
                  percent={100 - performance.rate}
                  tone="neutral"
                />
              </div>
            </div>
          ) : (
            <p className="empty-note">No attendance data yet. It appears once an event has started.</p>
          )}
        </Card>

        <Card
          title="Upcoming events"
          action={
            <Link to="/organizer/events" className="link-muted">
              View all →
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <p className="empty-note">No upcoming events.</p>
          ) : (
            <ul className="up-list">
              {upcoming.map((event) => (
                <li key={event.id} className="up-item">
                  <div>
                    <div className="up-item__title">{event.title}</div>
                    <div className="up-item__meta">{formatEventWhen(event.startsAt)}</div>
                  </div>
                  <EventStatusPill event={event} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Recent events"
        action={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={recent.length === 0}>
            Export CSV
          </Button>
        }
      >
        <DataTable columns={columns} rows={recent} empty="No events have started yet." />
      </Card>
    </>
  );
}