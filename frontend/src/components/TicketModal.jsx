import { QRCodeSVG } from "qrcode.react";
import { formatEventWhen } from "../utils/format";
import Button from "./Button";
import Modal from "./Modal";
import "./TicketModal.css";

export default function TicketModal({ registration, onClose }) {
  return (
    <Modal title="Your check-in ticket" onClose={onClose}>
      <div className="ticket">
        <h4 className="ticket__title">{registration.title}</h4>
        <p className="ticket__meta">
          {formatEventWhen(registration.startsAt)} • {registration.venue}
        </p>

        <div className="ticket__qr">
          <QRCodeSVG value={registration.qrToken} size={176} fgColor="#111827" />
        </div>
        <code className="ticket__code">{registration.qrToken.slice(0, 8).toUpperCase()}</code>

        <p className="ticket__hint">
          Show this code to the organizer at the entrance. Your time in and out are recorded when it
          is scanned.
        </p>
        <Button variant="outline" className="btn--block" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
