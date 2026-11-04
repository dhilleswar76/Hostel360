import React, { useEffect, useState } from "react";
import { DataTable, EmptyState, LoadingState, Modal, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { getApiError } from "../../lib/api.js";
import { fetchBlocks } from "../../features/management/api.js";
import api from "../../lib/api.js";

export function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [staffRes, blocksRes] = await Promise.all([
        api.get("/staff", { params: { role: roleFilter || undefined } }),
        fetchBlocks(),
      ]);
      setStaff(staffRes.data.data || []);
      setBlocks(blocksRes || []);
    } catch (e) {
      setError(getApiError(e, "Could not load staff accounts."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const saveStaff = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name")).trim(),
      email: String(f.get("email")).trim(),
      role: String(f.get("role")),
      phone: String(f.get("phone") || "").trim(),
      assignedBlock: String(f.get("assignedBlock") || "") || undefined,
    };
    if (!editing) {
      payload.password = String(f.get("password") || "Staff@Hostel360");
    }

    try {
      if (editing) {
        await api.put(`/staff/${editing._id}`, payload);
        setNotice("Staff account updated successfully.");
      } else {
        await api.post("/staff", payload);
        setNotice("Staff account created successfully.");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setError(getApiError(err, "Failed to save staff account."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/staff/${user._id}/status`, { isActive: !user.isActive });
      setNotice(`Account ${user.name} ${!user.isActive ? "activated" : "deactivated"}.`);
      load();
    } catch (err) {
      setError(getApiError(err, "Failed to update account status."));
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resettingUser || newPassword.length < 8) return;
    setSaving(true);
    try {
      await api.post(`/staff/${resettingUser._id}/reset-password`, { newPassword });
      setNotice(`Password for ${resettingUser.name} reset successfully.`);
      setResettingUser(null);
      setNewPassword("");
    } catch (err) {
      setError(getApiError(err, "Failed to reset password."));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "name",
      title: "Staff Member",
      render: (u) => (
        <span className="person-cell">
          <span className="mini-avatar">{u.name?.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{u.name}</strong>
            <small>{u.email}</small>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      title: "System Role",
      render: (u) => (
        <StatusBadge tone={u.role === "admin" ? "info" : "neutral"}>
          {u.role?.toUpperCase()}
        </StatusBadge>
      ),
    },
    {
      key: "block",
      title: "Assigned Hostel Wing",
      render: (u) => (
        <span>{u.assignedBlock?.name ? `${u.assignedBlock.name} (${u.assignedBlock.code})` : "—"}</span>
      ),
    },
    {
      key: "phone",
      title: "Contact Phone",
      render: (u) => <span>{u.phone || "—"}</span>,
    },
    {
      key: "status",
      title: "Status",
      render: (u) => (
        <StatusBadge tone={u.isActive ? "success" : "danger"}>
          {u.isActive ? "Active" : "Disabled"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      className: "actions-cell",
      render: (u) => (
        <div className="row-actions">
          <button
            className="row-action"
            onClick={() => {
              setEditing(u);
              setFormOpen(true);
            }}
          >
            Edit
          </button>
          <button
            className="row-action"
            onClick={() => {
              setResettingUser(u);
              setNewPassword("");
            }}
          >
            Reset Password
          </button>
          <button
            className={`row-action ${u.isActive ? "danger-action" : "approve"}`}
            onClick={() => toggleStatus(u)}
          >
            {u.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title="Staff & User Management"
        subtitle="Manage administrator and warden credentials, permissions, and hostel block assignments."
        action={
          <button
            className="primary-action"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Icon name="Plus" size={16} />
            Add Staff Account
          </button>
        }
      />

      {notice && <div className="management-alert success" role="status">{notice}</div>}
      {error && <div className="management-alert error" role="alert">{error}</div>}

      <div className="management-filters">
        <label>
          Filter by role
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Staff Roles</option>
            <option value="admin">Administrators</option>
            <option value="warden">Hostel Wardens</option>
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState label="Loading staff accounts…" />
      ) : staff.length ? (
        <section className="panel management-table-panel">
          <div className="management-table-heading">
            <div>
              <h3>Staff Directory</h3>
              <p>{staff.length} staff records listed</p>
            </div>
          </div>
          <DataTable columns={columns} rows={staff} />
        </section>
      ) : (
        <EmptyState title="No staff records" description="Add your first warden or administrator account." />
      )}

      {/* Create / Edit Staff Modal */}
      {formOpen && (
        <Modal
          title={editing ? "Edit Staff Account" : "Add Staff Account"}
          subtitle="Staff credentials have privileged access to hostel operations."
          onClose={() => setFormOpen(false)}
        >
          <form className="modal-form" onSubmit={saveStaff}>
            <label>
              Full name
              <input name="name" required minLength={2} defaultValue={editing?.name} placeholder="e.g. Prof. R. Sharma" />
            </label>
            <label>
              Email address
              <input name="email" type="email" required defaultValue={editing?.email} placeholder="staff@hostel360.dev" />
            </label>
            <label>
              System role
              <select name="role" defaultValue={editing?.role || "warden"}>
                <option value="warden">Hostel Warden</option>
                <option value="admin">Administrator</option>
              </select>
            </label>
            {!editing && (
              <label>
                Initial password
                <input name="password" type="password" minLength={8} defaultValue="Staff@Hostel360" required />
              </label>
            )}
            <label>
              Contact phone
              <input name="phone" type="tel" defaultValue={editing?.phone} placeholder="+91 98765 43210" />
            </label>
            <label>
              Assigned hostel block (wardens only)
              <select name="assignedBlock" defaultValue={editing?.assignedBlock?.id || ""}>
                <option value="">No block assigned</option>
                {blocks.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Account"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <Modal
          title={`Reset Password: ${resettingUser.name}`}
          subtitle="Set a new secure password. Active sessions will be revoked."
          onClose={() => setResettingUser(null)}
        >
          <form className="modal-form" onSubmit={handlePasswordReset}>
            <label>
              New password (min 8 characters)
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setResettingUser(null)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving || newPassword.length < 8}>
                {saving ? "Updating…" : "Set Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

