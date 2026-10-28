import { useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import Chip from "../components/Chip";
import DataTable from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import Pill from "../components/Pill";
import StatCard from "../components/StatCard";

const filters = ["All", "Upcoming", "Attended", "Cancelled"];

const columns = [
  { key: "event", header: "Event", bold: true },
  { key: "date", header: "Date" },
  {
    key: "status",
    header: "Status",
    render: (row) => <Pill tone={row.tone}>{row.status}</Pill>,
  },
];

const rows = [
  { id: 1, event: "AI & Future Skills Summit", date: "Oct 07", status: "Present", tone: "success" },
  { id: 2, event: "Career Fair 2026", date: "Sep 21", status: "Late", tone: "warning" },
  { id: 3, event: "Night Run Fundraiser", date: "Sep 12", status: "Absent", tone: "danger" },
];

export default function ComponentsPreview() {
  const [active, setActive] = useState("All");

  return (
    <main style={{ padding: 30, display: "grid", gap: 20 }}>
      <PageHeader
        eyebrow="Registered events"
        title="My registrations"
        subtitle="View your event tickets, QR codes, and registration status."
        actions={
          <>
            <Button variant="outline">Export CSV</Button>
            <Button>+ Browse events</Button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 15 }}>
        <StatCard value="7" label="Total registered" icon="◷" tone="primary" />
        <StatCard value="4" label="Upcoming" icon="↗" tone="warning" />
        <StatCard value="3" label="Attended" icon="✓" tone="success" />
        <StatCard value="0" label="Cancelled" icon="◒" tone="info" />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {filters.map((name) => (
          <Chip key={name} active={active === name} onClick={() => setActive(name)}>
            {name}
          </Chip>
        ))}
      </div>

      <Card title="Past registrations">
        <DataTable columns={columns} rows={rows} />
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <Button size="sm">Small primary</Button>
        <Button variant="danger">Cancel</Button>
        <Button disabled>Disabled</Button>
      </div>
    </main>
  );
}