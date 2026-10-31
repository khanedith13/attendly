import { useCallback, useState } from "react";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Chip from "../../components/Chip";
import DataTable from "../../components/DataTable";
import LoadingBlock from "../../components/LoadingBlock";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import PersonCell from "../../components/PersonCell";
import Pill from "../../components/Pill";
import SearchInput from "../../components/SearchInput";
import StatCard from "../../components/StatCard";
import UserFormModal from "../../components/UserFormModal";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { createUser, listUsers, updateUser } from "../../services/adminService";
import { downloadCsv } from "../../utils/csv";
import { formatDate } from "../../utils/format";
import "./Admin.css";

const PAGE_SIZE = 10;

const roleFilters = [
  { value: "all", label: "All roles" },
  { value: "student", label: "Student" },
  { value: "organizer", label: "Organizer" },
  { value: "admin", label: "Admin" },
];

const roleMeta = {
  student: { label: "Student", tone: "info" },
  organizer: { label: "Organizer", tone: "warning" },
  admin: { label: "Admin", tone: "primary" },
};

const statusMeta = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Pending", tone: "neutral" },
  suspended: { label: "Suspended", tone: "danger" },
};

export default function AdminUsers() {
  const { user: admin } = useAuth();
  const { data, loading, reload } = useAsyncData(listUsers);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // { mode: "add" | "edit", user }
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const closeForm = useCallback(() => setForm(null), []);
  const closeSuspend = useCallback(() => setSuspendTarget(null), []);

  if (loading) return <LoadingBlock />;

  const countOf = (role) => data.filter((user) => user.role === role).length;
  const query = search.trim().toLowerCase();
  const matches = data
    .filter((user) => filter === "all" || user.role === filter)
    .filter(
      (user) =>
        !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
    );

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function handleSubmit(values) {
    if (form.mode === "add") {
      await createUser(admin, values);
      setMessage({ tone: "success", text: `${values.name.trim()} was added.` });
    } else {
      await updateUser(admin, form.user.id, values);
      setMessage({ tone: "success", text: `${form.user.name} was updated.` });
    }
    reload();
  }

  async function activate(user) {
    setMessage(null);
    try {
      await updateUser(admin, user.id, { status: "active" });
      setMessage({ tone: "success", text: `${user.name} is active again.` });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    }
  }

  async function confirmSuspend() {
    setBusy(true);
    try {
      await updateUser(admin, suspendTarget.id, { status: "suspended" });
      setMessage({ tone: "success", text: `${suspendTarget.name} was suspended.` });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setBusy(false);
      setSuspendTarget(null);
    }
  }

  function exportCsv() {
    downloadCsv(
      "users.csv",
      ["Name", "School Gmail", "Role", "Joined", "Status"],
      matches.map((user) => [
        user.name,
        user.email,
        roleMeta[user.role].label,
        formatDate(user.joinedAt),
        statusMeta[user.status].label,
      ]),
    );
  }

  const columns = [
    { key: "name", header: "User", render: (row) => <PersonCell name={row.name} /> },
    { key: "email", header: "School Gmail" },
    {
      key: "role",
      header: "Role",
      render: (row) => <Pill tone={roleMeta[row.role].tone}>{roleMeta[row.role].label}</Pill>,
    },
    { key: "joined", header: "Joined", render: (row) => formatDate(row.joinedAt) },
    {
      key: "status",
      header: "Status",
      render: (row) => <Pill tone={statusMeta[row.status].tone}>{statusMeta[row.status].label}</Pill>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        if (row.id === admin.id) return <span className="row-none">You</span>;
        return (
          <div className="row-actions">
            <Button size="sm" variant="outline" onClick={() => setForm({ mode: "edit", user: row })}>
              Edit
            </Button>
            {row.status === "suspended" ? (
              <Button size="sm" variant="outline" onClick={() => activate(row)}>
                Activate
              </Button>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setSuspendTarget(row)}>
                Suspend
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Users"
        subtitle="Manage student, organizer, and admin accounts and roles."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={matches.length === 0}>
              Export CSV
            </Button>
            <Button onClick={() => setForm({ mode: "add" })}>+ Add user</Button>
          </>
        }
      />

      <div className="grid-4">
        <StatCard value={data.length.toLocaleString()} label="Total users" icon="◉" tone="primary" />
        <StatCard value={countOf("student").toLocaleString()} label="Students" icon="◯" tone="info" />
        <StatCard value={countOf("organizer").toLocaleString()} label="Organizers" icon="✦" tone="warning" />
        <StatCard value={countOf("admin").toLocaleString()} label="Admins" icon="⚙" tone="success" />
      </div>

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search name or email"
        />
        {roleFilters.map((item) => (
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
        <DataTable columns={columns} rows={visible} empty="No users match your search." />
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={matches.length}
          onChange={setPage}
          noun="users"
        />
      </Card>

      {form && (
        <UserFormModal mode={form.mode} user={form.user} onSubmit={handleSubmit} onClose={closeForm} />
      )}

      {suspendTarget && (
        <Modal title="Suspend user?" onClose={closeSuspend}>
          <p className="confirm-text">
            <b>{suspendTarget.name}</b> will no longer be able to log in. You can activate the account
            again at any time.
          </p>
          <div className="confirm-actions">
            <Button variant="outline" onClick={closeSuspend}>
              Keep active
            </Button>
            <Button variant="danger" disabled={busy} onClick={confirmSuspend}>
              {busy ? "Suspending..." : "Yes, suspend"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}