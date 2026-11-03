// What people see. "live" and "closed" come from the date and time;
// "pending" and "flagged" come from an admin's review.
export function getDisplayStatus(event, now = Date.now()) {
  if (event.status === "draft") return "draft";
  if (event.status === "cancelled") return "cancelled";
  if (event.review === "pending") return "pending";
  if (event.review === "flagged") return "flagged";
  if (now < new Date(event.startsAt).getTime()) return "upcoming";
  if (now <= new Date(event.endsAt).getTime()) return "live";
  return "closed";
}

export const statusMeta = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Awaiting approval", tone: "warning" },
  flagged: { label: "Flagged", tone: "danger" },
  upcoming: { label: "Upcoming", tone: "info" },
  live: { label: "Live", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};