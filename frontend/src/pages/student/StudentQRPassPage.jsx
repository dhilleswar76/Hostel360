import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { LoadingState, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function StudentQRPassPage() {
  const { user } = useAuth();
  const [activePass, setActivePass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPass() {
    setLoading(true);
    setError("");
    try {
      // Find leaves that are approved and have an active QR pass
      const res = await api.get("/leaves", { params: { status: "approved" } });
      const approvedWithPass = (res.data?.data || []).find((l) => l.qrPass && l.qrPass.status === "active");
      setActivePass(approvedWithPass || null);
    } catch (err) {
      setError(getApiError(err, "Failed to load active QR pass."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPass();
  }, []);

  return (
    <div className="dashboard-content space-y-6 max-w-xl mx-auto">
      <SectionHeading
        title="Hostel Gate Digital QR Pass"
        subtitle="Present this verified security pass token to the gate sentinel for automated scan & logging."
        action={
          <button className="button secondary flex items-center gap-2" onClick={loadPass}>
            <Icon name="RotateCw" size={15} /> Refresh Pass
          </button>
        }
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

      {loading ? (
        <LoadingState label="Verifying digital pass with hostel gate system…" />
      ) : activePass && activePass.qrPass ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-400 p-6 shadow-xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase">
            <Icon name="CheckCircle" size={14} /> Gate Pass Active & Authorized
          </div>

          <h3 className="text-xl font-black text-slate-900">{user?.name}</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {activePass.leaveType?.replace("_", " ")} PASS
          </p>

          {/* Stylized QR Code Graphic Container */}
          <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 max-w-xs mx-auto flex flex-col items-center justify-center">
            <svg
              className="w-48 h-48 text-slate-900"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              {/* Corner position locators */}
              <rect x="5" y="5" width="28" height="28" fill="currentColor" rx="2" />
              <rect x="9" y="9" width="20" height="20" fill="white" rx="1" />
              <rect x="13" y="13" width="12" height="12" fill="currentColor" rx="1" />

              <rect x="67" y="5" width="28" height="28" fill="currentColor" rx="2" />
              <rect x="71" y="9" width="20" height="20" fill="white" rx="1" />
              <rect x="75" y="13" width="12" height="12" fill="currentColor" rx="1" />

              <rect x="5" y="67" width="28" height="28" fill="currentColor" rx="2" />
              <rect x="9" y="71" width="20" height="20" fill="white" rx="1" />
              <rect x="13" y="75" width="12" height="12" fill="currentColor" rx="1" />

              {/* Data matrix pattern mock */}
              <rect x="38" y="10" width="8" height="8" />
              <rect x="50" y="10" width="8" height="8" />
              <rect x="42" y="22" width="6" height="6" />
              <rect x="52" y="22" width="6" height="6" />
              <rect x="10" y="38" width="6" height="6" />
              <rect x="22" y="38" width="8" height="8" />
              <rect x="38" y="38" width="12" height="12" />
              <rect x="55" y="38" width="8" height="8" />
              <rect x="70" y="38" width="6" height="6" />
              <rect x="82" y="38" width="8" height="8" />

              <rect x="38" y="55" width="8" height="8" />
              <rect x="50" y="55" width="8" height="8" />
              <rect x="70" y="55" width="12" height="6" />
              <rect x="10" y="55" width="6" height="6" />

              <rect x="38" y="70" width="8" height="8" />
              <rect x="50" y="70" width="8" height="8" />
              <rect x="70" y="70" width="6" height="12" />
              <rect x="82" y="70" width="8" height="8" />
              <rect x="42" y="82" width="6" height="6" />
              <rect x="55" y="82" width="8" height="8" />
            </svg>
            <div className="mt-3 font-mono text-xs bg-white px-2 py-1 rounded border border-slate-300 text-slate-800 break-all select-all">
              {activePass.qrPass.token}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Valid From</span>
              <span className="font-semibold text-slate-800">
                {new Date(activePass.startDate).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Valid Until</span>
              <span className="font-semibold text-rose-800">
                {new Date(activePass.endDate).toLocaleString()}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Destination</span>
              <span className="font-semibold text-slate-800">{activePass.destination || "Local"}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            ⚠️ Single-use security token. Once verified upon campus exit and re-entry, the pass is retired.
          </p>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-4">
          <Icon name="QrCode" size={48} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Active Gate Pass</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any currently approved outing or leave passes. Apply for a Local Outing or Home Visit to have a digital QR pass issued by your warden.
          </p>
        </div>
      )}
    </div>
  );
}

