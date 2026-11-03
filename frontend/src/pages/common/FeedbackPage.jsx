import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { LoadingState, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

const CATEGORIES = ["cleaning", "food", "wifi", "maintenance", "security", "overall"];

export function FeedbackPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  // Student form state
  const [category, setCategory] = useState("overall");
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Admin/Warden analytics state
  const [summary, setSummary] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/feedback/summary");
      setSummary(res.data?.summary || []);
      setFeedbacks(res.data?.feedbacks || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load feedback summary."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isStudent) {
      loadSummary();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitLoading(true);
    setSuccessMsg("");
    try {
      await api.post("/feedback", { category, rating, comments });
      setSuccessMsg("Thank you! Your feedback has been recorded.");
      setComments("");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      alert(getApiError(err, "Failed to submit feedback."));
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Hostel Amenities Feedback & Ratings"
        subtitle="Continuous satisfaction monitoring for cleaning, dining, wifi, security, and facility maintenance."
        action={
          !isStudent ? (
            <button className="button secondary flex items-center gap-2" onClick={loadSummary}>
              <Icon name="RotateCw" size={15} /> Refresh Data
            </button>
          ) : null
        }
      />

      {/* Student Feedback Submission Form */}
      {isStudent && (
        <Panel title="Submit Hostel Facility Feedback" subtitle="Your honest rating helps improve living conditions">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl text-xs">
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-medium">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">Feedback Category *</label>
              <select
                className="w-full p-2.5 border border-slate-300 rounded bg-white text-sm capitalize"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">Satisfaction Rating (1 to 5 Stars) *</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`flex-1 py-2.5 rounded-lg border font-bold text-sm transition ${
                      rating >= star
                        ? "bg-amber-400 text-white border-amber-500 shadow-sm"
                        : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Comments / Suggestions</label>
              <textarea
                rows={3}
                className="w-full p-2.5 border border-slate-300 rounded text-sm"
                placeholder="Give details on cleanliness, speed of wifi, water pressure, food quality..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <button type="submit" className="button primary px-6 py-2.5 text-sm" disabled={submitLoading}>
              {submitLoading ? "Submitting…" : "Submit Feedback"}
            </button>
          </form>
        </Panel>
      )}

      {/* Staff View: Analytics & Breakdown */}
      {!isStudent && (
        <>
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

          {loading ? (
            <LoadingState label="Calculating facility satisfaction metrics…" />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {summary.map((item) => (
                  <div key={item.category} className="p-4 rounded-xl border border-slate-200 bg-white text-center">
                    <div className="text-xs uppercase font-bold text-slate-500">{item.category}</div>
                    <div className="text-2xl font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
                      <span className="text-amber-500 text-lg">★</span>
                      {item.avgRating > 0 ? item.avgRating : "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{item.count} reviews</div>
                  </div>
                ))}
              </div>

              <Panel title="Recent Student Reviews">
                <div className="space-y-3">
                  {feedbacks.map((f) => (
                    <div key={f._id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-start justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-bold text-slate-900">{f.category}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            ★ {f.rating}/5
                          </span>
                          <span className="text-slate-400">by {f.student?.user?.name || "Resident"}</span>
                        </div>
                        {f.comments && <p className="text-slate-700 mt-1 text-sm">{f.comments}</p>}
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {!feedbacks.length && <div className="text-slate-400 text-xs py-4 text-center">No feedback entries yet.</div>}
                </div>
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}

