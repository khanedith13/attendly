import { formatEventWhen } from "../utils/format";
import Button from "./Button";
import Modal from "./Modal";
import "./TicketModal.css";

export default function TicketModal({ registration, onClose }) {
  return (
    <Modal title="Your registration ticket" onClose={onClose}>
      <div className="ticket">
        <h4 className="ticket__title">{registration.title}</h4>
        <p className="ticket__meta">
          {formatEventWhen(registration.startsAt)} • {registration.venue}
        </p>

        <code className="ticket__code">{registration.qrToken.slice(0, 8).toUpperCase()}</code>

        <p className="ticket__hint">
          Scan the organizer's Attendance In QR at the event to check in, and the separate
          Attendance Out QR when leaving.
        </p>
        <Button variant="outline" className="btn--block" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
