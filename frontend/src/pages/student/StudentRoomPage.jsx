import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { LoadingState, Panel, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function StudentRoomPage() {
  const [data, setData] = useState({ room: null, roommates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMyRoom() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/rooms/my-room");
      setData(res.data || { room: null, roommates: [] });
    } catch (err) {
      setError(getApiError(err, "Failed to load room details."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyRoom();
  }, []);

  const room = data.room;

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="My Room & Accommodation"
        subtitle="Current room allocation, roommate directory, and residential facilities."
        action={
          <button className="button secondary flex items-center gap-2" onClick={loadMyRoom}>
            <Icon name="RotateCw" size={15} /> Refresh
          </button>
        }
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

      {loading ? (
        <LoadingState label="Loading accommodation details…" />
      ) : room ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-icon info"><Icon name="DoorOpen" size={19} /></span>
              </div>
              <p className="stat-label">Assigned Room</p>
              <p className="stat-value">{room.roomNumber}</p>
              <p className="stat-change text-slate-500">Floor {room.floor}</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-icon purple"><Icon name="Building2" size={19} /></span>
              </div>
              <p className="stat-label">Hostel Block</p>
              <p className="stat-value text-indigo-900">{room.block?.name || "Block"}</p>
              <p className="stat-change text-slate-500">Code: {room.block?.code}</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-icon emerald"><Icon name="BedDouble" size={19} /></span>
              </div>
              <p className="stat-label">Room Capacity</p>
              <p className="stat-value">{room.capacity} Beds</p>
              <p className="stat-change text-slate-500">{room.occupiedBeds} occupied / {room.availableBeds} free</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-icon warn"><Icon name="WalletCards" size={19} /></span>
              </div>
              <p className="stat-label">Monthly Tariff</p>
              <p className="stat-value">₹{room.monthlyFee?.toLocaleString()}</p>
              <p className="stat-change text-slate-500 capitalize">{room.type} Room</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Panel title="Roommates Directory" subtitle="Residents currently co-allocated to this room">
              <div className="space-y-3">
                {data.roommates?.map((mate, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{mate.name}</div>
                      <div className="text-slate-500">{mate.course} • Year {mate.year}</div>
                      <div className="text-slate-400 mt-1">Email: {mate.email}</div>
                    </div>
                    {mate.phone && (
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-mono font-medium text-slate-700">
                        {mate.phone}
                      </span>
                    )}
                  </div>
                ))}
                {!data.roommates?.length && (
                  <div className="text-center text-slate-400 text-xs py-8">
                    No other roommates currently assigned to this room.
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Hostel Policies & House Rules" subtitle="Key residential conduct guidelines">
              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="font-bold text-indigo-700">1.</span>
                  <span><strong>Night Curfew:</strong> All residents must return to hostel premises by 10:00 PM unless approved on an overnight leave pass.</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="font-bold text-indigo-700">2.</span>
                  <span><strong>Quiet Study Hours:</strong> Silence must be strictly observed in corridors and study spaces from 11:00 PM to 06:00 AM.</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="font-bold text-indigo-700">3.</span>
                  <span><strong>Electrical Appliances:</strong> High-power heating coils, induction stoves, and unapproved immersion heaters are prohibited.</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="font-bold text-indigo-700">4.</span>
                  <span><strong>Visitor Hours:</strong> Guests are allowed only in common lobby lounges between 09:00 AM and 07:00 PM with security registration.</span>
                </li>
              </ul>
            </Panel>
          </div>
        </>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
          <Icon name="BedDouble" size={40} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">No Room Allocated Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not currently have an active room allocation. Please contact the hostel warden or administration office to be assigned a room bed.
          </p>
        </div>
      )}
    </div>
  );
}

