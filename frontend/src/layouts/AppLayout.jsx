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
  const config = roleConfig[role];

  const profile = {
    name: user.name,
    initials: getInitials(user.name),
    role: roleLabels[user.role],
  };

  const allItems = config.groups.flatMap((group) => group.items);
  const current = allItems.find((item) => item.path === pathname);

  return (
    <div className="app">
      <Sidebar groups={config.groups} profile={config.showProfile ? profile : null} />

      <div className="app__main">
        <Topbar
          roleLabel={config.label}
          pageLabel={current ? current.label : ""}
          variant={config.topbar}
          initials={profile.initials}
        />
        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}