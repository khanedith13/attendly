import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import ComponentsPreview from "../pages/ComponentsPreview";
import NotFound from "../pages/NotFound";
import ThemePreview from "../pages/ThemePreview";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import GuestRoute from "./GuestRoute";
import ProtectedRoute from "./ProtectedRoute";

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
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Only for logged-out visitors */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Student */}
      <Route element={<ProtectedRoute allowedRole="student" />}>
        <Route path="/student" element={<AppLayout role="student" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="attendance-in" element={<AttendanceIn />} />
          <Route path="attendance-out" element={<AttendanceOut />} />
          <Route path="events" element={<BrowseEvents />} />
          <Route path="registrations" element={<MyRegistrations />} />
          <Route path="account" element={<MyAccount />} />
        </Route>
      </Route>

      {/* Organizer */}
      <Route element={<ProtectedRoute allowedRole="organizer" />}>
        <Route path="/organizer" element={<AppLayout role="organizer" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="events/create" element={<CreateEvent />} />
          <Route path="events" element={<MyEvents />} />
          <Route path="attendees" element={<Attendees />} />
          <Route path="registrations" element={<OrganizerRegistrations />} />
          <Route path="profile" element={<OrganizerProfile />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin" element={<AppLayout role="admin" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="organizers" element={<AdminOrganizers />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
        </Route>
      </Route>

      {/* Temporary preview pages (deleted in a later step) */}
      <Route path="/theme" element={<ThemePreview />} />
      <Route path="/components" element={<ComponentsPreview />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
