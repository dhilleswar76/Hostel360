import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { DataTable, LoadingState, Modal, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function StudentVisitorPage() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    purpose: "",
    expectedAt: "",
    identityType: "national_id",
    identityLast4: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadMyVisitors() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/visitors");
      setVisitors(res.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load visitor requests."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyVisitors();
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await api.post("/visitors", formData);
      setModalOpen(false);
      setFormData({
        name: "",
        phone: "",
        purpose: "",
        expectedAt: "",
        identityType: "national_id",
        identityLast4: "",
      });
      await loadMyVisitors();
    } catch (err) {
      setFormError(getApiError(err, "Failed to pre-register visitor."));
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "visitor",
      title: "Guest Details",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500">Phone: {row.phone}</div>
        </div>
      ),
    },
    {
      key: "purpose",
      title: "Purpose of Visit",
      render: (row) => <span className="text-xs text-slate-700">{row.purpose}</span>,
    },
    {
      key: "expected",
      title: "Expected Arrival",
      render: (row) => (
        <span className="text-xs font-medium text-slate-800">
          {new Date(row.expectedAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "token",
      title: "Visitor Pass Token",
      render: (row) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 select-all">
          {row.passToken || "N/A"}
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
  ];

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Visitor Passes & Guest Pre-Registration"
        subtitle="Pre-register family or academic guests and generate official gate entry tokens."
        action={
          <div className="flex gap-2">
            <button className="button secondary flex items-center gap-2" onClick={loadMyVisitors}>
              <Icon name="RotateCw" size={15} /> Refresh
            </button>
            <button className="button primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
              <Icon name="Plus" size={15} /> Pre-Register Guest
            </button>
          </div>
        }
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

      <Panel title={`My Registered Guests (${visitors.length})`}>
        {loading ? <LoadingState label="Loading guest records…" /> : <DataTable columns={columns} rows={visitors} />}
      </Panel>

      {modalOpen && (
        <Modal
          title="Pre-Register Expected Guest"
          subtitle="Generate an entry token to share with your visitor"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            {formError && <div className="p-2.5 bg-rose-50 text-rose-700 rounded">{formError}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Guest Full Name *</label>
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
                <label className="block font-semibold mb-1">Purpose of Visit *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-300 rounded"
                  placeholder="e.g. Family visit"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={submitting}>
                {submitting ? "Generating Pass…" : "Pre-Register & Generate Token"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

