import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ActionBanner from "../../components/ActionBanner";
import Button from "../../components/Button";
import Card from "../../components/Card";
import DataTable from "../../components/DataTable";
import LoadingBlock from "../../components/LoadingBlock";
import PageHeader from "../../components/PageHeader";
import Pill from "../../components/Pill";
import SettingRow from "../../components/SettingRow";
import StatCard from "../../components/StatCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getAdminDashboard } from "../../services/adminService";
import { downloadCsv } from "../../utils/csv";
import { formatShortDateTime } from "../../utils/format";
import "./Admin.css";

const roleNames = { student: "Students", organizer: "Organizers", admin: "Admins" };

const roleColumns = [
  { key: "role", header: "Role", bold: true, render: (row) => roleNames[row.role] },
  { key: "active", header: "Active", render: (row) => row.active.toLocaleString() },
  { key: "pending", header: "Pending", render: (row) => row.pending.toLocaleString() },
  {
    key: "status",
    header: "Status",
    render: (row) =>
      row.pending > 0 ? <Pill tone="warning">Review</Pill> : <Pill tone="success">Healthy</Pill>,
  },
];

const activityColumns = [
  { key: "at", header: "Time", render: (row) => formatShortDateTime(row.at) },
  { key: "actor", header: "Actor" },
  { key: "action", header: "Action" },
  { key: "target", header: "Entity" },
  {
    key: "result",
    header: "Result",
    render: (row) =>
      row.result === "success" ? (
        <Pill tone="success">Success</Pill>
      ) : (
        <Pill tone="danger">Failed</Pill>
      ),
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data, loading } = useAsyncData(getAdminDashboard);

  if (loading) return <LoadingBlock />;

  const { stats, review, roles, activity } = data;

  const pending = [];
  if (review.organizers > 0) {
    pending.push(`${review.organizers} organizer application${review.organizers === 1 ? "" : "s"}`);
  }
  if (review.events > 0) {
    pending.push(`${review.events} event submission${review.events === 1 ? "" : "s"}`);
  }

  function generateReport() {
    downloadCsv("platform-report.csv", ["Metric", "Value"], [
      ["Total users", stats.users],
      ["Organizers", stats.organizers],
      ["Active events", stats.activeEvents],
      ...roles.map((row) => [`${roleNames[row.role]} (active)`, row.active]),
      ...roles.map((row) => [`${roleNames[row.role]} (pending)`, row.pending]),
    ]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Platform control"
        title="Admin dashboard"
        subtitle="Manage users, organizers, events, attendance data, and platform settings."
        actions={
          <Button variant="outline" onClick={generateReport}>
            Generate report
          </Button>
        }
      />

      {pending.length > 0 && (
        <ActionBanner
          title="Admin action center"
          text={`${pending.join(" and ")} require review.`}
          actionLabel="Review queue"
          onAction={() => navigate(review.organizers > 0 ? "/admin/organizers" : "/admin/events")}
        />
      )}

      <div className="grid-4">
        <StatCard value={stats.users.toLocaleString()} label="Total users" icon="◉" tone="primary" />
        <StatCard value={stats.organizers} label="Organizers" icon="✦" tone="info" />
        <StatCard value={stats.activeEvents} label="Active events" icon="▣" tone="success" />
        <StatCard value={stats.uptime} label="Platform uptime" icon="⌁" tone="warning" />
      </div>

      <div className="grid-2">
        <Card title="Users & roles">
          <DataTable columns={roleColumns} rows={roles} rowKey="role" />
          <div className="admin-actions">
            <Button variant="outline" onClick={() => navigate("/admin/users")}>
              Manage users
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/organizers")}>
              Manage organizers
            </Button>
          </div>
        </Card>

        <Card title="Event moderation">
          <SettingRow
            title={`${review.events} event${review.events === 1 ? "" : "s"} awaiting approval`}
            description="New submissions from organizers"
          >
            <Button variant="outline" onClick={() => navigate("/admin/events")}>
              Review
            </Button>
          </SettingRow>
          <SettingRow
            title={`${review.flagged} flagged event${review.flagged === 1 ? "" : "s"}`}
            description="Need policy verification"
          >
            <Button variant="outline" onClick={() => navigate("/admin/events")}>
              Inspect
            </Button>
          </SettingRow>
          <SettingRow
            title={`${review.organizers} organizer application${review.organizers === 1 ? "" : "s"}`}
            description="Waiting for approval"
            last
          >
            <Button variant="outline" onClick={() => navigate("/admin/organizers")}>
              Review
            </Button>
          </SettingRow>
        </Card>
      </div>

      <Card
        title="Recent platform activity"
        action={
          <Link to="/admin/audit-log" className="link-muted">
            Audit log →
          </Link>
        }
      >
        <DataTable columns={activityColumns} rows={activity} empty="No activity yet." />
      </Card>
    </>
  );
}