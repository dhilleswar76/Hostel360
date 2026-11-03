import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { LoadingState, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data?.data || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      setError(getApiError(err, "Failed to load notifications."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleMarkRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.post("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      alert(getApiError(err, "Failed to mark all as read."));
    }
  }

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Alerts & System Notifications"
        subtitle="Live event log for payments, leaves, security scans, maintenance, and administrative circulars."
        action={
          <div className="flex gap-2">
            <button className="button secondary flex items-center gap-2" onClick={loadNotifications}>
              <Icon name="RotateCw" size={15} /> Refresh
            </button>
            {unreadCount > 0 && (
              <button className="button primary flex items-center gap-2" onClick={handleMarkAllRead}>
                <Icon name="Check" size={15} /> Mark All as Read
              </button>
            )}
          </div>
        }
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

      <Panel title={`Notification Feed (${unreadCount} Unread)`}>
        {loading ? (
          <LoadingState label="Fetching your notifications…" />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const typeIcons = {
                emergency: "Siren",
                leave: "CalendarDays",
                complaint: "MessageSquareWarning",
                fee: "WalletCards",
                visitor: "ContactRound",
                gate: "DoorOpen",
                system: "Bell",
              };
              const isEmergency = n.type === "emergency";
              return (
                <div
                  key={n._id}
                  className={`p-4 rounded-xl border transition flex items-start justify-between gap-3 ${
                    isEmergency
                      ? "bg-rose-50 border-rose-300"
                      : !n.isRead
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`p-2 rounded-lg mt-0.5 ${
                        isEmergency
                          ? "bg-rose-600 text-white"
                          : !n.isRead
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon name={typeIcons[n.type] || "Bell"} size={16} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                        <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {n.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">{n.message}</p>
                      <span className="text-[11px] text-slate-400 mt-2 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      className="button button-sm secondary text-xs text-slate-600"
                      onClick={() => handleMarkRead(n._id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
            {!notifications.length && (
              <div className="text-center text-slate-400 text-xs py-10">
                You have no notifications at the moment.
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

