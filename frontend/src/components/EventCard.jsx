import { formatEventWhen } from "../utils/format";
import Button from "./Button";
import EventCover from "./EventCover";
import Pill from "./Pill";
import "./EventCard.css";

export default function EventCard({ event, onRegister, busy }) {
  const registered = event.myStatus === "registered";
  const full = event.isFull && !registered;

  return (
    <article className="event-card">
      <EventCover tone={event.tone} />
      <div className="event-card__body">
        <div className="event-card__when">{formatEventWhen(event.startsAt)}</div>
        <h3 className="event-card__title">{event.title}</h3>
        <div className="event-card__meta">
          {event.venue} • {event.campus}
        </div>

        <div className="event-card__foot">
          <span>{event.capacity} seats</span>
          {registered ? (
            <Pill tone="success">Registered</Pill>
          ) : (
            <Button size="sm" disabled={busy || full} onClick={() => onRegister(event)}>
              {full ? "Full" : "Register"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
