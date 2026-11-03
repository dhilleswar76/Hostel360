import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { DataTable, EmptyState, LoadingState, Modal, SectionHeading, StatCard, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { getApiError } from "../../lib/api.js";
import {
  createFee,
  deleteFee,
  fetchFeeSummary,
  fetchFees,
  fetchStudents,
  simulatePayment,
} from "../management/api.js";
import api from "../../lib/api.js";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const feeTypes = ["tuition", "accommodation", "mess", "deposit", "fine", "other"];
const statusTone = (s) =>
  s === "paid" ? "success" : s === "overdue" ? "danger" : s === "partially_paid" ? "info" : "warning";

function studentOf(record) {
  return typeof record.student === "string" ? null : record.student;
}

export function FeeManagementPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ q: "", feeType: "", status: "", academicYear: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [paying, setPaying] = useState(null);
  const [history, setHistory] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, total] = await Promise.all([
        fetchFees({
          q: filters.q || undefined,
          feeType: filters.feeType || undefined,
          status: filters.status || undefined,
          academicYear: filters.academicYear || undefined,
        }),
        fetchFeeSummary(),
      ]);
      setRows(list || []);
      setSummary(total || null);
    } catch (e) {
      setError(getApiError(e, "Unable to load fee records."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isStudent) {
      fetchStudents({ limit: 100, status: "active" })
        .then((result) => setStudents(result.data || []))
        .catch((e) => setError(getApiError(e, "Unable to load students.")));
    }
  }, [isStudent]);

  async function save(event) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const input = {
      student: String(f.get("student")),
      amount: Number(f.get("amount")),
      feeType: String(f.get("feeType")),
      academicYear: String(f.get("academicYear")).trim(),
      dueDate: String(f.get("dueDate")),
      notes: String(f.get("notes") || ""),
    };
    setSaving(true);
    setError("");
    try {
      await createFee(input);
      setNotice("Fee record assigned successfully.");
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(getApiError(e, "Could not save fee record."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(record) {
    if (!window.confirm(`Delete this ${record.feeType} fee record?`)) return;
    try {
      await deleteFee(record._id);
      setNotice("Fee record deleted.");
      await load();
    } catch (e) {
      setError(getApiError(e, "Could not delete fee record."));
    }
  }

  async function pay(event) {
    event.preventDefault();
    if (!paying) return;
    const f = new FormData(event.currentTarget);
    const amount = Number(f.get("amount"));
    const method = String(f.get("method") || "upi");
    setSaving(true);
    setError("");
    try {
      const result = await simulatePayment(paying._id, amount, method);
      setNotice(result.message);
      setPaying(null);
      setReceipt({
        ...result.receipt,
        feeType: paying.feeType,
        purpose: paying.purpose,
        studentName: user?.name,
      });
      await load();
    } catch (e) {
      setError(getApiError(e, "Simulated payment failed."));
    } finally {
      setSaving(false);
    }
  }

  async function showHistory(row) {
    try {
      const res = await api.get(`/fees/${row._id}/history`);
      setHistory({ fee: res.data.fee, rows: res.data.data || [] });
    } catch (e) {
      setError(getApiError(e, "Could not load payment history."));
    }
  }

  const columns = [
    {
      key: "student",
      title: "Student",
      render: (r) => {
        const s = studentOf(r);
        return (
          <span className="management-primary">
            {s?.user?.name || "Student"}
            <small>{s?.studentId || ""}</small>
          </span>
        );
      },
    },
    {
      key: "type",
      title: "Fee Type",
      render: (r) => (
        <span className="management-primary">
          {r.feeType?.toUpperCase()}
          <small>{r.academicYear}</small>
        </span>
      ),
    },
    {
      key: "amount",
      title: "Amount / Balance",
      render: (r) => (
        <span className="management-primary">
          {money(r.amount)}
          <small>
            {money(r.balance)} due · {money(r.amountPaid)} paid
          </small>
        </span>
      ),
    },
    {
      key: "due",
      title: "Due Date",
      render: (r) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-IN") : "—"),
    },
    {
      key: "status",
      title: "Status",
      render: (r) => (
        <StatusBadge tone={statusTone(r.status)}>
          {r.status?.replace("_", " ").toUpperCase()}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      className: "actions-cell",
      render: (r) => (
        <div className="row-actions">
          <button className="row-action" onClick={() => void showHistory(r)}>
            Transactions ({r.transactions?.length || (r.status === "paid" ? 1 : 0)})
          </button>
          {isStudent && r.balance > 0 && (
            <button className="row-action approve" onClick={() => setPaying(r)}>
              Pay Online
            </button>
          )}
          {!isStudent && user?.role === "admin" && (
            <button className="row-action danger-text" onClick={() => void remove(r)}>
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const cards = summary
    ? [
        { label: "Total fees", value: money(summary.totalFees), change: `${summary.recordCount} fee records`, tone: "blue", icon: "WalletCards" },
        { label: "Collected", value: money(summary.collectedFees), change: "Simulated payments received", tone: "green", icon: "CircleDollarSign" },
        { label: "Pending balance", value: money(summary.pendingFees), change: "Outstanding balances", tone: "amber", icon: "Clock" },
        { label: "Overdue balance", value: money(summary.overdueFees), change: "Past scheduled due date", tone: "rose", icon: "CircleAlert" },
      ]
    : [];

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title={isStudent ? "My Fee Details" : "Fee Management"}
        subtitle={
          isStudent
            ? "Review hostel & mess fees, download payment receipts, and make simulated payments."
            : "Assign hostel fees, track collection rates, and review student balances."
        }
        action={
          !isStudent && user?.role === "admin" ? (
            <button
              className="primary-action"
              onClick={() => {
                setFormOpen(true);
              }}
            >
              <Icon name="Plus" size={16} />
              Assign Fee
            </button>
          ) : undefined
        }
      />

      {notice && <div className="management-alert success" role="status">{notice}</div>}
      {error && <div className="management-alert error" role="alert">{error}</div>}

      <div className="stat-grid fee-stat-grid">
        {cards.map((card) => (
          <StatCard key={card.label} stat={card} />
        ))}
      </div>

      {!isStudent && (
        <div className="management-filters">
          <label className="management-search">
            <Icon name="Search" size={16} />
            <input
              placeholder="Search student name, ID..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </label>
          <label>
            <select
              aria-label="Fee type"
              value={filters.feeType}
              onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}
            >
              <option value="">All fee types</option>
              {feeTypes.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            <select
              aria-label="Payment status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All statuses</option>
              {["pending", "partially_paid", "paid", "overdue"].map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading fee records from MongoDB…" />
      ) : rows.length ? (
        <section className="panel management-table-panel">
          <div className="management-table-heading">
            <div>
              <h3>{isStudent ? "My Fee Records" : "Hostel Fee Ledger"}</h3>
              <p>{rows.length} fee records listed</p>
            </div>
            <span className="live-data-chip">
              <i /> Live MongoDB
            </span>
          </div>
          <DataTable columns={columns} rows={rows} />
        </section>
      ) : (
        <EmptyState
          title="No fee records"
          description={isStudent ? "No fees assigned to your account yet." : "No fee records match the selected filters."}
          action={
            !isStudent && user?.role === "admin" ? (
              <button className="primary-action" onClick={() => setFormOpen(true)}>
                Assign Fee
              </button>
            ) : undefined
          }
        />
      )}

      {/* Assign Fee Modal */}
      {formOpen && (
        <Modal
          title="Assign Student Fee"
          subtitle="Generate a new fee invoice for a registered hostel resident."
          onClose={() => setFormOpen(false)}
        >
          <form className="modal-form" onSubmit={save}>
            <label>
              Select Student
              <select name="student" required>
                <option value="">Choose resident</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.user?.name} · {s.studentId}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fee amount (₹)
              <input name="amount" type="number" min="1" step="1" required placeholder="e.g. 39000" />
            </label>
            <label>
              Fee category
              <select name="feeType" defaultValue="accommodation">
                {feeTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Academic year
              <input name="academicYear" required maxLength={20} defaultValue="2026-2027" />
            </label>
            <label>
              Due date
              <input name="dueDate" type="date" required />
            </label>
            <label>
              Notes / Description
              <textarea name="notes" maxLength={500} rows={2} placeholder="Optional fee notes" />
            </label>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? "Saving…" : "Assign Fee"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Simulated Payment Modal */}
      {paying && (
        <Modal
          title="Make Simulated Payment"
          subtitle={`Pay ${paying.feeType?.toUpperCase()} · Outstanding balance: ${money(paying.balance)}. Note: This is an educational simulation; no real money is deducted.`}
          onClose={() => setPaying(null)}
        >
          <form className="modal-form" onSubmit={pay}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#1e40af", marginBottom: "12px" }}>
              <strong>Simulated Transaction:</strong> This online payment will update MongoDB and generate a valid payment receipt instantly.
            </div>
            <label>
              Payment amount (₹)
              <input name="amount" type="number" min="1" max={paying.balance} step="1" defaultValue={paying.balance} required />
            </label>
            <label>
              Payment channel
              <select name="method">
                <option value="upi">UPI / QR Simulation</option>
                <option value="card">Debit / Credit Card Simulation</option>
                <option value="bank">Net Banking Simulation</option>
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setPaying(null)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? "Processing…" : `Confirm Pay ${money(paying.balance)}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Payment Receipt Modal */}
      {receipt && (
        <Modal
          title="HOSTEL360 Payment Receipt"
          subtitle="Official Payment Acknowledgment (Simulated)"
          onClose={() => setReceipt(null)}
        >
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px dashed #cbd5e1", fontSize: "13px" }}>
            <div style={{ textAlign: "center", marginBottom: "14px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#4f46e5", fontSize: "18px" }}>HOSTEL360 SMART RESIDENCE</h3>
              <small style={{ color: "#64748b" }}>Payment Receipt & Transaction Confirmation</small>
            </div>
            <div className="detail-list">
              <div>
                <span>Transaction Reference</span>
                <strong>{receipt.transactionId}</strong>
              </div>
              <div>
                <span>Resident Name</span>
                <strong>{receipt.studentName || user?.name}</strong>
              </div>
              <div>
                <span>Fee Category</span>
                <strong>{receipt.feeType?.toUpperCase()} ({receipt.purpose})</strong>
              </div>
              <div>
                <span>Amount Paid</span>
                <strong style={{ color: "#16a34a", fontSize: "15px" }}>{money(receipt.amount)}</strong>
              </div>
              <div>
                <span>Payment Mode</span>
                <strong>{receipt.method?.toUpperCase()} (Simulated)</strong>
              </div>
              <div>
                <span>Date & Time</span>
                <strong>{new Date(receipt.paidAt).toLocaleString()}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong style={{ color: "#16a34a" }}>SUCCESSFUL</strong>
              </div>
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: "16px" }}>
            <button className="primary-action" onClick={() => window.print()}>
              <Icon name="Printer" size={15} /> Print Receipt
            </button>
            <button className="outline-button" onClick={() => setReceipt(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Transaction History Modal */}
      {history && (
        <Modal
          title="Fee Transaction History"
          subtitle={`${studentOf(history.fee)?.user?.name || "Resident"} · ${history.fee.feeType?.toUpperCase()} · ${history.fee.academicYear}`}
          onClose={() => setHistory(null)}
          wide
        >
          <div className="detail-list" style={{ marginBottom: "16px" }}>
            <div>
              <span>Total Invoice Amount</span>
              <strong>{money(history.fee.amount)}</strong>
            </div>
            <div>
              <span>Amount Paid</span>
              <strong style={{ color: "#16a34a" }}>{money(history.fee.amountPaid)}</strong>
            </div>
            <div>
              <span>Outstanding Balance</span>
              <strong style={{ color: history.fee.balance > 0 ? "#dc2626" : "inherit" }}>
                {money(history.fee.balance)}
              </strong>
            </div>
          </div>
          {history.rows.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction Reference</th>
                    <th>Method</th>
                    <th>Amount Paid</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((tx) => (
                    <tr key={tx._id || tx.transactionId}>
                      <td>
                        <strong>{tx.transactionId}</strong>
                      </td>
                      <td>{tx.method?.toUpperCase()}</td>
                      <td>{money(tx.amount)}</td>
                      <td>{new Date(tx.paidAt).toLocaleString()}</td>
                      <td>
                        <StatusBadge tone="success">{tx.status}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No transactions yet" description="No payment transactions recorded for this invoice." />
          )}
        </Modal>
      )}
    </div>
  );
}

