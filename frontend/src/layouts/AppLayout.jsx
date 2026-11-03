import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Notice from "../components/Notice";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { roleConfig } from "../config/navigation";
import { useAuth } from "../hooks/useAuth";
import { getInitials, roleLabels } from "../utils/roles";
import "./AppLayout.css";

export default function AppLayout({ role }) {
  const { pathname } = useLocation();
  const { user, refreshUser } = useAuth();
  const [badge, setBadge] = useState(null);
  const [slot, setSlot] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const config = roleConfig[role];
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Re-check the account whenever the person moves to another page, so approvals
  // and suspensions take effect without a manual refresh.
  useEffect(() => {
    refreshUser();
  }, [pathname, refreshUser]);

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const profile = {
    name: user.name,
    initials: getInitials(user.name),
    role: roleLabels[user.role],
  };

  const allItems = config.groups.flatMap((group) => group.items);
  const current = allItems
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const pageLabel = pathname.endsWith("/edit") ? "Edit Event" : (current?.label ?? "");

  return (
    <div className="app">
      <Sidebar
        groups={config.groups}
        profile={config.showProfile ? profile : null}
        open={menuOpen}
        onNavigate={closeMenu}
      />
      {menuOpen && <div className="scrim" onClick={closeMenu} />}

      <div className="app__main">
        <Topbar
          roleLabel={config.label}
          pageLabel={pageLabel}
          variant={config.topbar}
          initials={profile.initials}
          badge={badge}
          slotRef={setSlot}
          onMenu={() => setMenuOpen(true)}
        />
        <main className="app__content">
          {role === "organizer" && user.status === "pending" && (
            <Notice tone="info">
              Your organizer account is awaiting administrator approval. You can create drafts, but
              publishing is disabled until you are approved.
            </Notice>
          )}
          <Outlet context={{ setBadge, slot }} />
        </main>
      </div>
    </div>
  );
}