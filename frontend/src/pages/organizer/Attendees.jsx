import { useNow } from "../../hooks/useNow";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import InlineSelect from "../../components/InlineSelect";
import LoadingBlock from "../../components/LoadingBlock";
import MiniStat from "../../components/MiniStat";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import PersonCell from "../../components/PersonCell";
import Pill from "../../components/Pill";
import SearchInput from "../../components/SearchInput";
import TopbarPortal from "../../components/TopbarPortal";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarNone } from "../../hooks/useTopbarBadge";
import { getAttendees } from "../../services/organizerService";
import { attendeeMeta, attendeeStatus } from "../../utils/attendance";
import { downloadCsv } from "../../utils/csv";
import { formatShortDateTime, formatTime } from "../../utils/format";
import "./Roster.css";

const PAGE_SIZE = 10;

const filters = [
  { value: "all", label: "All" },
  { value: "in", label: "Checked in" },
  { value: "out", label: "Checked out" },
  { value: "noshow", label: "No show" },
];

const columns = [
  { key: "name", header: "Student", render: (row) => <PersonCell name={row.name} /> },
  { key: "studentId", header: "Student ID" },
  { key: "email", header: "Email" },
  {
    key: "registered",
    header: "Registered",
    render: (row) => formatShortDateTime(row.registeredAt),
  },
  { key: "in", header: "Check in", render: (row) => (row.timeIn ? formatTime(row.timeIn) : "—") },
  {
    key: "out",
    header: "Check out",
    render: (row) => (row.timeOut ? formatTime(row.timeOut) : "—"),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Pill tone={attendeeMeta[row.state].tone}>{attendeeMeta[row.state].label}</Pill>
    ),
  },
];

export default function Attendees() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventId, setEventId] = useState(null);
  const load = useCallback(() => getAttendees(user, eventId), [user, eventId]);
  const { data, loading } = useAsyncData(load);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const now = useNow();

  useTopbarNone();

  if (loading) return <LoadingBlock />;

  const { events, event, rows } = data;

  if (!event) {
    return (
      <div className="empty-note">
        <p>You have no published events yet.</p>
        <Button size="sm" onClick={() => navigate("/organizer/events/create")}>
          Create an event
        </Button>
      </div>
    );
  }

  const all = rows.map((row) => ({ ...row, state: attendeeStatus(row, event, now) }));
  const summary = {
    registered: all.length,
    checkedIn: all.filter((row) => row.timeIn).length,
    checkedOut: all.filter((row) => row.timeOut).length,
    active: all.filter((row) => row.timeIn && !row.timeOut).length,
  };

  const query = search.trim().toLowerCase();
  const matches = all.filter((row) => {
    if (filter === "in" && !row.timeIn) return false;
    if (filter === "out" && !row.timeOut) return false;
    if (filter === "noshow" && row.state !== "noshow") return false;
    return (
      !query ||
      [row.name, row.studentId, row.email].some((field) => field.toLowerCase().includes(query))
    );
  });

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function exportCsv() {
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadCsv(
      `attendees-${slug}.csv`,
      ["Student", "Student ID", "Email", "Registered", "Check in", "Check out", "Status"],
      matches.map((row) => [
        row.name,
        row.studentId,
        row.email,
        formatShortDateTime(row.registeredAt),
        row.timeIn ? formatTime(row.timeIn) : "",
        row.timeOut ? formatTime(row.timeOut) : "",
        attendeeMeta[row.state].label,
      ]),
    );
  }

  return (
    <>
      <TopbarPortal>
        <Button variant="outline" disabled={matches.length === 0} onClick={exportCsv}>
          Export CSV
        </Button>
      </TopbarPortal>

      <PageHeader
        eyebrow="Attendance records"
        title="Event attendees"
        subtitle="View complete attendance details for each event."
      />

      <Card>
        <div className="roster-toolbar">
          <SearchInput
            value={search}
            onChange={(changeEvent) => {
              setSearch(changeEvent.target.value);
              setPage(1);
            }}
            placeholder="Search attendee name, ID, or email"
          />
          <InlineSelect
            label="Event"
            width={255}
            value={event.id}
            options={events.map((item) => ({ value: item.id, label: item.title }))}
            onChange={(changeEvent) => {
              setEventId(Number(changeEvent.target.value));
              setPage(1);
            }}
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

        <div className="roster-tiles roster-tiles--4">
          <MiniStat label="Registered" value={summary.registered.toLocaleString()} />
          <MiniStat label="Checked in" value={summary.checkedIn.toLocaleString()} />
          <MiniStat label="Checked out" value={summary.checkedOut.toLocaleString()} />
          <MiniStat label="Active now" value={summary.active.toLocaleString()} />
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} rows={visible} empty="No attendees match your filters." />
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={matches.length}
          onChange={setPage}
          noun="attendees"
        />
      </Card>
    </>
  );
}
