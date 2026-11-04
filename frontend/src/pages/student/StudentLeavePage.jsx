import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { format12HourDateTime, toISOFromLocal } from "../../lib/dateTime.js";

const TYPE_CONFIG = {
  "local-outing": {
    label: "Local Outing",
    dbType: "local_outing",
    desc: "Apply for daytime outings (shopping, library, local errands) returning before curfew.",
    icon: "MapPin",
  },
  "home-visit": {
    label: "Home Visit / Vacation",
    dbType: "home_visit",
    desc: "Apply for weekend trips, semester vacations, or festival home stays.",
    icon: "House",
  },
  "emergency-leave": {
    label: "Emergency Leave",
    dbType: "emergency_leave",
    desc: "Urgent leave request for personal or family medical situations.",
    icon: "Siren",
  },
};

export function StudentLeavePage({ mode = "local-outing" }) {
  const config = TYPE_CONFIG[mode] || TYPE_CONFIG["local-outing"];

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    destination: "",
    emergencyContact: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function loadMyLeaves() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/leaves", { params: { type: config.dbType } });
      setLeaves(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load leave history."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyLeaves();
  }, [mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg("");
    try {
      await api.post("/leaves", {
        ...formData,
        startDate: toISOFromLocal(formData.startDate),
        endDate: toISOFromLocal(formData.endDate),
        leaveType: config.dbType,
      });
      setSuccessMsg("Leave application submitted successfully! Your warden will review it.");
      setFormData({
        startDate: "",
        endDate: "",
        reason: "",
        destination: "",
        emergencyContact: "",
      });
      await loadMyLeaves();
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      alert(getApiError(err, "Submission failed."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id) {
    if (!confirm("Are you sure you want to cancel this pending application?")) return;
    try {
      await api.patch(`/leaves/${id}/cancel`);
      await loadMyLeaves();
    } catch (err) {
      alert(getApiError(err, "Failed to cancel leave request."));
    }
  }

  const columns = [
    {
      key: "dates",
      title: "Requested Schedule",
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-900">
            {format12HourDateTime(row.startDate)}
          </div>
          <div className="text-slate-500">
            to {format12HourDateTime(row.endDate)}
          </div>
        </div>
      ),
    },
    {
      key: "details",
      title: "Reason & Destination",
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800">{row.reason}</div>
          {row.destination && <div className="text-slate-500">Destination: {row.destination}</div>}
        </div>
      ),
    },
    {
      key: "status",
      title: "Approval Status",
      render: (row) => {
        const tones = {
          approved: "positive",
          pending: "warn",
          rejected: "negative",
          cancelled: "neutral",
        };
        return <StatusBadge tone={tones[row.status] || "neutral"}>{row.status.toUpperCase()}</StatusBadge>;
      },
    },
    {
      key: "pass",
      title: "Gate Pass",
      render: (row) => {
        if (!row.qrPass) return <span className="text-xs text-slate-400">—</span>;
        return (
          <Link
            to="/student/qr-pass"
            className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100"
          >
            <Icon name="QrCode" size={13} /> View QR Pass
          </Link>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      render: (row) =>
        row.status === "pending" ? (
          <button className="button button-sm text-rose-600 hover:bg-rose-50" onClick={() => handleCancel(row._id)}>
            Cancel
          </button>
        ) : row.reviewNote ? (
          <span className="text-xs text-slate-500 italic" title={row.reviewNote}>Remarks noted</span>
        ) : null,
    },
  ];

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title={`Apply for ${config.label}`}
        subtitle={config.desc}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-1">
          <Panel title={`New ${config.label} Request`}>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-medium">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Departure Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Expected Return Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Destination Address / City *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-300 rounded"
                  placeholder="e.g. Home address or City center"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Emergency / Guardian Contact Phone</label>
                <input
                  type="tel"
                  className="w-full p-2 border border-slate-300 rounded"
                  placeholder="+91 98765 43210"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Purpose / Reason *</label>
                <textarea
                  rows={3}
                  required
                  className="w-full p-2 border border-slate-300 rounded"
                  placeholder="Specify clear reason for outing..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <button type="submit" className="button primary w-full py-2.5" disabled={submitting}>
                {submitting ? "Submitting Application…" : "Submit Leave Application"}
              </button>
            </form>
          </Panel>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm mb-4">{error}</div>}
          <Panel title={`My ${config.label} History`}>
            {loading ? <LoadingState label="Loading applications…" /> : <DataTable columns={columns} rows={leaves} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

