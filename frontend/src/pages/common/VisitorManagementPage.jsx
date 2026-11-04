import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Modal, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { format12HourDateTime, format12HourTime } from "../../lib/dateTime.js";

export function VisitorManagementPage() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // New visitor modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    student: "",
    name: "",
    phone: "",
    purpose: "",
    expectedAt: "",
    identityType: "national_id",
    identityLast4: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadVisitors() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/visitors", { params });
      setVisitors(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load visitors."));
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const res = await api.get("/students", { params: { limit: 100 } });
      setStudents(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadVisitors();
  }, [statusFilter]);

  useEffect(() => {
    loadStudents();
  }, []);

  async function handleCheckIn(id) {
    try {
      await api.patch(`/visitors/${id}/check-in`);
      await loadVisitors();
    } catch (err) {
      alert(getApiError(err, "Check-in failed."));
    }
  }

  async function handleCheckOut(id) {
    try {
      await api.patch(`/visitors/${id}/check-out`);
      await loadVisitors();
    } catch (err) {
      alert(getApiError(err, "Check-out failed."));
    }
  }

  async function handleCreateVisitor(e) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      await api.post("/visitors", formData);
      setModalOpen(false);
      setFormData({
        student: "",
        name: "",
        phone: "",
        purpose: "",
        expectedAt: "",
        identityType: "national_id",
        identityLast4: "",
      });
      await loadVisitors();
    } catch (err) {
      setFormError(getApiError(err, "Failed to register visitor."));
    } finally {
      setFormLoading(false);
    }
  }

  const columns = [
    {
      key: "visitor",
      title: "Visitor Info",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500">Phone: {row.phone}</div>
          {row.identityLast4 && (
            <div className="text-[10px] text-slate-400">
              ID: {row.identityType} (****{row.identityLast4})
            </div>
          )}
        </div>
      ),
    },
    {
      key: "student",
      title: "Visiting Student",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.student?.user?.name || "Student"}</div>
          <div className="text-xs text-slate-500">
            {row.student?.room?.block?.code ? `${row.student.room.block.code} - Rm ${row.student.room.roomNumber}` : "Room Unassigned"}
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      title: "Purpose",
      render: (row) => <span className="text-xs text-slate-700">{row.purpose}</span>,
    },
    {
      key: "timing",
      title: "Expected / Arrival",
      render: (row) => (
        <div className="text-xs">
          <div>Expected: {format12HourDateTime(row.expectedAt)}</div>
          {row.checkedInAt && <div className="text-emerald-700 font-medium">In: {format12HourTime(row.checkedInAt)}</div>}
          {row.checkedOutAt && <div className="text-slate-500">Out: {format12HourTime(row.checkedOutAt)}</div>}
        </div>
      ),
    },
    {
      key: "token",
      title: "Pass Token",
      render: (row) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
          {row.passToken ? row.passToken.slice(0, 16) : "None"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (row) => {
        const tones = {
          expected: "neutral",
          checked_in: "positive",
          checked_out: "warn",
        };
        return <StatusBadge tone={tones[row.status] || "neutral"}>{row.status.replace("_", " ").toUpperCase()}</StatusBadge>;
      },
    },
    {
      key: "actions",
      title: "Action",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "expected" && (
            <button className="button button-sm primary" onClick={() => handleCheckIn(row._id)}>
              Check-In
            </button>
          )}
          {row.status === "checked_in" && (
            <button className="button button-sm secondary" onClick={() => handleCheckOut(row._id)}>
              Check-Out
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Visitor Desk Management"
        subtitle="Register campus guests, verify visitor identity tokens, and track entry/exit logs."
        action={
          <div className="flex gap-2">
            <button className="button secondary flex items-center gap-2" onClick={loadVisitors}>
              <Icon name="RotateCw" size={15} /> Refresh
            </button>
            <button className="button primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
              <Icon name="Plus" size={15} /> Register Visitor
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {["all", "expected", "checked_in", "checked_out"].map((filter) => (
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

      <Panel title={`Visitor Logs (${visitors.length})`}>
        {loading ? <LoadingState label="Loading visitors…" /> : <DataTable columns={columns} rows={visitors} />}
      </Panel>

      {modalOpen && (
        <Modal
          title="Register New Visitor"
          subtitle="Generate a verified visitor pass token"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleCreateVisitor} className="space-y-4 text-xs">
            {formError && <div className="p-2.5 bg-rose-50 text-rose-700 rounded">{formError}</div>}

            <div>
              <label className="block font-semibold mb-1">Resident to Visit *</label>
              <select
                className="w-full p-2 border border-slate-300 rounded bg-white"
                required
                value={formData.student}
                onChange={(e) => setFormData({ ...formData, student: e.target.value })}
              >
                <option value="">-- Choose Resident --</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.user?.name} ({s.room?.roomNumber ? `Rm ${s.room.roomNumber}` : "No Rm"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Visitor Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-300 rounded"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  className="w-full p-2 border border-slate-300 rounded"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Expected Arrival Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full p-2 border border-slate-300 rounded"
                  value={formData.expectedAt}
                  onChange={(e) => setFormData({ ...formData, expectedAt: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">ID Document Type</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={formData.identityType}
                  onChange={(e) => setFormData({ ...formData, identityType: e.target.value })}
                >
                  <option value="national_id">Aadhaar / National ID</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                  <option value="other">Other Photo ID</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">ID Last 4 Digits</label>
                <input
                  type="text"
                  maxLength={4}
                  className="w-full p-2 border border-slate-300 rounded"
                  placeholder="e.g. 5678"
                  value={formData.identityLast4}
                  onChange={(e) => setFormData({ ...formData, identityLast4: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Purpose of Visit *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-300 rounded"
                  placeholder="e.g. Family visit, document handover"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={formLoading}>
                {formLoading ? "Registering…" : "Register & Issue Pass"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

