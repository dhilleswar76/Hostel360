import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Modal, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function GateManagementPage() {
  const [statusData, setStatusData] = useState({ totalStudents: 0, insideCount: 0, outsideCount: 0, insideStudents: [], outsideStudents: [] });
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("inside");

  // Gate scanner / pass verification form state
  const [tokenInput, setTokenInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Record movement state
  const [movementStudentId, setMovementStudentId] = useState("");
  const [movementDirection, setMovementDirection] = useState("exit");
  const [movementRemarks, setMovementRemarks] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordMessage, setRecordMessage] = useState("");

  async function loadGateData() {
    setLoading(true);
    setError("");
    try {
      const [resStatus, resMovements] = await Promise.all([
        api.get("/gate/status"),
        api.get("/gate/movements"),
      ]);
      setStatusData(resStatus.data || {});
      setMovements(resMovements.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load gate status."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGateData();
  }, []);

  async function handleVerifyToken(e) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setVerifyLoading(true);
    setVerifyError("");
    setVerifyResult(null);
    try {
      const res = await api.post("/gate/verify-pass", { token: tokenInput.trim() });
      setVerifyResult(res.data);
      if (res.data?.pass?.student?._id) {
        setMovementStudentId(res.data.pass.student._id);
      }
    } catch (err) {
      setVerifyError(getApiError(err, "QR pass verification failed."));
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleRecordMovement(e) {
    e.preventDefault();
    if (!movementStudentId) {
      setRecordMessage("Please specify a student.");
      return;
    }
    setRecordLoading(true);
    setRecordMessage("");
    try {
      await api.post("/gate/movement", {
        student: movementStudentId,
        direction: movementDirection,
        passToken: tokenInput.trim() || undefined,
        remarks: movementRemarks.trim() || undefined,
      });
      setRecordMessage(`Movement (${movementDirection.toUpperCase()}) recorded successfully!`);
      setTokenInput("");
      setVerifyResult(null);
      setMovementStudentId("");
      setMovementRemarks("");
      await loadGateData();
    } catch (err) {
      setRecordMessage(getApiError(err, "Failed to record movement."));
    } finally {
      setRecordLoading(false);
    }
  }

  const movementColumns = [
    {
      key: "time",
      title: "Timestamp",
      render: (row) => new Date(row.occurredAt).toLocaleString(),
    },
    {
      key: "student",
      title: "Resident",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.student?.user?.name || "Student"}</div>
          <div className="text-xs text-slate-500">
            {row.student?.room?.block?.code ? `${row.student.room.block.code} - Rm ${row.student.room.roomNumber}` : "No Room"}
          </div>
        </div>
      ),
    },
    {
      key: "direction",
      title: "Direction",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            row.direction === "entry" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          <Icon name={row.direction === "entry" ? "ArrowDownLeft" : "ArrowUpRight"} size={13} />
          {row.direction}
        </span>
      ),
    },
    {
      key: "pass",
      title: "Pass Token",
      render: (row) => (row.pass ? <span className="font-mono text-xs text-slate-600">{row.pass.slice(0, 15)}…</span> : <span className="text-xs text-slate-400">Normal</span>),
    },
    {
      key: "remarks",
      title: "Remarks",
      render: (row) => <span className="text-xs text-slate-600">{row.remarks || "—"}</span>,
    },
    {
      key: "officer",
      title: "Recorded By",
      render: (row) => <span className="text-xs text-slate-700">{row.recordedBy?.name || "Staff"}</span>,
    },
  ];

  const studentList = activeTab === "inside" ? statusData.insideStudents : statusData.outsideStudents;

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Gate Security & Resident Movement"
        subtitle="Verify outing QR tokens, log entry/exit transitions, and track live occupancy in real time."
        action={
          <button className="button secondary flex items-center gap-2" onClick={loadGateData}>
            <Icon name="RotateCw" size={15} /> Refresh
          </button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon emerald"><Icon name="DoorOpen" size={19} /></span>
          </div>
          <p className="stat-label">Currently Inside Campus</p>
          <p className="stat-value text-emerald-600">{statusData.insideCount}</p>
          <p className="stat-change text-slate-500">{Math.round((statusData.insideCount / (statusData.totalStudents || 1)) * 100)}% of residents</p>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon warn"><Icon name="Route" size={19} /></span>
          </div>
          <p className="stat-label">Currently Outside Campus</p>
          <p className="stat-value text-amber-600">{statusData.outsideCount}</p>
          <p className="stat-change text-slate-500">{statusData.outsideStudents.length} off-campus</p>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon info"><Icon name="UsersRound" size={19} /></span>
          </div>
          <p className="stat-label">Total Registered Residents</p>
          <p className="stat-value">{statusData.totalStudents}</p>
          <p className="stat-change text-slate-500">Live roster</p>
        </div>
      </div>

      {/* Gate Verification & Pass Processing Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Scan / Verify QR Pass Token" subtitle="Enter student pass token generated during leave approval">
          <form onSubmit={handleVerifyToken} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border border-slate-300 rounded font-mono text-sm"
                placeholder="e.g. PASS-1718000000-A1B2C3D4..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button type="submit" className="button primary flex items-center gap-2" disabled={verifyLoading}>
                <Icon name="QrCode" size={16} />
                {verifyLoading ? "Checking…" : "Verify Pass"}
              </button>
            </div>
            {verifyError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{verifyError}</div>}
            {verifyResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1">
                  <Icon name="CheckCircle" size={14} /> Valid Pass Confirmed
                </div>
                <div><strong>Resident:</strong> {verifyResult.pass?.student?.user?.name}</div>
                <div><strong>Purpose:</strong> {verifyResult.pass?.purpose}</div>
                <div><strong>Valid Range:</strong> {new Date(verifyResult.pass?.validFrom).toLocaleString()} to {new Date(verifyResult.pass?.expiresAt).toLocaleString()}</div>
                <div><strong>Pass Status:</strong> {verifyResult.pass?.status}</div>
              </div>
            )}
          </form>
        </Panel>

        <Panel title="Record Gate Movement" subtitle="Register student departure or arrival through main hostel gate">
          <form onSubmit={handleRecordMovement} className="space-y-3 text-xs">
            {recordMessage && (
              <div className={`p-2.5 rounded ${recordMessage.includes("success") ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                {recordMessage}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Select Student</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  value={movementStudentId}
                  onChange={(e) => setMovementStudentId(e.target.value)}
                >
                  <option value="">-- Choose Resident --</option>
                  {[...statusData.insideStudents, ...statusData.outsideStudents].map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.user?.name} ({s.room?.roomNumber ? `Rm ${s.room.roomNumber}` : "No Rm"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Direction</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                  value={movementDirection}
                  onChange={(e) => setMovementDirection(e.target.value)}
                >
                  <option value="exit">EXIT (Leaving Campus)</option>
                  <option value="entry">ENTRY (Returning to Campus)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Gate Officer Remarks</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="Optional gate log remark..."
                value={movementRemarks}
                onChange={(e) => setMovementRemarks(e.target.value)}
              />
            </div>
            <button type="submit" className="button primary w-full" disabled={recordLoading || !movementStudentId}>
              {recordLoading ? "Recording…" : `Confirm ${movementDirection.toUpperCase()}`}
            </button>
          </form>
        </Panel>
      </div>

      {/* Tabs for Inside / Outside Residents */}
      <Panel
        title={`Resident Status (${activeTab === "inside" ? statusData.insideCount : statusData.outsideCount})`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("inside")}
              className={`button button-sm ${activeTab === "inside" ? "primary" : "secondary"}`}
            >
              Inside Campus ({statusData.insideCount})
            </button>
            <button
              onClick={() => setActiveTab("outside")}
              className={`button button-sm ${activeTab === "outside" ? "primary" : "secondary"}`}
            >
              Outside Campus ({statusData.outsideCount})
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {studentList.map((s) => (
            <div key={s._id} className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-slate-900">{s.user?.name}</div>
                <div className="text-slate-500">
                  {s.room?.block?.code ? `${s.room.block.code} - Room ${s.room.roomNumber}` : "Room Unassigned"}
                </div>
                <div className="text-slate-400 mt-1">ID: {s.studentId}</div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${activeTab === "inside" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {activeTab.toUpperCase()}
                </span>
                {s.lastMovement?.time && (
                  <div className="text-[10px] text-slate-400 mt-1">
                    Since {new Date(s.lastMovement.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!studentList.length && <div className="text-slate-400 text-xs py-4 col-span-3 text-center">No residents currently in this status.</div>}
        </div>
      </Panel>

      {/* Movement Log */}
      <Panel title="Recent Gate Movements">
        <DataTable columns={movementColumns} rows={movements} />
      </Panel>
    </div>
  );
}

