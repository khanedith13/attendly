import { getDisplayStatus, statusMeta } from "../utils/eventStatus";
import Pill from "./Pill";

export default function EventStatusPill({ event }) {
  const meta = statusMeta[getDisplayStatus(event)];
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}
