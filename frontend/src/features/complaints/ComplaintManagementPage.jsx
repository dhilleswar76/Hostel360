import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { DataTable, EmptyState, LoadingState, Modal, SectionHeading, StatCard, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { getApiError } from "../../lib/api.js";
import api from "../../lib/api.js";

const categories = [
  { value: "electrical", label: "Electricity" },
  { value: "plumbing", label: "Plumbing" },
  { value: "cleaning", label: "Cleaning" },
  { value: "room_maintenance", label: "Room Maintenance" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "water_supply", label: "Water Supply" },
  { value: "food", label: "Food Quality" },
  { value: "other", label: "Other" },
];

const states = ["pending", "assigned", "in_progress", "resolved", "rejected"];
const tone = (status) =>
  status === "resolved" ? "success" : status === "rejected" ? "danger" : status === "in_progress" || status === "assigned" ? "info" : "warning";

function nice(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ComplaintManagementPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [filters, setFilters] = useState({ q: "", category: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get("/complaints", { params: { category: filters.category || undefined, status: filters.status || undefined } }),
        !isStudent ? api.get("/complaints/stats").catch(() => null) : Promise.resolve(null),
      ]);
      setRows(listRes.data.data || []);
      if (statsRes?.data?.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (e) {
      setError(getApiError(e, "Unable to load complaints."));
    } finally {
      setLoading(false);
    }
  }, [filters, isStudent]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isStudent) {
      api.get("/complaints/assignees")
        .then((res) => setAssignees(res.data.data || []))
        .catch(() => setAssignees([]));
    }
  }, [isStudent]);

  async function submit(event) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await api.post("/complaints", {
        title: String(f.get("title")).trim(),
        category: String(f.get("category")),
        priority: String(f.get("priority") || "normal"),
        description: String(f.get("description")).trim(),
      });
      setNotice("Complaint registered successfully. A warden will review it shortly.");
      setCreateOpen(false);
      await load();
    } catch (e) {
      setError(getApiError(e, "Could not submit complaint."));
    } finally {
      setSaving(false);
    }
  }

  async function update(event) {
    event.preventDefault();
    if (!selected) return;
    const f = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await api.patch(`/complaints/${selected._id}/status`, {
        status: String(f.get("status")),
        assignedTo: String(f.get("assignedTo") || "") || undefined,
        remarks: String(f.get("remarks") || "").trim(),
      });
      setNotice("Complaint updated successfully.");
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (e) {
      setError(getApiError(e, "Could not update complaint."));
    } finally {
      setSaving(false);
    }
  }

  const statsCards = stats
    ? [
        { label: "Total complaints", value: String(stats.total), change: "All complaints", tone: "blue", icon: "MessageSquareWarning" },
        { label: "Pending", value: String(stats.pending), change: "Needs review", tone: "amber", icon: "Clock" },
        { label: "In progress", value: String(stats.inProgress + stats.assigned), change: "Work ongoing", tone: "blue", icon: "Wrench" },
        { label: "Resolved", value: String(stats.resolved), change: "Closed successfully", tone: "green", icon: "CheckCircle" },
      ]
    : [];

  const columns = [
    {
      key: "title",
      title: "Complaint",
      render: (r) => (
        <span className="management-primary">
          {r.title}
          <small>
            {nice(r.category)} · {new Date(r.createdAt).toLocaleDateString()}
          </small>
        </span>
      ),
    },
    ...(!isStudent
      ? [
          {
            key: "student",
            title: "Student Resident",
            render: (r) => (
              <span className="management-primary">
                {r.student?.user?.name || "Student"}
                <small>
                  {r.student?.studentId || ""} · {r.student?.room ? `Room ${r.student.room.roomNumber}` : "Unallocated"}
                </small>
              </span>
            ),
          },
        ]
      : []),
    {
      key: "priority",
      title: "Priority",
      render: (r) => (
        <StatusBadge tone={r.priority === "urgent" || r.priority === "high" ? "danger" : "neutral"}>
          {nice(r.priority || "normal")}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (r) => <StatusBadge tone={tone(r.status)}>{nice(r.status)}</StatusBadge>,
    },
    {
      key: "assignee",
      title: "Assigned To",
      render: (r) => r.assignedTo?.name || "Unassigned",
    },
    {
      key: "actions",
      title: "Actions",
      className: "actions-cell",
      render: (r) => (
        <div className="row-actions">
          <button className="row-action" onClick={() => setSelected(r)}>
            Details
          </button>
          {!isStudent && r.status !== "resolved" && r.status !== "rejected" && (
            <button
              className="row-action approve"
              onClick={() => {
                setSelected(r);
                setEditOpen(true);
              }}
            >
              Update
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title={isStudent ? "My Complaints" : "Complaint Management"}
        subtitle={
          isStudent
            ? "Submit maintenance issues (electrical, Wi-Fi, plumbing) and track resolution in real time."
            : "Review, assign maintenance staff to, and resolve hostel resident complaints."
        }
        action={
          isStudent ? (
            <button className="primary-action" onClick={() => setCreateOpen(true)}>
              <Icon name="Plus" size={16} />
              Register Complaint
            </button>
          ) : undefined
        }
      />

      {notice && <div className="management-alert success" role="status">{notice}</div>}
      {error && <div className="management-alert error" role="alert">{error}</div>}

      {statsCards.length > 0 && (
        <div className="stat-grid complaint-stat-grid">
          {statsCards.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
        </div>
      )}

      <div className="management-filters">
        <label>
          <select
            aria-label="Category"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select
            aria-label="Complaint status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {states.map((s) => (
              <option value={s} key={s}>
                {nice(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState label="Loading complaints from MongoDB…" />
      ) : rows.length ? (
        <section className="panel management-table-panel">
          <div className="management-table-heading">
            <div>
              <h3>{isStudent ? "My Registered Complaints" : "Resident Complaints"}</h3>
              <p>{rows.length} complaints listed</p>
            </div>
            <span className="live-data-chip">
              <i /> Live MongoDB
            </span>
          </div>
          <DataTable columns={columns} rows={rows} />
        </section>
      ) : (
        <EmptyState
          title={isStudent ? "No complaints registered" : "No complaints found"}
          description={
            isStudent
              ? "Everything looks good! Click Register Complaint if you have an issue with room facilities."
              : "No complaints match your selected filters."
          }
          action={
            isStudent ? (
              <button className="primary-action" onClick={() => setCreateOpen(true)}>
                Register Complaint
              </button>
            ) : undefined
          }
        />
      )}

      {/* Register Complaint Modal */}
      {createOpen && (
        <Modal
          title="Register a Complaint"
          subtitle="Your assigned hostel warden and maintenance team will be notified."
          onClose={() => setCreateOpen(false)}
        >
          <form className="modal-form" onSubmit={submit}>
            <label>
              Subject / Title
              <input name="title" minLength={3} maxLength={150} required placeholder="e.g. Wi-Fi router in corridor not working" />
            </label>
            <label>
              Category
              <select name="category" required>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority" defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label>
              Detailed description
              <textarea
                name="description"
                minLength={10}
                maxLength={3000}
                rows={4}
                required
                placeholder="Describe what is broken, when it started, and specific location"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? "Submitting…" : "Register Complaint"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details & History Modal */}
      {selected && !editOpen && (
        <Modal
          title={selected.title}
          subtitle={`${nice(selected.category)} · ${selected.student?.user?.name || "Student"}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="detail-list">
            <div>
              <span>Status</span>
              <StatusBadge tone={tone(selected.status)}>{nice(selected.status)}</StatusBadge>
            </div>
            <div>
              <span>Priority</span>
              <strong>{nice(selected.priority || "normal")}</strong>
            </div>
            <div>
              <span>Submitted</span>
              <strong>{new Date(selected.createdAt).toLocaleString()}</strong>
            </div>
            <div>
              <span>Assigned staff</span>
              <strong>{selected.assignedTo?.name || "Unassigned"}</strong>
            </div>
            <div className="stacked-detail">
              <span>Description</span>
              <p style={{ marginTop: "4px", color: "#334155" }}>{selected.description}</p>
            </div>
            {selected.remarks && (
              <div className="stacked-detail">
                <span>Warden / Staff remarks</span>
                <p style={{ marginTop: "4px", color: "#4f46e5", fontWeight: 500 }}>{selected.remarks}</p>
              </div>
            )}
            {selected.resolution && (
              <div className="stacked-detail">
                <span>Resolution notes</span>
                <p style={{ marginTop: "4px", color: "#16a34a", fontWeight: 500 }}>{selected.resolution}</p>
              </div>
            )}
          </div>

          <h3 className="history-heading" style={{ marginTop: "18px", fontSize: "14px", fontWeight: 600 }}>
            Resolution Audit Trail
          </h3>
          {selected.history?.length ? (
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {[...selected.history].reverse().map((h, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 12px",
                    background: "#f8fafc",
                    borderRadius: "6px",
                    borderLeft: "3px solid #4f46e5",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{nice(h.status)}</strong>
                    <span style={{ color: "#94a3b8" }}>{new Date(h.changedAt).toLocaleString()}</span>
                  </div>
                  <p style={{ margin: "2px 0 0 0", color: "#64748b" }}>{h.remark || "Status updated"}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No history" description="Status updates will be logged here." />
          )}

          <div className="modal-actions" style={{ marginTop: "18px" }}>
            <button className="outline-button" onClick={() => setSelected(null)}>
              Close
            </button>
            {!isStudent && selected.status !== "resolved" && selected.status !== "rejected" && (
              <button className="primary-action" onClick={() => setEditOpen(true)}>
                Update Complaint
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Update Complaint Modal */}
      {selected && editOpen && (
        <Modal title="Update Complaint Status" subtitle={selected.title} onClose={() => setEditOpen(false)}>
          <form className="modal-form" onSubmit={update}>
            <label>
              Status
              <select name="status" defaultValue={selected.status}>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {nice(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assign to staff / warden
              <select name="assignedTo" defaultValue={selected.assignedTo?._id || ""}>
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Remarks / Progress update for resident
              <textarea name="remarks" rows={3} maxLength={1000} placeholder="Add progress notes or resolution details" />
            </label>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? "Saving…" : "Save Update"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

