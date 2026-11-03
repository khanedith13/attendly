import { useState } from "react";
import AccentNote from "../../components/AccentNote";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import LoadingBlock from "../../components/LoadingBlock";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Pill from "../../components/Pill";
import SearchInput from "../../components/SearchInput";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getAuditLog } from "../../services/adminService";
import { downloadCsv } from "../../utils/csv";
import { formatShortDateTime } from "../../utils/format";
import "./Admin.css";

const PAGE_SIZE = 10;

const filters = [
  { value: "all", label: "All" },
  { value: "logins", label: "Logins" },
  { value: "users", label: "Users" },
  { value: "events", label: "Events" },
  { value: "settings", label: "Settings" },
  { value: "failed", label: "Failed" },
];

const roleLabels = { admin: "Admin", organizer: "Organizer", student: "Student" };

function categoryOf(entry) {
  const text = `${entry.action} ${entry.target}`;
  if (/login|logged in/i.test(text)) return "logins";
  if (/setting/i.test(text)) return "settings";
  if (/event|flag/i.test(text)) return "events";
  return "users";
}

const columns = [
  { key: "at", header: "Time", render: (row) => formatShortDateTime(row.at) },
  { key: "actor", header: "Actor", bold: true },
  { key: "role", header: "Role", render: (row) => roleLabels[row.role] ?? "—" },
  { key: "action", header: "Action" },
  { key: "target", header: "Target" },
  { key: "ip", header: "IP address" },
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

export default function AdminAuditLog() {
  const { data, loading } = useAsyncData(getAuditLog);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  if (loading) return <LoadingBlock />;

  const query = search.trim().toLowerCase();
  const matches = data
    .filter((entry) => {
      if (filter === "all") return true;
      if (filter === "failed") return entry.result === "failed";
      return categoryOf(entry) === filter;
    })
    .filter(
      (entry) =>
        !query ||
        [entry.actor, entry.action, entry.target].some((field) => field.toLowerCase().includes(query)),
    );

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function exportCsv() {
    downloadCsv(
      "audit-log.csv",
      ["Time", "Actor", "Role", "Action", "Target", "IP address", "Result"],
      matches.map((entry) => [
        formatShortDateTime(entry.at),
        entry.actor,
        roleLabels[entry.role] ?? "—",
        entry.action,
        entry.target,
        entry.ip,
        entry.result === "success" ? "Success" : "Failed",
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        subtitle="A read-only record of sensitive actions across the platform."
        actions={
          <Button variant="outline" disabled={matches.length === 0} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search actor, action, or target"
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

      <Card>
        <DataTable columns={columns} rows={visible} empty="No entries match your filters." />
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={matches.length}
          onChange={setPage}
          noun="entries"
        />
        <div className="roster-note">
          <AccentNote>
            Entries cannot be edited or deleted. The log keeps the most recent 500 actions.
          </AccentNote>
        </div>
      </Card>
    </>
  );
}