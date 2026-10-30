import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";

// Renders its children inside the topbar (next to the avatar).
export default function TopbarPortal({ children }) {
  const { slot } = useOutletContext();
  return slot ? createPortal(children, slot) : null;
}
