import ComponentsPreview from "../pages/ComponentsPreview";
import ThemePreview from "../pages/ThemePreview";
import { Navigate, Route, Routes } from "react-router-dom";

import NotFound from "../pages/NotFound";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import StudentDashboard from "../pages/student/StudentDashboard";
import AttendanceIn from "../pages/student/AttendanceIn";
import AttendanceOut from "../pages/student/AttendanceOut";
import BrowseEvents from "../pages/student/BrowseEvents";
import MyRegistrations from "../pages/student/MyRegistrations";
import MyAccount from "../pages/student/MyAccount";

import OrganizerDashboard from "../pages/organizer/OrganizerDashboard";
import CreateEvent from "../pages/organizer/CreateEvent";
import MyEvents from "../pages/organizer/MyEvents";
import Attendees from "../pages/organizer/Attendees";
import OrganizerRegistrations from "../pages/organizer/OrganizerRegistrations";
import OrganizerProfile from "../pages/organizer/OrganizerProfile";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminOrganizers from "../pages/admin/AdminOrganizers";
import AdminEvents from "../pages/admin/AdminEvents";
import AdminSettings from "../pages/admin/AdminSettings";
import AdminAttendance from "../pages/admin/AdminAttendance";
import AdminAuditLog from "../pages/admin/AdminAuditLog";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/theme" element={<ThemePreview />} />
      <Route path="/components" element={<ComponentsPreview />} />

      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Student */}
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/attendance-in" element={<AttendanceIn />} />
      <Route path="/student/attendance-out" element={<AttendanceOut />} />
      <Route path="/student/events" element={<BrowseEvents />} />
      <Route path="/student/registrations" element={<MyRegistrations />} />
      <Route path="/student/account" element={<MyAccount />} />

      {/* Organizer */}
      <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
      <Route path="/organizer/events/create" element={<CreateEvent />} />
      <Route path="/organizer/events" element={<MyEvents />} />
      <Route path="/organizer/attendees" element={<Attendees />} />
      <Route path="/organizer/registrations" element={<OrganizerRegistrations />} />
      <Route path="/organizer/profile" element={<OrganizerProfile />} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/organizers" element={<AdminOrganizers />} />
      <Route path="/admin/events" element={<AdminEvents />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
      <Route path="/admin/attendance" element={<AdminAttendance />} />
      <Route path="/admin/audit-log" element={<AdminAuditLog />} />

      {/* Anything else */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
