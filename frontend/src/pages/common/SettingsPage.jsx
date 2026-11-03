import React, { useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.patch("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setMessage("Password updated successfully! Please use your new password next time you log in.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getApiError(err, "Failed to update password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-content space-y-6 max-w-4xl">
      <SectionHeading
        title="Account Settings & Security"
        subtitle="Manage your personal profile, authentication credentials, and hostel preferences."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Panel title="Personal Profile Information">
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div>
                <span className="text-slate-500 block">Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{user?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email Address</span>
                <span className="font-medium text-slate-800">{user?.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone Number</span>
                <span className="font-medium text-slate-800">{user?.phone || "Not provided"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Assigned Role</span>
                <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-900 text-white">
                  {user?.role}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Note: Contact your administrative office to update registered name, identity documents, or email addresses.
            </p>
          </div>
        </Panel>

        {/* Change Password Form */}
        <Panel title="Update Password" subtitle="Ensure your account uses a secure password">
          <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
            {message && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded">{message}</div>}
            {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded">{error}</div>}

            <div>
              <label className="block font-semibold mb-1">Current Password *</label>
              <input
                type="password"
                required
                className="w-full p-2.5 border border-slate-300 rounded text-sm"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">New Password (min 8 chars) *</label>
              <input
                type="password"
                required
                className="w-full p-2.5 border border-slate-300 rounded text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                className="w-full p-2.5 border border-slate-300 rounded text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="button primary w-full py-2.5 mt-2" disabled={loading}>
              {loading ? "Updating Password…" : "Save New Password"}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

