// registered -> active (checked in) -> complete (checked out), or no show.
export function attendeeStatus(row, event, now = Date.now()) {
  if (row.timeOut) return "complete";
  if (row.timeIn) return "active";
  return new Date(event.endsAt).getTime() < now ? "noshow" : "registered";
}

export const attendeeMeta = {
  registered: { label: "Registered", tone: "neutral" },
  active: { label: "Active", tone: "info" },
  complete: { label: "Complete", tone: "success" },
  noshow: { label: "No show", tone: "danger" },
};

export const registrationMeta = {
  registered: { label: "Confirmed", tone: "info" },
};

// "present" | "late" | "absent", or null while the event is still going on.
export function attendanceStatus(row, event, graceMs, now = Date.now()) {
  if (row.timeIn) {
    return new Date(row.timeIn) - new Date(event.startsAt) > graceMs ? "late" : "present";
  }
  return new Date(event.endsAt).getTime() < now ? "absent" : null;
}

export const outcomeMeta = {
  present: { label: "Present", tone: "success" },
  late: { label: "Late", tone: "warning" },
  absent: { label: "Absent", tone: "danger" },
};
