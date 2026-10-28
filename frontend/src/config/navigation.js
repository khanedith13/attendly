export const roleConfig = {
  student: {
    label: "Student",
    topbar: "bell",
    showProfile: true,
    groups: [
      {
        title: "Main",
        items: [
          { label: "Dashboard", path: "/student/dashboard", icon: "⌂" },
          { label: "Attendance In", path: "/student/attendance-in", icon: "⌁" },
          { label: "Attendance Out", path: "/student/attendance-out", icon: "↗" },
          { label: "Browse Events", path: "/student/events", icon: "▣" },
          { label: "My Registrations", path: "/student/registrations", icon: "◷" },
        ],
      },
      {
        title: "Account",
        items: [{ label: "My Account", path: "/student/account", icon: "◯" }],
      },
    ],
  },

  organizer: {
    label: "Organizer",
    topbar: "bell",
    showProfile: true,
    groups: [
      {
        title: "Organizer",
        items: [
          { label: "Overview", path: "/organizer/dashboard", icon: "⌂" },
          { label: "Create Event", path: "/organizer/events/create", icon: "＋" },
          { label: "My Events", path: "/organizer/events", icon: "▣" },
          { label: "Attendees", path: "/organizer/attendees", icon: "✓" },
          { label: "Registrations", path: "/organizer/registrations", icon: "◷" },
        ],
      },
      {
        title: "Account",
        items: [{ label: "Organizer Profile", path: "/organizer/profile", icon: "◯" }],
      },
    ],
  },

  admin: {
    label: "Admin",
    topbar: "reviews",
    showProfile: false,
    groups: [
      {
        title: "Admin",
        items: [
          { label: "Overview", path: "/admin/dashboard", icon: "⌂" },
          { label: "Users", path: "/admin/users", icon: "◉" },
          { label: "Organizers", path: "/admin/organizers", icon: "✦" },
          { label: "Events", path: "/admin/events", icon: "▣" },
          { label: "Settings", path: "/admin/settings", icon: "⚙" },
        ],
      },
      {
        title: "Reports",
        items: [
          { label: "Attendance", path: "/admin/attendance", icon: "⌁" },
          { label: "Audit Log", path: "/admin/audit-log", icon: "▤" },
        ],
      },
    ],
  },
};
