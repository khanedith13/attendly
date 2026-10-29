import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { roleConfig } from "../config/navigation";
import { useAuth } from "../hooks/useAuth";
import { getInitials, roleLabels } from "../utils/roles";
import "./AppLayout.css";

export default function AppLayout({ role }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [badge, setBadge] = useState(null);
  const config = roleConfig[role];

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
      <Sidebar groups={config.groups} profile={config.showProfile ? profile : null} />

      <div className="app__main">
        <Topbar
          roleLabel={config.label}
          pageLabel={current ? current.label : ""}
          variant={config.topbar}
          initials={profile.initials}
          badge={badge}
        />
        <main className="app__content">
          <Outlet context={{ setBadge }} />
        </main>
      </div>
    </div>
  );
}
