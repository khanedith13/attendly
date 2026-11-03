import { useState } from "react";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import InlineSelect from "../../components/InlineSelect";
import LoadingBlock from "../../components/LoadingBlock";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import PersonCell from "../../components/PersonCell";
import Pill from "../../components/Pill";
import SearchInput from "../../components/SearchInput";
import StatCard from "../../components/StatCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useNow } from "../../hooks/useNow";
import { getAttendanceRecords } from "../../services/adminService";
import { outcomeMeta } from "../../utils/attendance";
import { downloadCsv } from "../../utils/csv";
import { formatShortDateTime } from "../../utils/format";
import "./Admin.css";

const PAGE_SIZE = 10;
const DAY = 86400000;

const ranges = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const filters = [
  { value: "all", label: "All" },
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
];

function inRange(iso, range, now) {
  if (range === "all") return true;
  if (range === "today") return new Date(iso).toDateString() === new Date(now).toDateString();
  return now - new Date(iso).getTime() <= Number(range) * DAY;
}

const columns = [
  { key: "name", header: "Student", render: (row) => <PersonCell name={row.name} /> },
  { key: "studentId", header: "Student ID" },
  { key: "eventTitle", header: "Event" },
  { key: "in", header: "Time in", render: (row) => (row.timeIn ? formatShortDateTime(row.timeIn) : "—") },
  { key: "out", header: "Time out", render: (row) => (row.timeOut ? formatShortDateTime(row.timeOut) : "—") },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Pill tone={outcomeMeta[row.outcome].tone}>{outcomeMeta[row.outcome].label}</Pill>
    ),
  },
];

export default function AdminAttendance() {
  const { data, loading } = useAsyncData(getAttendanceRecords);
  const now = useNow();

  const [range, setRange] = useState("30");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  if (loading) return <LoadingBlock />;

  const scoped = data.filter((row) => inRange(row.eventStart, range, now));
  const count = (outcome) => scoped.filter((row) => row.outcome === outcome).length;

  const query = search.trim().toLowerCase();
  const matches = scoped
    .filter((row) => filter === "all" || row.outcome === filter)
    .filter(
      (row) =>
        !query ||
        [row.name, row.studentId, row.eventTitle].some((field) => field.toLowerCase().includes(query)),
    );

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function exportReport() {
    downloadCsv(
      "attendance-report.csv",
      ["Student", "Student ID", "Event", "Time in", "Time out", "Status"],
      matches.map((row) => [
        row.name,
        row.studentId,
        row.eventTitle,
        row.timeIn ? formatShortDateTime(row.timeIn) : "",
        row.timeOut ? formatShortDateTime(row.timeOut) : "",
        outcomeMeta[row.outcome].label,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Attendance records"
        subtitle="Platform-wide check-in and check-out data across all events."
        actions={
          <>
            <InlineSelect
              label="Date range"
              width={140}
              value={range}
              options={ranges}
              onChange={(event) => {
                setRange(event.target.value);
                setPage(1);
              }}
            />
            <Button disabled={matches.length === 0} onClick={exportReport}>
              Generate report
            </Button>
          </>
        }
      />

      <div className="grid-4">
        <StatCard
          value={scoped.filter((row) => row.timeIn).length.toLocaleString()}
          label="Check-ins"
          icon="⌁"
          tone="primary"
        />
        <StatCard value={count("present").toLocaleString()} label="Present" icon="✓" tone="success" />
        <StatCard value={count("late").toLocaleString()} label="Late" icon="◷" tone="warning" />
        <StatCard value={count("absent").toLocaleString()} label="Absent" icon="✕" tone="info" />
      </div>

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search student, ID, or event"
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
        <DataTable columns={columns} rows={visible} empty="No attendance records in this range." />
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={matches.length}
          onChange={setPage}
          noun="records"
        />
      </Card>
    </>
  );
}