import { useCallback, useState } from "react";
import ActionBanner from "../../components/ActionBanner";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import LoadingBlock from "../../components/LoadingBlock";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Pill from "../../components/Pill";
import SearchInput from "../../components/SearchInput";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { listOrganizers, setOrganizerStatus } from "../../services/adminService";
import { downloadCsv } from "../../utils/csv";
import "./Admin.css";

const PAGE_SIZE = 10;

const filters = [
  { value: "all", label: "All" },
  { value: "active", label: "Approved" },
  { value: "pending", label: "Pending review" },
  { value: "suspended", label: "Suspended" },
];

const statusMeta = {
  active: { label: "Approved", tone: "success" },
  pending: { label: "Pending review", tone: "warning" },
  suspended: { label: "Suspended", tone: "danger" },
};

const doneText = {
  approve: (name) => `${name} was approved and can now publish events.`,
  reject: (name) => `${name}'s application was rejected.`,
  suspend: (name) => `${name} was suspended.`,
  reactivate: (name) => `${name} was reactivated.`,
};

const confirmCopy = {
  reject: {
    title: "Reject application?",
    text: "The organizer will not be able to publish events. This sets the account to suspended.",
    button: "Yes, reject",
  },
  suspend: {
    title: "Suspend organizer?",
    text: "They will be signed out and will not be able to log in or publish events.",
    button: "Yes, suspend",
  },
};

export default function AdminOrganizers() {
  const { user: admin } = useAuth();
  const { data, loading, reload } = useAsyncData(listOrganizers);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null); // { row, action }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const closeConfirm = useCallback(() => setConfirm(null), []);

  if (loading) return <LoadingBlock />;

  const pending = data.filter((row) => row.status === "pending").length;
  const query = search.trim().toLowerCase();
  const matches = data
    .filter((row) => filter === "all" || row.status === filter)
    .filter((row) => !query || row.name.toLowerCase().includes(query));

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function applyAction(row, action) {
    setMessage(null);
    try {
      await setOrganizerStatus(admin, row.id, action);
      setMessage({ tone: "success", text: doneText[action](row.name) });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    }
  }

  async function confirmAction() {
    setBusy(true);
    await applyAction(confirm.row, confirm.action);
    setBusy(false);
    setConfirm(null);
  }

  function exportCsv() {
    downloadCsv(
      "organizers.csv",
      ["Organization", "Contact person", "Email", "Phone", "Events", "Registrations", "Status"],
      matches.map((row) => [
        row.name,
        row.contactPerson,
        row.email,
        row.phone,
        row.events,
        row.registrations,
        statusMeta[row.status].label,
      ]),
    );
  }

  const columns = [
    { key: "name", header: "Organization", bold: true },
    { key: "phone", header: "Contact" },
    { key: "events", header: "Events" },
    { key: "registrations", header: "Registrations", render: (row) => row.registrations.toLocaleString() },
    {
      key: "status",
      header: "Status",
      render: (row) => <Pill tone={statusMeta[row.status].tone}>{statusMeta[row.status].label}</Pill>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        if (row.status === "pending") {
          return (
            <div className="row-actions">
              <Button size="sm" onClick={() => applyAction(row, "approve")}>
                Approve
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirm({ row, action: "reject" })}>
                Reject
              </Button>
            </div>
          );
        }
        if (row.status === "active") {
          return (
            <Button size="sm" variant="danger" onClick={() => setConfirm({ row, action: "suspend" })}>
              Suspend
            </Button>
          );
        }
        return (
          <Button size="sm" variant="outline" onClick={() => applyAction(row, "reactivate")}>
            Reactivate
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Organizer approvals"
        title="Organizers"
        subtitle="Review applications and manage organizations that create events."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={matches.length === 0}>
            Export CSV
          </Button>
        }
      />

      {pending > 0 && (
        <ActionBanner
          title="Organizer applications"
          text={`${pending} organizer application${pending === 1 ? " requires" : "s require"} review before they can publish events.`}
          actionLabel="Review queue"
          onAction={() => {
            setFilter("pending");
            setPage(1);
          }}
        />
      )}

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search organization"
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
        <DataTable columns={columns} rows={visible} empty="No organizers match your search." />
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={matches.length}
          onChange={setPage}
          noun="organizers"
        />
      </Card>

      {confirm && (
        <Modal title={confirmCopy[confirm.action].title} onClose={closeConfirm}>
          <p className="confirm-text">
            <b>{confirm.row.name}</b>: {confirmCopy[confirm.action].text}
          </p>
          <div className="confirm-actions">
            <Button variant="outline" onClick={closeConfirm}>
              Go back
            </Button>
            <Button variant="danger" disabled={busy} onClick={confirmAction}>
              {busy ? "Working..." : confirmCopy[confirm.action].button}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}