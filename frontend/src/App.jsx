import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ForbiddenPage } from "./auth/AuthHome.jsx";
import { LoginPage, RegisterPage } from "./auth/AuthPages.jsx";
import { ProtectedRoute } from "./auth/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { DashboardLayout } from "./components/DashboardLayout.jsx";
import { LoadingState } from "./components/Common.jsx";

// Core Dashboards
const AdminDashboard = lazy(() => import("./pages/Dashboards.jsx").then((m) => ({ default: m.AdminDashboard })));
const WardenDashboard = lazy(() => import("./pages/Dashboards.jsx").then((m) => ({ default: m.WardenDashboard })));
const StudentDashboard = lazy(() => import("./pages/Dashboards.jsx").then((m) => ({ default: m.StudentDashboard })));

// Management Pages
const StudentManagementPage = lazy(() => import("./features/management/StudentManagementPage.jsx").then((m) => ({ default: m.StudentManagementPage })));
const BlocksPage = lazy(() => import("./features/management/ManagementPages.jsx").then((m) => ({ default: m.BlocksPage })));
const RoomManagementPage = lazy(() => import("./features/management/ManagementPages.jsx").then((m) => ({ default: m.RoomManagementPage })));
const BedAllocationPage = lazy(() => import("./features/management/ManagementPages.jsx").then((m) => ({ default: m.BedAllocationPage })));
const StudentProfilePage = lazy(() => import("./features/management/ManagementPages.jsx").then((m) => ({ default: m.StudentProfilePage })));
const StaffManagementPage = lazy(() => import("./pages/admin/StaffManagementPage.jsx").then((m) => ({ default: m.StaffManagementPage })));

// Finance & Complaints
const FeeManagementPage = lazy(() => import("./features/finance/FeeManagementPage.jsx").then((m) => ({ default: m.FeeManagementPage })));
const ComplaintManagementPage = lazy(() => import("./features/complaints/ComplaintManagementPage.jsx").then((m) => ({ default: m.ComplaintManagementPage })));

