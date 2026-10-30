import { ApiError } from "../api/ApiError";
import { toApiErrors } from "../utils/apiErrors";
import { toIso } from "../utils/dates";
import { validateEvent } from "../utils/eventValidation";
import { percent } from "../utils/format";
import { toneForCategory } from "../config/events";
import { addCatalogEvent, getCatalog, getCatalogEvent, updateCatalogEvent } from "./catalog";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const sum = (events, field) => events.reduce((total, event) => total + (event[field] ?? 0), 0);
const byStartAsc = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);
const byStartDesc = (a, b) => new Date(b.startsAt) - new Date(a.startsAt);

function ownEvents(user) {
  return getCatalog().filter((event) => event.ownerId === user.id);
}

// An organizer can only touch their own events.
function ownEvent(user, id) {
  const event = getCatalogEvent(id);
  if (!event || event.ownerId !== user.id) throw new ApiError("Event not found.", 404);
  return event;
}

export async function getOrganizerDashboard(user) {
  await delay();
  const now = Date.now();
  const published = ownEvents(user).filter((event) => event.status === "published");
  const started = published.filter((event) => new Date(event.startsAt).getTime() <= now);

  const startedRegistered = sum(started, "registered");
  const startedCheckedIn = sum(started, "checkedIn");

  return {
    stats: {
      published: published.length,
      registrations: sum(published, "registered"),
      checkedIn: sum(published, "checkedIn"),
      showUpRate: percent(startedCheckedIn, startedRegistered),
    },
    performance:
      started.length > 0
        ? {
            rate: percent(startedCheckedIn, startedRegistered),
            checkedIn: startedCheckedIn,
            noShow: startedRegistered - startedCheckedIn,
            registered: startedRegistered,
          }
        : null,
    upcoming: published
      .filter((event) => new Date(event.endsAt).getTime() >= now)
      .sort(byStartAsc)
      .slice(0, 3),
    recent: started.sort(byStartDesc).slice(0, 5),
  };
}

export async function listMyEvents(user) {
  await delay();
  return ownEvents(user).sort(byStartDesc);
}

export async function publishEvent(user, id) {
  await delay();
  const event = ownEvent(user, id);

  if (event.status !== "draft") throw new ApiError("Only draft events can be published.", 409);
  if (new Date(event.endsAt) < new Date()) {
    throw new ApiError("This event's date has passed. Edit the date before publishing.", 409);
  }
  updateCatalogEvent(id, { status: "published" });
}

export async function cancelEvent(user, id) {
  await delay();
  const event = ownEvent(user, id);

  if (event.status !== "published")
    throw new ApiError("Only published events can be cancelled.", 409);
  if (new Date(event.endsAt) < new Date()) {
    throw new ApiError("This event has already ended.", 409);
  }
  updateCatalogEvent(id, { status: "cancelled" });
}
