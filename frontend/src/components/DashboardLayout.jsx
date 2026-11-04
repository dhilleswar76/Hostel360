import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleNames, roleNavigation } from "../data/dashboardData.js";
import { Icon } from "./Icon.jsx";
import api from "../lib/api.js";
import { format12HourTime } from "../lib/dateTime.js";

export function DashboardLayout({ role }) {
  const { user, logout, success, clearMessages } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [params, setParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(params.get("q") || "");
  const searchInput = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const base = `/${role}`;
  const nav = roleNavigation[role] || [];

  const pageTitle = useMemo(() => {
    const current = nav.find((item) => item.path === location.pathname);
    return current?.label || "HOSTEL360";
  }, [nav, location.pathname]);

  // Load real notifications from backend
  useEffect(() => {
    let mounted = true;
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get("/notifications");
        if (mounted) {
          setLiveNotifications(data.data || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Ignored
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setSearchTerm(params.get("q") || "");
  }, [params]);

  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchInput.current?.focus());
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("q") || "").trim();
    const next = new URLSearchParams(params);
    if (query) next.set("q", query);
    else next.delete("q");

    if (query && location.pathname === base) {
      const target = role === "student" ? `${base}/complaints` : `${base}/students`;
      navigate({ pathname: target, search: `?q=${encodeURIComponent(query)}` });
    } else {
      setParams(next);
    }
  }

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setLiveNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignored
    }
  };

  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Link to={base} className="brand-lockup">
            <span className="brand-mark">
              <Icon name="Building2" size={19} />
            </span>
            <span className="brand-name font-bold tracking-wide">
              HOSTEL<span className="text-indigo-400">360</span>
            </span>
          </Link>
          <button
            className="sidebar-collapse"
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon name={collapsed ? "PanelLeftOpen" : "PanelLeftClose"} size={18} />
          </button>
        </div>

        <div className="workspace-label">MANAGEMENT CONSOLE</div>

        <nav className="sidebar-nav" aria-label={`${roleNames[role]} navigation`}>
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === base}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <Icon name={item.icon} size={18} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {role === "student" && (
            <Link
              to="/student/emergency-leave"
              className="quick-action"
              style={{
                background: "#fee2e2",
                borderColor: "#fca5a5",
                color: "#b91c1c",
                marginBottom: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Icon name="Siren" size={16} />
              <span>Emergency SOS</span>
            </Link>
          )}

          <div className="sidebar-user">
            <span className="avatar">{user?.name?.slice(0, 1).toUpperCase() || "H"}</span>
            <div className="sidebar-user-info">
              <strong>{user?.name || "Hostel360 User"}</strong>
              <span>{roleNames[role]}</span>
            </div>
            <button title="Sign out" className="sidebar-logout" onClick={() => void signOut()}>
              <Icon name="LogOut" size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="Menu" />
            </button>
            <div className="breadcrumbs">
              <span>{roleNames[role]} Portal</span>
              <Icon name="ChevronRight" size={14} />
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="mobile-search-toggle icon-button"
              aria-label={searchOpen ? "Close search" : "Open search"}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Icon name={searchOpen ? "X" : "Search"} size={17} />
            </button>
            <form className={`global-search${searchOpen ? " mobile-search-open" : ""}`} onSubmit={submitSearch}>
              <Icon name="Search" size={17} />
              <input
                ref={searchInput}
                name="q"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search students, rooms, fees..."
                aria-label="Search dashboard"
              />
              <kbd>⌘ K</kbd>
            </form>

            {/* Notifications Popover */}
            <div className="pop-anchor">
              <button
                className={`icon-button notification-button${notificationsOpen ? " selected" : ""}`}
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
              >
                <Icon name="Bell" size={19} />
                {unreadCount > 0 && <i />}
              </button>
              {notificationsOpen && (
                <div className="popover notification-popover" style={{ width: "320px", maxHeight: "400px", overflowY: "auto" }}>
                  <div className="popover-head" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9" }}>
                    <strong>Notifications</strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{unreadCount} unread</span>
                  </div>
                  {liveNotifications.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      No notifications yet
                    </div>
                  ) : (
                    liveNotifications.slice(0, 6).map((item) => (
                      <button
                        key={item._id}
                        className={`notification-item${!item.isRead ? " unread" : ""}`}
                        style={{ width: "100%", textAlign: "left", display: "flex", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #f8fafc" }}
                        onClick={() => markNotificationRead(item._id)}
                      >
                        <span className="notification-dot">
                          <Icon name={item.type === "emergency" ? "Siren" : item.type === "payment" ? "CircleDollarSign" : item.type === "leave" ? "ClipboardCheck" : "Bell"} size={16} />
                        </span>
                        <span style={{ flex: 1 }}>
                          <strong style={{ display: "block", fontSize: "13px" }}>{item.title}</strong>
                          <small style={{ display: "block", color: "#64748b", fontSize: "11px" }}>{item.message}</small>
                          <em style={{ display: "block", color: "#94a3b8", fontSize: "10px", marginTop: "2px" }}>
                            {format12HourTime(item.createdAt)}
                          </em>
                        </span>
                      </button>
                    ))
                  )}
                  <div style={{ padding: "8px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
                    <Link
                      to={`/${role}/notifications`}
                      onClick={() => setNotificationsOpen(false)}
                      style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 500 }}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Popover */}
            <div className="pop-anchor">
              <button
                className="profile-trigger"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                aria-expanded={profileOpen}
              >
                <span className="avatar">{user?.name?.slice(0, 1).toUpperCase() || "H"}</span>
                <span className="profile-name">{user?.name?.split(" ")[0] || "Account"}</span>
                <Icon name="ChevronDown" size={15} />
              </button>
              {profileOpen && (
                <div className="popover profile-popover">
                  <div className="profile-popover-user">
                    <span className="avatar">{user?.name?.slice(0, 1).toUpperCase() || "H"}</span>
                    <div>
                      <strong>{user?.name}</strong>
                      <small>{user?.email}</small>
                    </div>
                  </div>
                  <Link
                    to={role === "student" ? "/student/profile" : role === "admin" ? "/admin/settings" : "/warden/notifications"}
                    onClick={() => setProfileOpen(false)}
                  >
                    <Icon name={role === "student" ? "UserRound" : role === "admin" ? "Settings2" : "Bell"} size={16} />
                    {role === "student" ? "My profile" : role === "admin" ? "Settings" : "Notifications"}
                  </Link>
                  <button onClick={() => void signOut()}>
                    <Icon name="LogOut" size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {success && (
            <p className="toast-message session-toast" role="status">
              <Icon name="CheckCircle2" size={17} />
              {success}
              <button aria-label="Dismiss message" onClick={clearMessages}>
                <Icon name="X" size={15} />
              </button>
            </p>
          )}
          <Outlet />
        </div>

        <footer className="app-footer">
          <span>© 2026 HOSTEL360 · Smart Living, Perfectly Managed</span>
          <span>Version 2.0 (MERN Production)</span>
        </footer>
      </main>
    </div>
  );
}

