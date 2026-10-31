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
  waitlisted: { label: "Waitlisted", tone: "warning" },
};