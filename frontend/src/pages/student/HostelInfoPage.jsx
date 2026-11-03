import React from "react";
import { Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

export function HostelInfoPage() {
  return (
    <div className="dashboard-content space-y-6 max-w-5xl">
      <SectionHeading
        title="Hostel Directory & Resident Handbook"
        subtitle="Important campus contacts, administrative operating hours, safety guidelines, and code of conduct."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon emerald"><Icon name="Clock" size={19} /></span>
          </div>
          <p className="stat-label">Main Gate Curfew</p>
          <p className="stat-value text-emerald-800">10:00 PM</p>
          <p className="stat-change text-slate-500">Opens: 06:00 AM</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon purple"><Icon name="Utensils" size={19} /></span>
          </div>
          <p className="stat-label">Dining Hall Hours</p>
          <p className="stat-value text-indigo-900">3 Meals</p>
          <p className="stat-change text-slate-500">Breakfast, Lunch, Dinner</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon warn"><Icon name="Siren" size={19} /></span>
          </div>
          <p className="stat-label">Campus Emergency Desk</p>
          <p className="stat-value text-rose-800">24 / 7</p>
          <p className="stat-change text-slate-500">Immediate response</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Emergency Contacts & Helpline Directory" subtitle="Reach campus safety & medical officers directly">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-bold text-rose-950">Campus Medical Health Center</div>
                <div className="text-rose-700">24/7 Ambulance & Doctor on call</div>
              </div>
              <span className="font-mono font-bold text-rose-900 bg-white px-2.5 py-1 rounded border border-rose-300">
                +91 99999 11111
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-bold text-amber-950">Campus Main Gate Security Control</div>
                <div className="text-amber-700">Lost & found, gate movement queries</div>
              </div>
              <span className="font-mono font-bold text-amber-900 bg-white px-2.5 py-1 rounded border border-amber-300">
                +91 99999 22222
              </span>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-bold text-indigo-950">Chief Warden Office</div>
                <div className="text-indigo-700">Admin Block Room 102</div>
              </div>
              <span className="font-mono font-bold text-indigo-900 bg-white px-2.5 py-1 rounded border border-indigo-300">
                +91 99999 33333
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Hostel Code of Conduct & Rules" subtitle="Key residential obligations for all students">
          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <span className="font-bold text-slate-900">•</span>
              <span><strong>ID Badges:</strong> Always carry your university student ID card when entering or leaving the hostel premises.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-slate-900">•</span>
              <span><strong>Substance Prohibition:</strong> Alcohol, smoking, illicit substances, and contraband are strictly prohibited and attract immediate disciplinary eviction.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-slate-900">•</span>
              <span><strong>Quiet Study Hours:</strong> High noise, loud speakers, and disruptive behavior in residential blocks are restricted after 11:00 PM.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-slate-900">•</span>
              <span><strong>Room Cleanliness:</strong> Rooms must be maintained in a hygienic condition. Housekeeping will conduct regular inspection of shared facilities.</span>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

