import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

const REPORT_TYPES = [
  { id: "occupancy", label: "Occupancy Roster", icon: "Building2" },
  { id: "students", label: "Student Roster", icon: "GraduationCap" },
  { id: "fees", label: "Fee Collections", icon: "WalletCards" },
  { id: "complaints", label: "Complaints Audit", icon: "MessageSquareWarning" },
  { id: "leaves", label: "Leaves & Outings", icon: "CalendarDays" },
  { id: "visitors", label: "Visitor Ledger", icon: "ContactRound" },
  { id: "gate", label: "Gate Movements", icon: "DoorOpen" },
  { id: "maintenance", label: "Maintenance Tasks", icon: "Wrench" },
];

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState("occupancy");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport(type) {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/reports/${type}`);
      setReportData(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to generate report."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  function handleDownloadCSV() {
    const token = localStorage.getItem("token");
    const url = `/api/reports/${activeReport}?format=csv`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `${activeReport}-report-${Date.now()}.csv`;
        link.click();
      })
      .catch((err) => alert("Failed to download CSV: " + err.message));
  }

  function handlePrint() {
    window.print();
  }

  // Generate dynamic table columns based on the keys of the first row
  const firstRow = reportData[0] || {};
  const columns = Object.keys(firstRow).map((key) => ({
    key,
    title: key.replace(/([A-Z])/g, " $1").trim(),
    render: (row) => String(row[key] ?? "—"),
  }));

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Administrative Reports & Exports"
        subtitle="Exportable audit summaries, occupancy ledgers, and compliance reports for university administration."
        action={
          <div className="flex gap-2">
            <button className="button secondary flex items-center gap-2" onClick={handlePrint}>
              <Icon name="Printer" size={15} /> Printable View
            </button>
            <button className="button primary flex items-center gap-2" onClick={handleDownloadCSV}>
              <Icon name="Download" size={15} /> Export CSV
            </button>
          </div>
        }
      />

      {/* Report Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {REPORT_TYPES.map((r) => {
          const isActive = activeReport === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon name={r.icon} size={18} />
              <span className="text-xs font-semibold leading-tight">{r.label}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

      <Panel title={`${REPORT_TYPES.find((r) => r.id === activeReport)?.label} (${reportData.length} Records)`}>
        {loading ? (
          <LoadingState label="Compiling report dataset…" />
        ) : (
          <DataTable
            columns={columns}
            rows={reportData}
            emptyTitle="No records found"
            emptyDescription="No data entries match the selected reporting parameters."
          />
        )}
      </Panel>
    </div>
  );
}

