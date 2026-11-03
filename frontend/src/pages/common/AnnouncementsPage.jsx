import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { LoadingState, Modal, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    targetRole: "all",
    block: "",
    priority: "normal",
    expiresAt: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const canPublish = user?.role === "admin" || user?.role === "warden";

  async function loadAnnouncements() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/announcements");
      setAnnouncements(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load announcements."));
    } finally {
      setLoading(false);
    }
  }

  async function loadBlocks() {
    try {
      const res = await api.get("/blocks");
      setBlocks(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadAnnouncements();
    if (canPublish) loadBlocks();
  }, []);

  async function handleMarkRead(id) {
    try {
      await api.patch(`/announcements/${id}/read`);
      setAnnouncements((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/announcements/${id}`);
      await loadAnnouncements();
    } catch (err) {
      alert(getApiError(err, "Failed to delete announcement."));
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      await api.post("/announcements", formData);
      setCreateOpen(false);
      setFormData({
        title: "",
        content: "",
        targetRole: "all",
        block: "",
        priority: "normal",
        expiresAt: "",
      });
      await loadAnnouncements();
    } catch (err) {
      setCreateError(getApiError(err, "Failed to publish announcement."));
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Hostel Circulars & Announcements"
        subtitle="Stay updated with official hostel guidelines, notifications, and emergency alerts."
        action={
          <div className="flex gap-2">
            <button className="button secondary flex items-center gap-2" onClick={loadAnnouncements}>
              <Icon name="RotateCw" size={15} /> Refresh
            </button>
            {canPublish && (
              <button className="button primary flex items-center gap-2" onClick={() => setCreateOpen(true)}>
                <Icon name="Plus" size={15} /> Post Announcement
              </button>
            )}
          </div>
        }
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">{error}</div>}

      {loading ? (
        <LoadingState label="Loading announcements…" />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const isHigh = a.priority === "urgent" || a.priority === "high";
            return (
              <article
                key={a._id}
                className={`p-5 rounded-xl border transition ${
                  isHigh ? "bg-amber-50/50 border-amber-300" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        a.priority === "urgent"
                          ? "bg-rose-600 text-white"
                          : a.priority === "high"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.priority}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                      For: {a.targetRole}
                    </span>
                    {a.block && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                        {a.block.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString()} by {a.author?.name || "Staff"}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">{a.title}</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{a.content}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    {a.expiresAt && (
                      <span className="text-slate-400">
                        Expires: {new Date(a.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.isRead && (
                      <button
                        className="button button-sm secondary text-slate-700"
                        onClick={() => handleMarkRead(a._id)}
                      >
                        Mark as read
                      </button>
                    )}
                    {user?.role === "admin" && (
                      <button
                        className="button button-sm text-rose-600 hover:bg-rose-50 border-0"
                        onClick={() => handleDelete(a._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!announcements.length && (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
              No active announcements right now.
            </div>
          )}
        </div>
      )}

      {createOpen && (
        <Modal
          title="Post Hostel Announcement"
          subtitle="Publish circular to residents and staff"
          onClose={() => setCreateOpen(false)}
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            {createError && <div className="p-2.5 bg-rose-50 text-rose-700 rounded">{createError}</div>}
            <div>
              <label className="block font-semibold mb-1">Title *</label>
              <input
                type="text"
                required
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="e.g. Scheduled Water Maintenance on Sunday"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Target Audience</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                >
                  <option value="all">Everyone</option>
                  <option value="student">Students Only</option>
                  <option value="warden">Wardens Only</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Priority</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Block Specific (Optional)</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                >
                  <option value="">All Blocks</option>
                  {blocks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Expiration Date (Optional)</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 rounded"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Announcement Message *</label>
              <textarea
                rows={4}
                required
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="Full circular details and instructions..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={createLoading}>
                {createLoading ? "Publishing…" : "Publish Now"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

