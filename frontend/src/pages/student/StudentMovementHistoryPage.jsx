import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { format12HourDateTime } from "../../lib/dateTime.js";

export function StudentMovementHistoryPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMovements() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/gate/movements");
      setMovements(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load movement history."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovements();
  }, []);

  const columns = [
    {
      key: "time",
      title: "Date & Time",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-800">
          {format12HourDateTime(row.occurredAt)}
        </span>
      ),
    },
    {
      key: "direction",
      title: "Movement Direction",
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
      title: "Gate Pass Token",
      render: (row) =>
        row.pass ? (
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
            {row.pass.slice(0, 16)}…
          </span>
        ) : (
          <span className="text-xs text-slate-400">Regular Entry</span>
        ),
    },
    {
      key: "remarks",
      title: "Remarks",
      render: (row) => <span className="text-xs text-slate-600">{row.remarks || "—"}</span>,
    },
    {
      key: "recordedBy",
      title: "Gate Sentinel",
      render: (row) => <span className="text-xs text-slate-500">{row.recordedBy?.name || "Staff"}</span>,
    },
  ];

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Personal Gate Movement Ledger"
        subtitle="Chronological log of all campus entries and exits verified at the security gates."
        action={
          <button className="button secondary flex items-center gap-2" onClick={loadMovements}>
            <Icon name="RotateCw" size={15} /> Refresh
          </button>
        }
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

      <Panel title={`Logged Transitions (${movements.length})`}>
        {loading ? (
          <LoadingState label="Loading movement audit logs…" />
        ) : (
          <DataTable
            columns={columns}
            rows={movements}
            emptyTitle="No movements recorded yet"
            emptyDescription="Your gate entries and exits will be logged here upon token scan."
          />
        )}
      </Panel>
    </div>
  );
}

