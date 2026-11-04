/**
 * Shared 12-Hour Date and Time Formatting Utilities
 * Strictly enforces 12-hour format (AM/PM) across the HOSTEL360 application.
 */

export function format12HourDateTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function format12HourTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Converts a <input type="datetime-local"> value (e.g. "2026-11-04T18:00")
 * to a standardized ISO-8601 string preserving the client's exact local timezone.
 */
export function toISOFromLocal(datetimeLocalValue) {
  if (!datetimeLocalValue) return "";
  const d = new Date(datetimeLocalValue);
  return Number.isNaN(d.getTime()) ? datetimeLocalValue : d.toISOString();
}

