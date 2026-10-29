// What the organizer sees. "live" and "closed" come from the date and time.
export function getDisplayStatus(event, now = Date.now()) {
  if (event.status === "draft") return "draft";
  if (event.status === "cancelled") return "cancelled";
  if (now < new Date(event.startsAt).getTime()) return "upcoming";
  if (now <= new Date(event.endsAt).getTime()) return "live";
  return "closed";
}

export const statusMeta = {
  draft: { label: "Draft", tone: "neutral" },
  upcoming: { label: "Upcoming", tone: "info" },
  live: { label: "Live", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};
