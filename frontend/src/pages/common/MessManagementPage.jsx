import React, { useEffect, useState } from "react";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { LoadingState, Modal, Panel, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MEALS = ["breakfast", "lunch", "dinner"];

export function MessManagementPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState(
    ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()] || "monday"
  );

  // Edit Modal (Admin/Warden)
  const [editOpen, setEditOpen] = useState(false);
  const [editMeal, setEditMeal] = useState({ dayOfWeek: "monday", mealType: "breakfast", items: "", specialNotes: "" });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Feedback Form (Student)
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState("");

  async function loadMenu() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/mess/menu");
      setMenu(res.data?.menu || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load mess menu."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  function getMealData(day, meal) {
    return menu.find((m) => m.dayOfWeek === day && m.mealType === meal);
  }

  async function handleSaveMeal(e) {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError("");
    try {
      const itemsList = editMeal.items
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await api.put("/mess/menu", {
        dayOfWeek: editMeal.dayOfWeek,
        mealType: editMeal.mealType,
        items: itemsList,
        specialNotes: editMeal.specialNotes,
      });

      setEditOpen(false);
      await loadMenu();
    } catch (err) {
      setSaveError(getApiError(err, "Failed to update menu."));
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleFeedback(e) {
    e.preventDefault();
    setFeedbackLoading(true);
    setFeedbackSuccess("");
    try {
      await api.post("/mess/feedback", { rating, comments });
      setFeedbackSuccess("Thank you! Your mess rating has been recorded.");
      setComments("");
      setTimeout(() => setFeedbackSuccess(""), 4000);
    } catch (err) {
      alert(getApiError(err, "Failed to submit rating."));
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Mess & Dining Hall Management"
        subtitle="Weekly dining menu schedule, nutrition guidelines, and student meal satisfaction ratings."
        action={
          <button className="button secondary flex items-center gap-2" onClick={loadMenu}>
            <Icon name="RotateCw" size={15} /> Refresh Menu
          </button>
        }
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">{error}</div>}

      {/* Day Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              activeDay === day
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading weekly mess schedule…" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MEALS.map((meal) => {
            const data = getMealData(activeDay, meal);
            const mealIcons = {
              breakfast: "Coffee",
              lunch: "Utensils",
              dinner: "Moon",
            };
            const mealTimes = {
              breakfast: "07:30 AM – 09:30 AM",
              lunch: "12:30 PM – 02:30 PM",
              dinner: "07:30 PM – 09:30 PM",
            };
            return (
              <div key={meal} className="panel flex flex-col justify-between">
                <div>
                  <div className="panel-heading border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                        <Icon name={mealIcons[meal] || "Utensils"} size={18} />
                      </span>
                      <div>
                        <h3 className="capitalize font-bold text-slate-900">{meal}</h3>
                        <p className="text-xs text-slate-500">{mealTimes[meal]}</p>
                      </div>
                    </div>
                    {!isStudent && (
                      <button
                        className="button button-sm secondary"
                        onClick={() => {
                          setEditMeal({
                            dayOfWeek: activeDay,
                            mealType: meal,
                            items: (data?.items || []).join("\n"),
                            specialNotes: data?.specialNotes || "",
                          });
                          setEditOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="py-4">
                    {data?.items && data.items.length > 0 ? (
                      <ul className="space-y-2 text-sm text-slate-700">
                        {data.items.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 py-3 italic">Menu items not yet listed for this meal.</p>
                    )}
                  </div>
                </div>

                {data?.specialNotes && (
                  <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600 mt-2">
                    <strong>Note:</strong> {data.specialNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student Feedback Box */}
      {isStudent && (
        <Panel title="Rate Dining Quality" subtitle="Help us maintain hygiene, taste, and nutrition standards">
          <form onSubmit={handleFeedback} className="space-y-4 max-w-lg text-xs">
            {feedbackSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                {feedbackSuccess}
              </div>
            )}
            <div>
              <label className="block font-semibold mb-2">Meal Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-lg border flex items-center gap-1 font-bold ${
                      rating >= star
                        ? "bg-amber-400 text-white border-amber-500 shadow-sm"
                        : "bg-white text-slate-400 border-slate-200"
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Feedback Remarks (Optional)</label>
              <textarea
                rows={2}
                className="w-full p-2 border border-slate-300 rounded text-sm"
                placeholder="Mention meal freshness, hygiene, menu suggestions..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
            <button type="submit" className="button primary" disabled={feedbackLoading}>
              {feedbackLoading ? "Submitting…" : "Submit Meal Feedback"}
            </button>
          </form>
        </Panel>
      )}

      {/* Edit Menu Modal */}
      {editOpen && (
        <Modal
          title={`Edit ${editMeal.mealType.toUpperCase()} Menu (${editMeal.dayOfWeek.toUpperCase()})`}
          subtitle="Update dishes and meal items"
          onClose={() => setEditOpen(false)}
        >
          <form onSubmit={handleSaveMeal} className="space-y-4 text-xs">
            {saveError && <div className="p-2.5 bg-rose-50 text-rose-700 rounded">{saveError}</div>}
            <div>
              <label className="block font-semibold mb-1">Dishes / Menu Items (One item per line) *</label>
              <textarea
                rows={6}
                required
                className="w-full p-2 border border-slate-300 rounded text-sm font-sans"
                placeholder="Idli Sambhar&#10;Poha&#10;Boiled Eggs&#10;Tea / Coffee"
                value={editMeal.items}
                onChange={(e) => setEditMeal({ ...editMeal, items: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Special Notes / Dietary Tag (Optional)</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded"
                placeholder="e.g. Special Feast on occasion of festival"
                value={editMeal.specialNotes}
                onChange={(e) => setEditMeal({ ...editMeal, specialNotes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" className="button secondary" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={saveLoading}>
                {saveLoading ? "Saving…" : "Save Menu"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

