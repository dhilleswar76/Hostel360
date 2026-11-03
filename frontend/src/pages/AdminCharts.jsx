import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { Panel } from "../components/Common.jsx";
import { Icon } from "../components/Icon.jsx";
import { fetchDashboardStats } from "../features/management/api.js";
import { getApiError } from "../lib/api.js";

const blue = "#4f46e5";

export default function AdminCharts() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats()
      .then(setData)
      .catch((e) => setError(getApiError(e, "Dashboard charts are unavailable.")));
  }, []);

  const monthly = data?.monthlyFees || [];
  const blocks = data?.occupancyByBlock || [];
  const occupied = data?.stats?.occupiedBeds || 0;
  const free = data?.stats?.availableBeds || 0;
  const percent = occupied + free ? Math.round((occupied / (occupied + free)) * 100) : 0;

  return (
    <div className="chart-grid">
      <Panel
        title="Fee collection"
        subtitle="Collected vs pending · ₹ lakhs"
        action={
          <Link className="panel-link" to="/admin/fees">
            View report <Icon name="ArrowUpRight" size={15} />
          </Link>
        }
        className="chart-panel"
      >
        <div className="chart-summary">
          <strong>₹{((data?.stats?.currentMonthFeeCollection || 0) / 100000).toFixed(2)}L</strong>
          <small>collected this month</small>
        </div>
        {error && <p className="management-error">{error}</p>}
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 6, left: -18, bottom: 0 }} barGap={5}>
              <CartesianGrid vertical={false} stroke="#edf0f5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b95a7", fontSize: 11 }} dy={9} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9aa3b2", fontSize: 10 }} tickFormatter={(value) => `₹${value}`} />
              <Tooltip cursor={{ fill: "#f5f7fb" }} formatter={(value, name) => [`₹${value}L`, name === "collected" ? "Collected" : "Pending"]} />
              <Bar dataKey="collected" name="collected" fill={blue} radius={[5, 5, 0, 0]} maxBarSize={21} />
              <Bar dataKey="pending" name="pending" fill="#c7d2fe" radius={[5, 5, 0, 0]} maxBarSize={21} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-dot blue-dot" /> Collected
          </span>
          <span>
            <i className="legend-dot pale-dot" /> Pending
          </span>
        </div>
      </Panel>

      <Panel
        title="Room occupancy"
        subtitle="Occupied bed capacity by hostel block"
        action={
          <Link className="panel-link" to="/admin/rooms">
            Manage rooms <Icon name="ArrowUpRight" size={15} />
          </Link>
        }
        className="chart-panel occupancy-panel"
      >
        <div className="occupancy-overview">
          <div className="occupancy-ring">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: "Occupied", value: occupied }, { name: "Available", value: free }]} dataKey="value" innerRadius="72%" outerRadius="94%" startAngle={90} endAngle={-270} stroke="none">
                  <Cell fill={blue} />
                  <Cell fill="#e0e7ff" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div>
              <strong>{percent}%</strong>
              <span>occupied</span>
            </div>
          </div>
          <div className="occupancy-stats">
            <div>
              <span>Occupied beds</span>
              <strong>{occupied}</strong>
            </div>
            <div>
              <span>Available beds</span>
              <strong>{free}</strong>
            </div>
            <div>
              <span>Total capacity</span>
              <strong>{data?.stats?.totalCapacity || 0} beds</strong>
            </div>
          </div>
        </div>
        <div className="hostel-bars">
          {blocks.map((item) => {
            const pct = item.totalBeds ? Math.round((item.occupiedBeds / item.totalBeds) * 100) : 0;
            return (
              <div className="hostel-bar-row" key={item.name}>
                <span>{item.name}</span>
                <div className="hostel-bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <strong>{pct}%</strong>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

