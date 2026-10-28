import { useAuth } from "../hooks/useAuth";
import { NavLink, useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import Logo from "./Logo";
import "./Sidebar.css";

export default function Sidebar({ groups, profile }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }
  return (
    <aside className="sidebar">
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
        <button type="button" className="nav-item" onClick={handleLogout}>
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
  );
}
