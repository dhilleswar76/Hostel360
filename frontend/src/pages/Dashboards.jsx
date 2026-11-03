import React, { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { EmptyState, LoadingState, Panel, SectionHeading, StatCard } from "../components/Common.jsx";
import { Icon } from "../components/Icon.jsx";
import { fetchDashboardStats, fetchStudent } from "../features/management/api.js";
import { getApiError } from "../lib/api.js";

const AdminCharts = lazy(() => import("./AdminCharts.jsx"));

function PageIntro({ title, subtitle }) {
  return (
    <div className="page-intro">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span className="date-chip">
        <Icon name="CalendarDays" size={16} />
        {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
      </span>
    </div>
  );
}

function money(value) {
  return `₹${((value || 0) / 100000).toFixed(2)}L`;
}

function useStats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setData)
      .catch((e) => setError(getApiError(e, "Could not load live dashboard data.")))
      .finally(() => setLoading(false));
  }, []);

  return { data, error, loading };
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useStats();
  const s = data?.stats;

  const stats = [
    { label: "Total students", value: String(s?.totalStudents ?? "—"), change: "Active student records", tone: "blue", icon: "GraduationCap", path: "/admin/students" },
    { label: "Total wardens", value: String(s?.totalWardens ?? "—"), change: "Active staff members", tone: "blue", icon: "UsersRound", path: "/admin/staff" },
    { label: "Hostel blocks", value: String(s?.totalBlocks ?? "—"), change: "Configured wings", tone: "blue", icon: "Building2", path: "/admin/blocks" },
    { label: "Total rooms", value: String(s?.totalRooms ?? "—"), change: `${s?.totalCapacity ?? 0} total beds`, tone: "blue", icon: "BedDouble", path: "/admin/rooms" },
    { label: "Occupied beds", value: String(s?.occupiedBeds ?? "—"), change: `${s?.occupancyPercentage ?? 0}% occupancy rate`, tone: "green", icon: "DoorOpen", path: "/admin/rooms" },
    { label: "Available beds", value: String(s?.availableBeds ?? "—"), change: "Ready for allocation", tone: "amber", icon: "Building2", path: "/admin/rooms" },
    { label: "Inside hostel", value: String(s?.studentsInside ?? "—"), change: "Current on-campus count", tone: "green", icon: "UserCheck", path: "/admin/gate" },
    { label: "Outside hostel", value: String(s?.studentsOutside ?? "—"), change: "Recorded on leave / exit", tone: "amber", icon: "MoveRight", path: "/admin/gate" },
    { label: "Total fee collection", value: money(s?.collectedFees || 0), change: `Assigned: ${money(s?.totalFees || 0)}`, tone: "green", icon: "CircleDollarSign", path: "/admin/fees" },
    { label: "Pending fees", value: money(s?.pendingFees || 0), change: "Outstanding balances", tone: "amber", icon: "WalletCards", path: "/admin/fees" },
    { label: "Overdue fees", value: money(s?.overdueFees || 0), change: "Past payment deadline", tone: "rose", icon: "CircleAlert", path: "/admin/fees" },
    { label: "Active visitors", value: String(s?.activeVisitors ?? "0"), change: "Currently checked in", tone: "blue", icon: "ContactRound", path: "/admin/visitors" },
    { label: "Pending leave requests", value: String(s?.pendingApprovals ?? "—"), change: "Awaiting approval", tone: "rose", icon: "ClipboardList", path: "/admin/leave-requests" },
    { label: "Pending complaints", value: String(s?.pendingComplaints ?? "—"), change: `${s?.resolvedComplaints ?? 0} resolved`, tone: "amber", icon: "MessageSquareWarning", path: "/admin/complaints" },
    { label: "Pending maintenance", value: String(s?.pendingMaintenanceCount ?? "0"), change: "Scheduled repair tasks", tone: "blue", icon: "Wrench", path: "/admin/maintenance" },
    { label: "Active emergency alerts", value: String(s?.emergencyAlertsCount ?? "0"), change: s?.emergencyAlertsCount ? "URGENT RESPONSE NEEDED" : "No active SOS alerts", tone: s?.emergencyAlertsCount ? "rose" : "green", icon: "Siren", path: "/admin/emergency" },
  ];

  return (
    <div className="dashboard-page">
      <PageIntro
        title={`Welcome back, ${user?.name?.split(" ")[0] || "Administrator"}`}
        subtitle="Complete HOSTEL360 operational overview of residents, facilities, gate movement, and finances."
      />

      {error && <p className="management-error">{error}</p>}

      {loading ? (
        <LoadingState label="Computing live statistics from MongoDB…" />
      ) : (
        <>
          <div className="stat-grid admin-stat-grid">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>

          <Suspense fallback={<LoadingState label="Loading analytics charts…" />}>
            <AdminCharts />
          </Suspense>

          <div className="lower-grid">
            <Panel title="Recent Gate Movements" subtitle="Latest entry/exit verifications" action={<Link className="panel-link" to="/admin/gate">Open Gate Desk <Icon name="ArrowUpRight" size={15} /></Link>}>
              {(!data?.recentActivities || data.recentActivities.length === 0) ? (
                <EmptyState title="No recent movements" description="Recorded gate entries and exits will appear here." />
              ) : (
                <div className="activity-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {data.recentActivities.map((act, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`stat-icon ${act.tone}`} style={{ width: "32px", height: "32px" }}>
                          <Icon name={act.icon} size={16} />
                        </span>
                        <div>
                          <strong>{act.title}</strong>
                          <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>{act.detail}</p>
                        </div>
                      </div>
                      <small style={{ color: "#94a3b8" }}>{act.time}</small>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Pending Action Center" subtitle="Items requiring administrative attention">
              <div className="detail-list">
                <div>
                  <span>Pending leave approvals</span>
                  <strong>{s?.pendingApprovals ?? "—"}</strong>
                </div>
                <div>
                  <span>Emergency leave applications</span>
                  <strong style={{ color: s?.emergencyLeaveRequests ? "#e11d48" : "inherit" }}>
                    {s?.emergencyLeaveRequests ?? "—"}
                  </strong>
                </div>
                <div>
                  <span>Open complaints</span>
                  <strong>{s?.pendingComplaints ?? "—"}</strong>
                </div>
                <div>
                  <span>Pending fee amount</span>
                  <strong>{money(s?.pendingFees || 0)}</strong>
                </div>
                <div>
                  <span>Active emergency SOS</span>
                  <strong style={{ color: s?.emergencyAlertsCount ? "#e11d48" : "inherit" }}>
                    {s?.emergencyAlertsCount ?? "0"}
                  </strong>
                </div>
              </div>
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link className="panel-link" to="/admin/leave-requests">
                  Review Leaves <Icon name="ArrowUpRight" size={15} />
                </Link>
                <Link className="panel-link" to="/admin/complaints">
                  Manage Complaints <Icon name="ArrowUpRight" size={15} />
                </Link>
                <Link className="panel-link" to="/admin/emergency">
                  Emergency Monitor <Icon name="ArrowUpRight" size={15} />
                </Link>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

export function WardenDashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useStats();
  const s = data?.stats;

  const cards = [
    { label: "My residents", value: String(s?.totalStudents ?? "—"), change: "In your assigned hostel blocks", tone: "blue", icon: "UsersRound", path: "/warden/students" },
    { label: "Assigned rooms", value: String(s?.totalRooms ?? "—"), change: `${s?.totalCapacity ?? 0} total beds`, tone: "blue", icon: "Building2", path: "/warden/rooms" },
    { label: "Occupied beds", value: String(s?.occupiedBeds ?? "—"), change: `${s?.availableBeds ?? 0} vacant beds`, tone: "green", icon: "BedDouble", path: "/warden/rooms" },
    { label: "Pending leave requests", value: String(s?.pendingApprovals ?? "—"), change: `${s?.emergencyLeaveRequests ?? 0} emergency requests`, tone: "amber", icon: "ClipboardCheck", path: "/warden/requests" },
    { label: "Open complaints", value: String(s?.pendingComplaints ?? "—"), change: "Awaiting resolution", tone: "rose", icon: "MessageSquareWarning", path: "/warden/complaints" },
    { label: "Currently outside", value: String(s?.studentsOutside ?? "—"), change: "Recorded on gate exit", tone: "blue", icon: "DoorOpen", path: "/warden/gate" },
    { label: "Active visitors", value: String(s?.activeVisitors ?? "0"), change: "Checked in on campus", tone: "blue", icon: "ContactRound", path: "/warden/visitors" },
    { label: "Pending maintenance", value: String(s?.pendingMaintenanceCount ?? "0"), change: "Block repair tasks", tone: "amber", icon: "Wrench", path: "/warden/maintenance" },
  ];

  return (
    <div className="dashboard-page">
      <PageIntro
        title={`Warden Console: ${user?.name || "Warden"}`}
        subtitle="Operational view restricted to your assigned hostel blocks and students."
      />

      {error && <p className="management-error">{error}</p>}

      {loading ? (
        <LoadingState label="Loading assigned block statistics…" />
      ) : (
        <>
          <div className="stat-grid warden-stat-grid">
            {cards.map((card) => (
              <StatCard key={card.label} stat={card} />
            ))}
          </div>

          <div className="warden-grid">
            <Panel title="Recent Gate Movement" subtitle="Live student arrivals and departures" action={<Link className="panel-link" to="/warden/gate">Verify Passes <Icon name="ArrowUpRight" size={15} /></Link>}>
              {(!data?.recentActivities || data.recentActivities.length === 0) ? (
                <EmptyState title="No recent movements" description="Gate verification movements will display here." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {data.recentActivities.map((act, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", fontSize: "12px" }}>
                      <div>
                        <strong>{act.title}</strong>: {act.detail}
                      </div>
                      <span style={{ color: "#94a3b8" }}>{act.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Assigned Block Actions" subtitle="Approvals and maintenance">
              <div className="detail-list">
                <div>
                  <span>Pending leave applications</span>
                  <strong>{s?.pendingApprovals ?? "—"}</strong>
                </div>
                <div>
                  <span>Emergency leave priority</span>
                  <strong style={{ color: s?.emergencyLeaveRequests ? "#e11d48" : "inherit" }}>
                    {s?.emergencyLeaveRequests ?? "0"}
                  </strong>
                </div>
                <div>
                  <span>Unresolved complaints</span>
                  <strong>{s?.pendingComplaints ?? "—"}</strong>
                </div>
                <div>
                  <span>Pending maintenance tasks</span>
                  <strong>{s?.pendingMaintenanceCount ?? "0"}</strong>
                </div>
              </div>
              <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Link className="panel-link" to="/warden/requests">
                  Review Requests <Icon name="ArrowUpRight" size={15} />
                </Link>
                <Link className="panel-link" to="/warden/complaints">
                  Handle Complaints <Icon name="ArrowUpRight" size={15} />
                </Link>
                <Link className="panel-link" to="/warden/maintenance">
                  Maintenance Tasks <Icon name="ArrowUpRight" size={15} />
                </Link>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function QuickAction({ to, icon, label, subtitle }) {
  return (
    <Link className="quick-action" to={to}>
      <span>
        <Icon name={icon} size={19} />
      </span>
      <strong>{label}</strong>
      <small>{subtitle}</small>
      <i>
        <Icon name="ArrowUpRight" size={16} />
      </i>
    </Link>
  );
}

export function StudentDashboard() {
  const { user, student } = useAuth();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent("me")
      .then(setRecord)
      .catch((e) => setError(getApiError(e, "Student profile is unavailable.")))
      .finally(() => setLoading(false));
  }, []);

  const profile = record?.student;
  const room = profile && typeof profile.room === "object" ? profile.room : null;
  const name = profile?.user?.name || user?.name || "Student";
  const fees = record?.feeSummary;

  return (
    <div className="dashboard-page student-dashboard">
      <PageIntro
        title={`Welcome, ${name.split(" ")[0]}`}
        subtitle="HOSTEL360 Student Self-Service Portal: Accommodation, Fees, Leaves & QR Passes."
      />

      {loading ? (
        <LoadingState label="Loading your student profile…" />
      ) : error ? (
        <p className="management-error">{error}</p>
      ) : (
        <>
          <div className="student-hero">
            <div className="student-hero-copy">
              <span className="hero-label">
                <span /> YOUR HOSTEL360 SPACE
              </span>
              <h2>
                Smart living,
                <br />
                perfectly connected.
              </h2>
              <p>Manage your room, gate passes, simulated fees, and 24/7 emergency support.</p>
              <span className="hero-profile-line">
                {profile?.department || profile?.course || "Undergraduate"} · Year {profile?.year || "1"}
              </span>
              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <Link to="/student/profile" className="hero-button">
                  View Profile <Icon name="ArrowUpRight" size={16} />
                </Link>
                <Link
                  to="/student/emergency-leave"
                  className="hero-button"
                  style={{ background: "#dc2626", borderColor: "#b91c1c" }}
                >
                  <Icon name="Siren" size={16} /> Emergency SOS
                </Link>
              </div>
            </div>

            <div className="hero-id-card">
              <span className="hero-id-icon">
                <Icon name="GraduationCap" size={19} />
              </span>
              <span>
                <small>STUDENT ID</small>
                <strong>{profile?.studentId || student?.studentId || "STU-2026-001"}</strong>
              </span>
              <span className="id-active">{profile?.status?.toUpperCase() || "ACTIVE"}</span>
            </div>
          </div>

          <div className="student-summary-grid">
            <Panel
              title="My Room"
              subtitle="Current accommodation"
              action={
                <Link className="panel-link" to="/student/room">
                  Room Details <Icon name="ArrowUpRight" size={15} />
                </Link>
              }
            >
              <div className="room-summary">
                <span className="room-icon">
                  <Icon name="BedDouble" size={22} />
                </span>
                <div>
                  <span className="muted-label">
                    {room && typeof room.block === "object" ? room.block.name : "HOSTEL WING"}
                  </span>
                  <strong>{room ? `Room ${room.roomNumber}` : "No room allocated"}</strong>
                  <small>
                    {room
                      ? `Floor ${room.floor} · ${room.type?.toUpperCase()} · ₹${room.monthlyFee?.toLocaleString()}/mo`
                      : "Please request your hostel warden for room allocation."}
                  </small>
                </div>
              </div>
            </Panel>

            <Panel
              title="Fee Status"
              subtitle="Hostel and Mess Fees"
              action={
                <Link className="panel-link" to="/student/fees">
                  Pay / View Fees <Icon name="ArrowUpRight" size={15} />
                </Link>
              }
            >
              <div className="fee-summary">
                <span className="fee-icon">
                  <Icon name="WalletCards" size={19} />
                </span>
                <div>
                  <span className="muted-label">PAYMENTS RECORDED</span>
                  <strong>₹{(fees?.paid || 0).toLocaleString("en-IN")}</strong>
                  <small style={{ color: (fees?.pending || 0) > 0 ? "#dc2626" : "#16a34a" }}>
                    ₹{(fees?.pending || 0).toLocaleString("en-IN")} pending balance
                  </small>
                </div>
              </div>
            </Panel>

            <Panel title="Campus Status" subtitle="Latest gate movement">
              <div className="campus-status">
                <span className="status-pulse">
                  <Icon name="House" size={19} />
                </span>
                <div>
                  <strong>{record?.movement?.status === "outside" ? "Currently Outside Hostel" : "Currently Inside Hostel"}</strong>
                  <small>
                    {record?.movement?.occurredAt
                      ? `Last movement: ${new Date(record.movement.occurredAt).toLocaleString()}`
                      : "No gate movements recorded today."}
                  </small>
                </div>
              </div>
              <Link to="/student/movement-history" className="movement-link">
                View Movement Log <Icon name="ArrowUpRight" size={15} />
              </Link>
            </Panel>
          </div>

          <div className="student-lower-grid">
            <Panel title="Student Quick Services" subtitle="Direct access to hostel services">
              <div className="quick-action-grid">
                <QuickAction to="/student/qr-pass" icon="QrCode" label="My QR Pass" subtitle="Active gate pass" />
                <QuickAction to="/student/local-outing" icon="MapPin" label="Local Outing" subtitle="Day pass application" />
                <QuickAction to="/student/home-visit" icon="House" label="Home Visit" subtitle="Overnight / weekend" />
                <QuickAction to="/student/emergency-leave" icon="Siren" label="Emergency Leave" subtitle="Urgent departure" />
                <QuickAction to="/student/complaints" icon="Wrench" label="Report Issue" subtitle="Room / facilities" />
                <QuickAction to="/student/visitors" icon="ContactRound" label="Visitor Pass" subtitle="Pre-register guests" />
                <QuickAction to="/student/mess" icon="Utensils" label="Mess Schedule" subtitle="Weekly food menu" />
                <QuickAction to="/student/messages" icon="MessageSquare" label="Message Warden" subtitle="Direct inquiry" />
              </div>
            </Panel>

            <Panel title="Pending Status & Updates" subtitle="Your requests">
              <div className="detail-list">
                <div>
                  <span>Pending leave requests</span>
                  <strong>{record?.pendingRequests ?? 0}</strong>
                </div>
                <div>
                  <span>Active gate pass</span>
                  <strong>{record?.movement?.status === "outside" ? "Active (Out)" : "Ready"}</strong>
                </div>
                <div>
                  <span>Hostel block</span>
                  <strong>{room?.block?.name || "Main Campus"}</strong>
                </div>
                <div>
                  <span>Warden contact</span>
                  <strong>Available in directory</strong>
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <Link to="/student/hostel-info" className="panel-link">
                  View Rules & Timings <Icon name="ArrowUpRight" size={15} />
                </Link>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

