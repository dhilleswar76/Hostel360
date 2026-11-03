import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Modal, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function LeaveManagementPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function loadLeaves() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/leaves", { params });
      setLeaves(res.data.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load leave requests."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaves();
  }, [statusFilter]);

  async function handleReview(decision) {
    if (!selectedLeave) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      await api.patch(`/leaves/${selectedLeave._id}/review`, {
        status: decision,
        reviewNote,
      });
      setReviewModalOpen(false);
      setSelectedLeave(null);
      setReviewNote("");
      await loadLeaves();
    } catch (err) {
      setActionMessage(getApiError(err, `Failed to mark leave as ${decision}.`));
    } finally {
      setActionLoading(false);
    }
  }

  const columns = [
    {
      key: "student",
      title: "Student",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.student?.user?.name || "Student"}</div>
          <div className="text-xs text-slate-500">
            {row.student?.room?.block?.code ? `${row.student.room.block.code} - Room ${row.student.room.roomNumber}` : "Room Unassigned"}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      title: "Leave Type",
      render: (row) => {
        const typeLabels = {
          local_outing: "Local Outing",
          home_visit: "Home Visit",
          emergency_leave: "Emergency Leave",
        };
        const isEmergency = row.leaveType === "emergency_leave";
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isEmergency ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
            {isEmergency && <Icon name="Siren" size={12} />}
            {typeLabels[row.leaveType] || row.leaveType}
          </span>
        );
      },
    },
    {
      key: "dates",
      title: "Dates & Duration",
      render: (row) => (
        <div className="text-xs">
          <div>{new Date(row.startDate).toLocaleDateString()} to {new Date(row.endDate).toLocaleDateString()}</div>
          <div className="text-slate-500">Contact: {row.emergencyContact || "N/A"}</div>
        </div>
      ),
    },
    {
      key: "reason",
      title: "Reason & Destination",
      render: (row) => (
        <div className="text-xs max-w-xs truncate" title={row.reason}>
          <div className="font-medium text-slate-800">{row.reason}</div>
          {row.destination && <div className="text-slate-500">To: {row.destination}</div>}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
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
      title: "QR Pass",
      render: (row) => {
        if (!row.qrPass) return <span className="text-xs text-slate-400">None</span>;
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200" title={row.qrPass.token}>
            <Icon name="QrCode" size={13} />
            {row.qrPass.token.slice(0, 14)}…
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "Action",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "pending" ? (
            <button
              className="button button-sm primary"
              onClick={() => {
                setSelectedLeave(row);
                setReviewNote("");
                setActionMessage("");
                setReviewModalOpen(true);
              }}
            >
              Review
            </button>
          ) : (
            <button
              className="button button-sm secondary"
              onClick={() => {
                setSelectedLeave(row);
                setReviewNote(row.reviewNote || "");
                setActionMessage("");
                setReviewModalOpen(true);
              }}
            >
              Details
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Student Leave Approvals"
        subtitle="Review, approve, or reject outing and leave requests with instant single-use QR pass generation."
        action={
          <button className="button secondary flex items-center gap-2" onClick={loadLeaves}>
            <Icon name="RotateCw" size={15} /> Refresh
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {["all", "pending", "approved", "rejected", "cancelled"].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition ${
              statusFilter === filter
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">{error}</div>}

      <Panel title={`Leave Requests (${leaves.length})`}>
        {loading ? <LoadingState label="Loading leave requests…" /> : <DataTable columns={columns} rows={leaves} />}
      </Panel>

      {reviewModalOpen && selectedLeave && (
        <Modal
          title={selectedLeave.status === "pending" ? "Review Leave Request" : "Leave Details"}
          subtitle={`Student: ${selectedLeave.student?.user?.name || "Resident"}`}
          onClose={() => setReviewModalOpen(false)}
        >
          <div className="space-y-4 text-sm">
            {actionMessage && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded text-xs">{actionMessage}</div>
            )}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Leave Type</span>
                <span className="font-semibold capitalize">{selectedLeave.leaveType?.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Status</span>
                <span className="font-semibold uppercase">{selectedLeave.status}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">From</span>
                <span className="font-medium">{new Date(selectedLeave.startDate).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Until</span>
                <span className="font-medium">{new Date(selectedLeave.endDate).toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">Reason</span>
                <p className="font-medium text-slate-800">{selectedLeave.reason}</p>
              </div>
              {selectedLeave.destination && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-500 block">Destination</span>
                  <p className="font-medium text-slate-800">{selectedLeave.destination}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-500 block">Emergency Contact</span>
                <span className="font-medium">{selectedLeave.emergencyContact || "None"}</span>
              </div>
            </div>

            {selectedLeave.qrPass && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                  <Icon name="QrCode" size={16} /> Generated Gate QR Token
                </div>
                <div className="font-mono text-xs text-emerald-950 break-all select-all bg-white p-2 rounded border border-emerald-300">
                  {selectedLeave.qrPass.token}
                </div>
                <div className="text-xs text-emerald-700 mt-1">Status: {selectedLeave.qrPass.status}</div>
              </div>
            )}

            {selectedLeave.status === "pending" ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Warden / Admin Remarks</span>
                  <textarea
                    rows={2}
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    placeholder="Provide any mandatory condition or remarks..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="button secondary"
                    onClick={() => setReviewModalOpen(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="button bg-rose-600 text-white hover:bg-rose-700"
                    onClick={() => handleReview("rejected")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing…" : "Reject"}
                  </button>
                  <button
                    className="button primary"
                    onClick={() => handleReview("approved")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing…" : "Approve & Issue QR Pass"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {selectedLeave.reviewNote && (
                  <div className="text-xs text-slate-600 bg-slate-100 p-2 rounded">
                    <strong>Remarks:</strong> {selectedLeave.reviewNote}
                  </div>
                )}
                <div className="flex justify-end pt-3">
                  <button className="button secondary" onClick={() => setReviewModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

