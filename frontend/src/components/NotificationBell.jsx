import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAsyncData } from "../hooks/useAsyncData";
import { useAuth } from "../hooks/useAuth";
import { getNotifications } from "../services/notificationService";
import "./NotificationBell.css";

function Bell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => getNotifications(user), [user]);
  const { data, reload } = useAsyncData(load);
  const items = data ?? [];

  // Clicking outside the panel, or pressing Escape, closes it.
  useEffect(() => {
    if (!open) return undefined;

    function handlePointer(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function toggle() {
    if (!open) reload();
    setOpen(!open);
  }

  function openItem(item) {
    setOpen(false);
    navigate(item.to);
  }

  return (
    <div className="bell" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={items.length > 0 ? `Notifications (${items.length})` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
      >
        ♢{items.length > 0 && <span className="icon-btn__dot" />}
      </button>

      {open && (
        <div className="bell__panel" role="dialog" aria-label="Notifications">
          <div className="bell__head">Notifications</div>

          {items.length === 0 ? (
            <p className="bell__empty">You are all caught up.</p>
          ) : (
            <ul className="bell__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" className="bell__item" onClick={() => openItem(item)}>
                    <span className={`bell__tone bell__tone--${item.tone}`} />
                    <span>
                      <b>{item.title}</b>
                      <small>{item.text}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// The key makes the bell start fresh on every page: it reloads the alerts and closes the panel.
export default function NotificationBell() {
  const { pathname } = useLocation();
  return <Bell key={pathname} />;
}