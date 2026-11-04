import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { DataTable, LoadingState, Modal, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { format12HourDateTime } from "../../lib/dateTime.js";

export function EmergencySOSPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Student SOS trigger modal
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosReason, setSosReason] = useState("");
  const [sosLocation, setSosLocation] = useState("");
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSuccess, setSosSuccess] = useState("");

  // Staff resolve modal
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);

  async function loadAlerts() {
    if (isStudent) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency");
      setAlerts(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load emergency alerts."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [user]);

  async function handleTriggerSOS(e) {
    e.preventDefault();
    setSosLoading(true);
    setSosSuccess("");
    try {
      const res = await api.post("/emergency/sos", {
        reason: sosReason || "Immediate assistance requested",
        locationDescription: sosLocation,
      });
      setSosSuccess(res.data?.message || "Emergency alert dispatched to campus authorities!");
      setTimeout(() => {
        setSosModalOpen(false);
        setSosReason("");
        setSosLocation("");
        setSosSuccess("");
      }, 3000);
    } catch (err) {
      alert(getApiError(err, "Failed to trigger SOS alert."));
    } finally {
      setSosLoading(false);
    }
  }

  async function handleAcknowledge(id) {
    try {
      await api.patch(`/emergency/${id}/acknowledge`);
      await loadAlerts();
    } catch (err) {
      alert(getApiError(err, "Failed to acknowledge alert."));
    }
  }

  async function handleResolve(e) {
    e.preventDefault();
    if (!selectedAlert) return;
    setResolveLoading(true);
    try {
      await api.patch(`/emergency/${selectedAlert._id}/resolve`, { resolutionNotes });
      setResolveOpen(false);
      setSelectedAlert(null);
      setResolutionNotes("");
      await loadAlerts();
    } catch (err) {
      alert(getApiError(err, "Failed to mark alert resolved."));
    } finally {
      setResolveLoading(false);
    }
  }

  const columns = [
    {
      key: "status",
      title: "Status",
      render: (row) => {
        const tones = {
          active: "negative",
          acknowledged: "warn",
          resolved: "positive",
        };
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase ${row.status === "active" ? "bg-rose-600 text-white animate-pulse" : row.status === "acknowledged" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            <Icon name="Siren" size={13} />
            {row.status}
          </span>
        );
      },
    },
    {
      key: "time",
      title: "Timestamp",
      render: (row) => format12HourDateTime(row.createdAt),
    },
    {
      key: "resident",
      title: "Resident & Location",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.student?.user?.name || "Resident"}</div>
          <div className="text-xs text-rose-700 font-semibold">
            {row.locationDescription || (row.room ? `Room ${row.room.roomNumber}` : "Hostel Block")}
          </div>
          <div className="text-xs text-slate-500">Phone: {row.student?.user?.phone || "N/A"}</div>
        </div>
      ),
    },
    {
      key: "reason",
      title: "Emergency Detail",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 text-xs">{row.reason}</div>
          {row.resolutionNotes && <div className="text-[11px] text-slate-500 mt-1">Note: {row.resolutionNotes}</div>}
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "active" && (
            <button className="button button-sm bg-amber-500 text-white hover:bg-amber-600" onClick={() => handleAcknowledge(row._id)}>
              Acknowledge
            </button>
          )}
          {row.status !== "resolved" && (
            <button
              className="button button-sm primary"
              onClick={() => {
                setSelectedAlert(row);
                setResolutionNotes("");
                setResolveOpen(true);
              }}
            >
              Resolve
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Hostel Emergency SOS & Security Desk"
        subtitle="Real-time emergency broadcast system connecting residents directly with campus wardens and emergency response."
        action={
          !isStudent ? (
            <button className="button secondary flex items-center gap-2" onClick={loadAlerts}>
              <Icon name="RotateCw" size={15} /> Refresh
            </button>
          ) : null
        }
      />

      {/* For Students: Big SOS Trigger Panel */}
      {isStudent && (
        <div className="p-8 bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl border-2 border-rose-300 text-center space-y-4 shadow-md">
          <div className="inline-flex p-4 bg-rose-600 text-white rounded-full shadow-lg">
            <Icon name="Siren" size={40} />
          </div>
          <h2 className="text-2xl font-black text-rose-950">Campus Emergency Distress Button</h2>
          <p className="text-sm text-rose-800 max-w-lg mx-auto">
            Pressing this button sends an immediate high-priority distress alert to the Chief Warden, Block Warden, and Campus Security with your current room and profile details.
          </p>
          <div>
            <button
              onClick={() => setSosModalOpen(true)}
              className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-lg rounded-xl shadow-xl hover:shadow-2xl transition transform active:scale-95 inline-flex items-center gap-3"
            >
              <Icon name="Siren" size={24} />
              ACTIVATE EMERGENCY SOS
            </button>
          </div>
          <p className="text-xs text-rose-600">Use only in bona fide emergencies: medical, fire, or immediate personal safety threats.</p>
        </div>
      )}

      {/* Staff View: Emergency Alerts Log */}
      {!isStudent && (
        <>
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">{error}</div>}

          <Panel title={`Emergency Alerts Stream (${alerts.length})`}>
            {loading ? <LoadingState label="Monitoring emergency channels…" /> : <DataTable columns={columns} rows={alerts} />}
          </Panel>
        </>
      )}

      {/* SOS Modal for Student */}
      {sosModalOpen && (
        <Modal
          title="TRIGGER EMERGENCY SOS ALERT"
          subtitle="All wardens and security officers will be notified instantly"
          onClose={() => setSosModalOpen(false)}
        >
          <form onSubmit={handleTriggerSOS} className="space-y-4 text-xs">
            {sosSuccess && (
              <div className="p-3 bg-emerald-100 text-emerald-900 font-bold rounded text-sm text-center">
                {sosSuccess}
              </div>
            )}
            <div>
              <label className="block font-bold text-slate-900 mb-1">Nature of Emergency *</label>
              <select
                required
                className="w-full p-2 border border-slate-300 rounded font-medium"
                value={sosReason}
                onChange={(e) => setSosReason(e.target.value)}
              >
                <option value="">-- Select Emergency Reason --</option>
                <option value="Severe Medical Emergency / Need Ambulance">Severe Medical Emergency / Need Ambulance</option>
                <option value="Fire or Electrical Hazard">Fire or Electrical Hazard</option>
                <option value="Physical Threat / Intruder / Security Danger">Physical Threat / Intruder / Security Danger</option>
                <option value="Locked inside / Structural Emergency">Locked inside / Structural Emergency</option>
                <option value="Other Immediate Urgent Hazard">Other Immediate Urgent Hazard</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Current Exact Location (if not in room)</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="e.g. Block A 3rd Floor Washroom or Near Gate 2"
                value={sosLocation}
                onChange={(e) => setSosLocation(e.target.value)}
              />
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
              ⚠️ False emergency alarms are strictly prohibited under hostel conduct regulations.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setSosModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="button bg-rose-600 hover:bg-rose-700 text-white font-bold"
                disabled={sosLoading || !sosReason}
              >
                {sosLoading ? "Transmitting SOS…" : "CONFIRM & TRANSMIT SOS"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Resolve Modal for Staff */}
      {resolveOpen && selectedAlert && (
        <Modal
          title="Resolve Emergency Alert"
          subtitle={`Student: ${selectedAlert.student?.user?.name || "Resident"}`}
          onClose={() => setResolveOpen(false)}
        >
          <form onSubmit={handleResolve} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Action Taken & Resolution Notes *</label>
              <textarea
                rows={3}
                required
                className="w-full p-2 border border-slate-300 rounded text-sm"
                placeholder="Describe response actions (e.g. Doctor contacted, student escorted to infirmary)..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setResolveOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={resolveLoading}>
                {resolveLoading ? "Saving…" : "Mark Resolved"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

