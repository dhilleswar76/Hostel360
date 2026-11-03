import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon.jsx";

export function StatCard({ stat }) {
  const content = (
    <>
      <div className="stat-top">
        <span className={`stat-icon ${stat.tone}`}>
          <Icon name={stat.icon} size={19} />
        </span>
      </div>
      <p className="stat-label">{stat.label}</p>
      <p className="stat-value">{stat.value}</p>
      <p className={`stat-change ${stat.tone}`}>
        <Icon name="ArrowUpRight" size={14} />
        {stat.change}
      </p>
    </>
  );
  return stat.path ? (
    <Link className="stat-card interactive" to={stat.path}>
      {content}
    </Link>
  ) : (
    <article className="stat-card">{content}</article>
  );
}

export function DataTable({
  columns,
  rows,
  emptyTitle = "Nothing to show yet",
  emptyDescription = "New items will appear here when they're available.",
}) {
  if (!rows || !rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || row.id || index}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="FileText" size={20} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading data…" }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ children, tone = "neutral" }) {
  return (
    <span className={`status-badge ${tone}`}>
      <span />
      {children}
    </span>
  );
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={`modal-card${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <Icon name="X" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

