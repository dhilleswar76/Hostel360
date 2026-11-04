import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { LoadingState, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { format12HourDateTime } from "../../lib/dateTime.js";

export function StudentQRPassPage() {
  const { user } = useAuth();
  const [activePass, setActivePass] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
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

      if (approvedWithPass?.qrPass?.token) {
        const url = await QRCode.toDataURL(approvedWithPass.qrPass.token, {
          width: 260,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        setQrDataUrl(url);
      } else {
        setQrDataUrl("");
      }
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

          {/* Real Scannable QR Code Container */}
          <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-inner max-w-xs mx-auto flex flex-col items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Student Gate QR Pass"
                className="w-56 h-56 object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400">
                <Icon name="QrCode" size={48} />
              </div>
            )}
            <div className="mt-3 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded border border-slate-300 text-slate-800 break-all select-all font-bold">
              {activePass.qrPass.token}
            </div>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`HOSTEL360-Pass-${activePass.qrPass.token.slice(0, 10)}.png`}
                className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1.5"
              >
                <Icon name="Download" size={13} /> Download Pass Image
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Valid From</span>
              <span className="font-semibold text-slate-800">
                {format12HourDateTime(activePass.qrPass.validFrom || activePass.startDate)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Valid Until</span>
              <span className="font-semibold text-rose-800">
                {format12HourDateTime(activePass.qrPass.expiresAt || activePass.endDate)}
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

