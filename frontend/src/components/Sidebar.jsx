import { useCallback, useState } from "react";
import { NavLink } from "react-router-dom";
import Avatar from "./Avatar";
import Logo from "./Logo";
import LogoutDialog from "./LogoutDialog";
import "./Sidebar.css";

export default function Sidebar({ groups, profile, open = false, onNavigate }) {
  const [showLogout, setShowLogout] = useState(false);
  const closeLogout = useCallback(() => setShowLogout(false), []);

  return (
    <>
      <aside className={open ? "sidebar sidebar--open" : "sidebar"}>
        <div className="sidebar__brand">
          <Logo onDark />
        </div>

        <nav>
          {groups.map((group) => (
            <div key={group.title}>
              <div className="sidebar__group-title">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={onNavigate}
                  className={({ isActive }) => (isActive ? "nav-item nav-item--active" : "nav-item")}
                >
                  <span className="nav-item__icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <button type="button" className="nav-item" onClick={() => setShowLogout(true)}>
            <span className="nav-item__icon">↪</span>
            Log out
          </button>

          {profile && (
            <div className="sidebar__profile">
              <Avatar initials={profile.initials} />
              <div>
                <div className="sidebar__profile-name">{profile.name}</div>
                <div className="sidebar__profile-role">{profile.role}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {showLogout && <LogoutDialog onClose={closeLogout} />}
    </>
  );
}