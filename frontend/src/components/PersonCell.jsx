import { getInitials } from "../utils/roles";
import Avatar from "./Avatar";
import "./PersonCell.css";

export default function PersonCell({ name }) {
  return (
    <div className="person">
      <Avatar initials={getInitials(name)} size={32} />
      <b>{name}</b>
    </div>
  );
}
