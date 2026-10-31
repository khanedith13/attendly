import { storage } from "../utils/storage";

const AUDIT_KEY = "attendly_audit_v1";
const MAX_ENTRIES = 500;
const MOCK_IP = "127.0.0.1";

function seed() {
  const entry = (minutesAgo, actor, role, action, target, result = "success", ip = "10.0.4.18") => ({
    at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    actor,
    role,
    action,
    target,
    result,
    ip,
  });

  return [
    entry(30, "Admin", "admin", "Approved organizer", "Campus Events Team"),
    entry(75, "Events Team", "organizer", "Published event", "AI & Future Skills Summit", "success", "10.0.7.55"),
    entry(140, "Unknown", "—", "Login attempt", "admin@school.edu.ph", "failed", "203.0.113.9"),
    entry(300, "Admin", "admin", "Changed late grace period", "Settings"),
    entry(1500, "Paolo Reyes", "admin", "Suspended organizer", "Open Mic Collective"),
    entry(1700, "Events Team", "organizer", "Published event", "Toastmasters Leadership Lab", "success", "10.0.7.55"),
    entry(2900, "Admin", "admin", "Changed user role", "john.santos@school.edu.ph"),
  ].map((item, index) => ({ id: index + 1, ...item }));
}

function readEntries() {
  const saved = storage.getJSON(AUDIT_KEY, null);
  if (saved) return saved;

  const fresh = seed();
  storage.setJSON(AUDIT_KEY, fresh);
  return fresh;
}

// Newest first.
export function getAuditEntries() {
  return readEntries();
}

export function logAudit({ actor, role, action, target, result = "success" }) {
  const entry = {
    id: Date.now() + Math.random(),
    at: new Date().toISOString(),
    actor,
    role,
    action,
    target,
    result,
    ip: MOCK_IP,
  };
  storage.setJSON(AUDIT_KEY, [entry, ...readEntries()].slice(0, MAX_ENTRIES));
}