// Operational Common Pages
const LeaveManagementPage = lazy(() => import("./pages/common/LeaveManagementPage.jsx").then((m) => ({ default: m.LeaveManagementPage })));
const GateManagementPage = lazy(() => import("./pages/common/GateManagementPage.jsx").then((m) => ({ default: m.GateManagementPage })));
const VisitorManagementPage = lazy(() => import("./pages/common/VisitorManagementPage.jsx").then((m) => ({ default: m.VisitorManagementPage })));
const MaintenancePage = lazy(() => import("./pages/common/MaintenancePage.jsx").then((m) => ({ default: m.MaintenancePage })));
const AnnouncementsPage = lazy(() => import("./pages/common/AnnouncementsPage.jsx").then((m) => ({ default: m.AnnouncementsPage })));
const EmergencySOSPage = lazy(() => import("./pages/common/EmergencySOSPage.jsx").then((m) => ({ default: m.EmergencySOSPage })));
const MessManagementPage = lazy(() => import("./pages/common/MessManagementPage.jsx").then((m) => ({ default: m.MessManagementPage })));
const FeedbackPage = lazy(() => import("./pages/common/FeedbackPage.jsx").then((m) => ({ default: m.FeedbackPage })));
const MessagesPage = lazy(() => import("./pages/common/MessagesPage.jsx").then((m) => ({ default: m.MessagesPage })));
const NotificationsPage = lazy(() => import("./pages/common/NotificationsPage.jsx").then((m) => ({ default: m.NotificationsPage })));
const ReportsPage = lazy(() => import("./pages/common/ReportsPage.jsx").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/common/SettingsPage.jsx").then((m) => ({ default: m.SettingsPage })));

// Student Pages
const StudentRoomPage = lazy(() => import("./pages/student/StudentRoomPage.jsx").then((m) => ({ default: m.StudentRoomPage })));
const StudentLeavePage = lazy(() => import("./pages/student/StudentLeavePage.jsx").then((m) => ({ default: m.StudentLeavePage })));
const StudentQRPassPage = lazy(() => import("./pages/student/StudentQRPassPage.jsx").then((m) => ({ default: m.StudentQRPassPage })));
const StudentMovementHistoryPage = lazy(() => import("./pages/student/StudentMovementHistoryPage.jsx").then((m) => ({ default: m.StudentMovementHistoryPage })));
const StudentVisitorPage = lazy(() => import("./pages/student/StudentVisitorPage.jsx").then((m) => ({ default: m.StudentVisitorPage })));
const HostelInfoPage = lazy(() => import("./pages/student/HostelInfoPage.jsx").then((m) => ({ default: m.HostelInfoPage })));

function Screen({ component: Component, ...props }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Component {...props} />
    </Suspense>
  );
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
      </Route>

      {/* Admin Module */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<Screen component={AdminDashboard} />} />
          <Route path="students" element={<Screen component={StudentManagementPage} />} />
          <Route path="students/:id" element={<Screen component={StudentProfilePage} />} />
          <Route path="blocks" element={<Screen component={BlocksPage} />} />
          <Route path="rooms" element={<Screen component={RoomManagementPage} />} />
          <Route path="allocations" element={<Screen component={BedAllocationPage} />} />
          <Route path="staff" element={<Screen component={StaffManagementPage} />} />
          <Route path="fees" element={<Screen component={FeeManagementPage} />} />
          <Route path="complaints" element={<Screen component={ComplaintManagementPage} />} />
          <Route path="leave-requests" element={<Screen component={LeaveManagementPage} />} />
          <Route path="gate" element={<Screen component={GateManagementPage} />} />
          <Route path="visitors" element={<Screen component={VisitorManagementPage} />} />
          <Route path="maintenance" element={<Screen component={MaintenancePage} />} />
          <Route path="announcements" element={<Screen component={AnnouncementsPage} />} />
          <Route path="emergency" element={<Screen component={EmergencySOSPage} />} />
          <Route path="mess" element={<Screen component={MessManagementPage} />} />
          <Route path="feedback" element={<Screen component={FeedbackPage} />} />
          <Route path="reports" element={<Screen component={ReportsPage} />} />
          <Route path="settings" element={<Screen component={SettingsPage} />} />
          <Route path="notifications" element={<Screen component={NotificationsPage} />} />
        </Route>
      </Route>

      {/* Warden Module */}
      <Route element={<ProtectedRoute roles={["warden"]} />}>
        <Route path="/warden" element={<DashboardLayout role="warden" />}>
          <Route index element={<Screen component={WardenDashboard} />} />
          <Route path="students" element={<Screen component={StudentManagementPage} />} />
          <Route path="students/:id" element={<Screen component={StudentProfilePage} />} />
          <Route path="rooms" element={<Screen component={RoomManagementPage} />} />
          <Route path="allocations" element={<Screen component={BedAllocationPage} />} />
          <Route path="requests" element={<Screen component={LeaveManagementPage} />} />
          <Route path="complaints" element={<Screen component={ComplaintManagementPage} />} />
          <Route path="maintenance" element={<Screen component={MaintenancePage} />} />
          <Route path="gate" element={<Screen component={GateManagementPage} />} />
          <Route path="visitors" element={<Screen component={VisitorManagementPage} />} />
          <Route path="announcements" element={<Screen component={AnnouncementsPage} />} />
          <Route path="emergency" element={<Screen component={EmergencySOSPage} />} />
          <Route path="messages" element={<Screen component={MessagesPage} />} />
          <Route path="notifications" element={<Screen component={NotificationsPage} />} />
        </Route>
      </Route>

      {/* Student Module */}
      <Route element={<ProtectedRoute roles={["student"]} />}>
        <Route path="/student" element={<DashboardLayout role="student" />}>
          <Route index element={<Screen component={StudentDashboard} />} />
          <Route path="profile" element={<Screen component={StudentProfilePage} />} />
          <Route path="room" element={<Screen component={StudentRoomPage} />} />
          <Route path="fees" element={<Screen component={FeeManagementPage} />} />
          <Route path="complaints" element={<Screen component={ComplaintManagementPage} />} />
          <Route path="local-outing" element={<Screen component={StudentLeavePage} mode="local-outing" />} />
          <Route path="home-visit" element={<Screen component={StudentLeavePage} mode="home-visit" />} />
          <Route path="emergency-leave" element={<Screen component={StudentLeavePage} mode="emergency-leave" />} />
          <Route path="qr-pass" element={<Screen component={StudentQRPassPage} />} />
          <Route path="movement-history" element={<Screen component={StudentMovementHistoryPage} />} />
          <Route path="visitors" element={<Screen component={StudentVisitorPage} />} />
          <Route path="mess" element={<Screen component={MessManagementPage} />} />
          <Route path="feedback" element={<Screen component={FeedbackPage} />} />
          <Route path="messages" element={<Screen component={MessagesPage} />} />
          <Route path="hostel-info" element={<Screen component={HostelInfoPage} />} />
          <Route path="notifications" element={<Screen component={NotificationsPage} />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

