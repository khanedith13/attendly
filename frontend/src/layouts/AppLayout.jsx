import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { roleConfig } from "../config/navigation";
import "./AppLayout.css";

// TEMPORARY: fake logged-in users. Step 7 replaces this with the real user from the API.
const mockUsers = {
  student: { name: "Delfin Octobre", initials: "DO", role: "Student" },
  organizer: { name: "Events Team", initials: "EM", role: "Organizer" },
  admin: { name: "Admin", initials: "AD", role: "Administrator" },
};

export default function AppLayout({ role }) {
  const { pathname } = useLocation();
  const config = roleConfig[role];
  const user = mockUsers[role];

  const allItems = config.groups.flatMap((group) => group.items);
  const current = allItems.find((item) => item.path === pathname);

  return (
    <div className="app">
      <Sidebar groups={config.groups} profile={config.showProfile ? user : null} />

      <div className="app__main">
        <Topbar
          roleLabel={config.label}
          pageLabel={current ? current.label : ""}
          variant={config.topbar}
          initials={user.initials}
        />
        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
