import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Modal, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function MaintenancePage() {
  const [tasks, setTasks] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "plumbing",
    priority: "medium",
    block: "",
    deadline: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit/Update Modal
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("in_progress");
  const [updateRemarks, setUpdateRemarks] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState("");

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/maintenance", { params });
      setTasks(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load maintenance tasks."));
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
    loadTasks();
  }, [statusFilter]);

  useEffect(() => {
    loadBlocks();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      await api.post("/maintenance", formData);
      setCreateOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "plumbing",
        priority: "medium",
        block: "",
        deadline: "",
      });
      await loadTasks();
    } catch (err) {
      setCreateError(getApiError(err, "Failed to create task."));
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!selectedTask) return;
    setUpdateLoading(true);
    setUpdateError("");
    try {
      await api.put(`/maintenance/${selectedTask._id}`, {
        status: updateStatus,
        remarks: updateRemarks,
        completionRemarks: updateStatus === "completed" ? updateRemarks : undefined,
      });
      setEditOpen(false);
      setSelectedTask(null);
      setUpdateRemarks("");
      await loadTasks();
    } catch (err) {
      setUpdateError(getApiError(err, "Failed to update task."));
    } finally {
      setUpdateLoading(false);
    }
  }

  const columns = [
    {
      key: "task",
      title: "Task & Location",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.title}</div>
          <div className="text-xs text-slate-500">
            {row.block?.name || "Hostel Block"} {row.room?.roomNumber ? `• Rm ${row.room.roomNumber}` : ""}
          </div>
          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{row.description}</p>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
      render: (row) => (
        <span className="capitalize px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
          {row.category}
        </span>
      ),
    },
    {
      key: "priority",
      title: "Priority",
      render: (row) => {
        const colors = {
          low: "bg-slate-100 text-slate-700",
          medium: "bg-blue-100 text-blue-800",
          high: "bg-amber-100 text-amber-800",
          urgent: "bg-rose-100 text-rose-800 font-bold",
        };
        return <span className={`px-2 py-0.5 rounded text-xs uppercase ${colors[row.priority] || ""}`}>{row.priority}</span>;
      },
    },
    {
      key: "deadline",
      title: "Deadline",
      render: (row) => (row.deadline ? <span className="text-xs">{new Date(row.deadline).toLocaleDateString()}</span> : <span className="text-xs text-slate-400">None</span>),
    },
    {
      key: "status",
      title: "Status",
      render: (row) => {
        const tones = {
          pending: "warn",
          assigned: "neutral",
          in_progress: "info",
          completed: "positive",
          cancelled: "neutral",
        };
        return <StatusBadge tone={tones[row.status] || "neutral"}>{row.status.replace("_", " ").toUpperCase()}</StatusBadge>;
      },
    },
    {
      key: "actions",
      title: "Action",
      render: (row) => (
        <button
          className="button button-sm secondary"
          onClick={() => {
            setSelectedTask(row);
            setUpdateStatus(row.status);
            setUpdateRemarks("");
            setEditOpen(true);
          }}
        >
          Update
        </button>
      ),
    },
  ];

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Hostel Maintenance & Repairs"
        subtitle="Schedule preventative upkeep, track repairs, and manage work orders across hostel blocks."
        action={
          <div className="flex gap-2">
            <button className="button secondary flex items-center gap-2" onClick={loadTasks}>
              <Icon name="RotateCw" size={15} /> Refresh
            </button>
            <button className="button primary flex items-center gap-2" onClick={() => setCreateOpen(true)}>
              <Icon name="Plus" size={15} /> New Work Order
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {["all", "pending", "assigned", "in_progress", "completed"].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition ${
              statusFilter === filter
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {filter.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">{error}</div>}

      <Panel title={`Maintenance Orders (${tasks.length})`}>
        {loading ? <LoadingState label="Loading maintenance tasks…" /> : <DataTable columns={columns} rows={tasks} />}
      </Panel>

      {createOpen && (
        <Modal
          title="Create Maintenance Work Order"
          subtitle="Assign maintenance to facilities or external vendor"
          onClose={() => setCreateOpen(false)}
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            {createError && <div className="p-2.5 bg-rose-50 text-rose-700 rounded">{createError}</div>}
            <div>
              <label className="block font-semibold mb-1">Issue / Task Title *</label>
              <input
                type="text"
                required
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="e.g. Water geyser leaking on 2nd floor"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Hostel Block *</label>
                <select
                  required
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                >
                  <option value="">-- Choose Block --</option>
                  {blocks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="furniture">Carpentry / Furniture</option>
                  <option value="civil">Civil / Masonry</option>
                  <option value="appliance">HVAC / Appliances</option>
                  <option value="cleaning">Cleaning / Hygiene</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Priority</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Target Deadline</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 rounded"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Detailed Description *</label>
              <textarea
                rows={3}
                required
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="Specific problem details, room number, or notes for technicians..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={createLoading}>
                {createLoading ? "Creating…" : "Save Work Order"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editOpen && selectedTask && (
        <Modal
          title="Update Maintenance Order"
          subtitle={selectedTask.title}
          onClose={() => setEditOpen(false)}
        >
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            {updateError && <div className="p-2.5 bg-rose-50 text-rose-700 rounded">{updateError}</div>}
            <div>
              <label className="block font-semibold mb-1">Status</label>
              <select
                className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Work / Completion Remarks</label>
              <textarea
                rows={3}
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="Technician details, parts replaced, or completion notes..."
                value={updateRemarks}
                onChange={(e) => setUpdateRemarks(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={updateLoading}>
                {updateLoading ? "Saving…" : "Update Order"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

