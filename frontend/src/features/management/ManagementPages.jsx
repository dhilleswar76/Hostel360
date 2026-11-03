import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { EmptyState, LoadingState, Modal, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { getApiError } from "../../lib/api.js";
import {
  allocateBed,
  createBlock,
  createRoom,
  deleteBlock,
  deleteRoom,
  fetchBlocks,
  fetchRooms,
  fetchStudent,
  fetchStudents,
  fetchWardens,
  releaseBed,
  transferBed,
  updateBlock,
  updateRoom,
  fetchAllocationHistory,
} from "./api.js";

function useLoad(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    return loader()
      .then(setData)
      .catch((e) => setError(getApiError(e, "Could not load data.")))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, loading, refresh, setData };
}

function Notice({ error, success }) {
  return (
    <>
      {error && <div className="management-alert error" role="alert">{error}</div>}
      {success && <div className="management-alert success" role="status">{success}</div>}
    </>
  );
}

function blockOf(room) {
  if (!room) return "";
  return typeof room.block === "string" ? room.block : room.block?._id || "";
}

export function BlocksPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useLoad(fetchBlocks);
  const [wardens, setWardens] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (user?.role === "admin") {
      fetchWardens().then(setWardens).catch(() => setWardens([]));
    }
  }, [user?.role]);

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name")),
      code: String(form.get("code")).toUpperCase(),
      description: String(form.get("description") || ""),
      gender: String(form.get("gender")),
      capacity: Number(form.get("capacity")),
      address: String(form.get("address") || ""),
      warden: String(form.get("warden") || "") || undefined,
      isActive: form.get("isActive") === "on",
    };
    setSaving(true);
    setActionError("");
    (editing ? updateBlock(editing._id, payload) : createBlock(payload))
      .then(() => {
        setMessage(editing ? "Block updated." : "Block created.");
        setOpen(false);
        void refresh();
      })
      .catch((e) => setActionError(getApiError(e, "Could not save block.")))
      .finally(() => setSaving(false));
  }

  async function remove(block) {
    if (!window.confirm(`Delete ${block.name}?`)) return;
    setActionError("");
    try {
      await deleteBlock(block._id);
      setMessage("Block deleted successfully.");
      await refresh();
    } catch (e) {
      setActionError(getApiError(e, "Could not delete block."));
    }
  }

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title="Hostel Blocks"
        subtitle="Manage hostel buildings, capacity, gender allocations, and assigned wardens."
        action={
          user?.role === "admin" ? (
            <button
              className="primary-action"
              onClick={() => {
                setEditing(null);
                setActionError("");
                setOpen(true);
              }}
            >
              <Icon name="Plus" size={16} />
              Add Block
            </button>
          ) : undefined
        }
      />

      <Notice error={error || actionError} success={message} />

      {loading ? (
        <LoadingState label="Loading hostel blocks from MongoDB…" />
      ) : data?.length ? (
        <div className="management-grid">
          {data.map((block) => (
            <article className="management-card" key={block._id}>
              <div className="management-card-head">
                <span className="management-icon">
                  <Icon name="Building2" />
                </span>
                <StatusBadge tone={block.isActive === false ? "warning" : "success"}>
                  {block.isActive === false ? "Inactive" : "Active"}
                </StatusBadge>
              </div>
              <h2>{block.name}</h2>
              <p className="muted-label">
                {block.code} · {block.gender?.toUpperCase()}
              </p>
              <div className="block-metrics">
                <span>
                  <strong>{block.totalRooms || 0}</strong> rooms
                </span>
                <span>
                  <strong>
                    {block.occupiedBeds || 0}/{block.totalCapacity || 0}
                  </strong>{" "}
                  beds occupied
                </span>
                <span>
                  <strong>{block.availableBeds || 0}</strong> beds free
                </span>
              </div>
              <div className="occupancy-track">
                <i
                  style={{
                    width: `${block.totalCapacity ? Math.round(((block.occupiedBeds || 0) / block.totalCapacity) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="management-detail">
                {block.warden?.name ? `Warden: ${block.warden.name}` : "No warden assigned"}
                {block.address ? ` · ${block.address}` : ""}
              </p>
              <div className="management-actions">
                {user?.role === "admin" && (
                  <button
                    className="outline-button"
                    onClick={() => {
                      setEditing(block);
                      setActionError("");
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                )}
                {user?.role === "admin" && (
                  <button className="outline-button danger-button" onClick={() => void remove(block)}>
                    Delete
                  </button>
                )}
                <Link className="text-link" to={`/${user?.role}/rooms?block=${block._id}`}>
                  View Rooms
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No hostel blocks" description="Create a block to start organizing rooms and bed capacity." />
      )}

      {open && (
        <Modal title={editing ? "Edit Block" : "Create Hostel Block"} onClose={() => setOpen(false)}>
          <form className="modal-form" onSubmit={submit}>
            <label>
              Block name
              <input name="name" defaultValue={editing?.name} required placeholder="e.g. North Wing (A Block)" />
            </label>
            <label>
              Code
              <input name="code" defaultValue={editing?.code} required placeholder="e.g. BLOCK-A" />
            </label>
            <label>
              Description
              <textarea name="description" defaultValue={editing?.description} placeholder="Wing details" />
            </label>
            <label>
              Gender policy
              <select name="gender" defaultValue={editing?.gender || "mixed"}>
                <option value="mixed">Mixed</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label>
              Bed capacity
              <input name="capacity" type="number" min="1" defaultValue={editing?.capacity || 60} required />
            </label>
            <label>
              Address / Location
              <input name="address" defaultValue={editing?.address} placeholder="Campus location" />
            </label>
            {user?.role === "admin" && (
              <label>
                Assigned Warden
                <select name="warden" defaultValue={editing?.warden?._id || ""}>
                  <option value="">Unassigned</option>
                  {wardens.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="checkbox-field">
              <input type="checkbox" name="isActive" defaultChecked={editing?.isActive !== false} /> Block active
            </label>
            {actionError && <p className="form-error">{actionError}</p>}
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? "Saving…" : "Save Block"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function RoomManagementPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [blockFilter, setBlockFilter] = useState(new URLSearchParams(location.search).get("block") || "");
  const { data: blocks } = useLoad(fetchBlocks);
  const { data: rooms, loading, error, refresh } = useLoad(() => fetchRooms({ block: blockFilter || undefined }), [blockFilter]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const input = {
      roomNumber: String(f.get("roomNumber")),
      block: String(f.get("block")),
      floor: Number(f.get("floor")),
      capacity: Number(f.get("capacity")),
      type: String(f.get("type")),
      monthlyFee: Number(f.get("monthlyFee")),
      status: String(f.get("status")),
    };
    setSaving(true);
    setActionError("");
    (editing ? updateRoom(editing._id, input) : createRoom(input))
      .then(() => {
        setOpen(false);
        setMessage("Room saved successfully.");
        void refresh();
      })
      .catch((e) => setActionError(getApiError(e, "Could not save room.")))
      .finally(() => setSaving(false));
  }

  async function remove(room) {
    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
    try {
      await deleteRoom(room._id);
      setMessage("Room deleted.");
      await refresh();
    } catch (e) {
      setActionError(getApiError(e, "Could not delete room."));
    }
  }

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title="Room Management"
        subtitle="Manage room inventory, bed capacities, fees, and operational statuses."
        action={
          user?.role === "admin" && (
            <button
              className="primary-action"
              onClick={() => {
                setEditing(null);
                setActionError("");
                setOpen(true);
              }}
            >
              <Icon name="Plus" size={16} />
              Add Room
            </button>
          )
        }
      />

      <Notice error={error || actionError} success={message} />

      <div className="management-toolbar">
        <label>
          Hostel block
          <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
            <option value="">All assigned blocks</option>
            {blocks?.map((b) => (
              <option value={b._id} key={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Link className="outline-button" to={`/${user?.role}/allocations`}>
          <Icon name="ArrowLeftRight" size={16} />
          Bed Allocation Desk
        </Link>
      </div>

      {loading ? (
        <LoadingState label="Loading rooms from database…" />
      ) : rooms?.length ? (
        <div className="panel module-table-panel">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Block</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Bed Capacity & Availability</th>
                  <th>Monthly Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room._id}>
                    <td>
                      <strong>Room {room.roomNumber}</strong>
                    </td>
                    <td>{typeof room.block === "string" ? blocks?.find((b) => b._id === room.block)?.name : room.block?.name}</td>
                    <td>Floor {room.floor}</td>
                    <td>{room.type?.toUpperCase()}</td>
                    <td>
                      {room.occupiedBeds}/{room.capacity} occupied ·{" "}
                      <strong style={{ color: room.availableBeds > 0 ? "#16a34a" : "#dc2626" }}>
                        {room.availableBeds} free
                      </strong>
                    </td>
                    <td>₹{room.monthlyFee?.toLocaleString("en-IN")}</td>
                    <td>
                      <StatusBadge tone={room.status === "maintenance" ? "warning" : room.availableBeds ? "success" : "neutral"}>
                        {room.status}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action"
                          onClick={() => {
                            setEditing(room);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        {user?.role === "admin" && (
                          <button className="row-action danger-text" onClick={() => void remove(room)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="No rooms found" description="Select another block or create rooms." />
      )}

      {open && (
        <Modal title={editing ? "Edit Room" : "Add Room"} onClose={() => setOpen(false)}>
          <form className="modal-form" onSubmit={submit}>
            <label>
              Room number
              <input name="roomNumber" defaultValue={editing?.roomNumber} required placeholder="e.g. A-101" />
            </label>
            <label>
              Hostel block
              <select name="block" defaultValue={blockOf(editing) || blockFilter} required>
                {blocks?.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Floor
              <input name="floor" type="number" min="0" defaultValue={editing?.floor || 1} required />
            </label>
            <label>
              Capacity (beds)
              <input name="capacity" type="number" min="1" defaultValue={editing?.capacity || 2} required />
            </label>
            <label>
              Room type
              <select name="type" defaultValue={editing?.type || "double"}>
                {["standard", "deluxe", "single", "double", "triple", "dormitory"].map((x) => (
                  <option key={x} value={x}>
                    {x.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Monthly fee (₹)
              <input name="monthlyFee" type="number" min="0" defaultValue={editing?.monthlyFee || 6500} />
            </label>
            <label>
              Status
              <select name="status" defaultValue={editing?.status || "available"}>
                <option value="available">Available</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </label>
            {actionError && <p className="form-error">{actionError}</p>}
            <div className="modal-actions">
              <button type="button" className="outline-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-action" disabled={saving}>
                {saving ? "Saving…" : "Save Room"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function BedAllocationPage() {
  const [block, setBlock] = useState("");
  const { data: blocks } = useLoad(fetchBlocks);
  const { data: rooms, refresh: refreshRooms } = useLoad(() => fetchRooms({ block: block || undefined }), [block]);
  const { data: studentsData, loading, error, refresh: refreshStudents } = useLoad(() => fetchStudents({ block: block || undefined }), [block]);
  const { data: historyData, refresh: refreshHistory } = useLoad(fetchAllocationHistory);
  const [selected, setSelected] = useState(null);
  const [target, setTarget] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const students = studentsData?.data || [];
  const history = historyData || [];

  async function act(kind, student, roomId) {
    setBusy(true);
    setActionError("");
    try {
      if (kind === "release") {
        if (!window.confirm(`Release ${student.user?.name}'s bed?`)) return;
        const current = typeof student.room === "string" ? student.room : student.room?._id;
        if (!current) throw new Error("Student has no assigned room.");
        await releaseBed(current, student._id, remarks || "Bed vacated");
      } else {
        if (!roomId) throw new Error("Choose a room with an available bed.");
        if (kind === "allocate") {
          await allocateBed(roomId, student._id, remarks || "Allocated");
        } else {
          await transferBed(roomId, student._id, remarks || "Transferred");
        }
      }
      setMessage(kind === "allocate" ? "Bed allocated successfully." : kind === "transfer" ? "Student transferred successfully." : "Bed released successfully.");
      setSelected(null);
      setRemarks("");
      await Promise.all([refreshRooms(), refreshStudents(), refreshHistory()]);
    } catch (e) {
      setActionError(getApiError(e, "Bed allocation action failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title="Bed Allocation & Room Transfers"
        subtitle="Allocate available beds to students, transfer residents, and manage room vacancies."
      />

      <Notice error={error || actionError} success={message} />

      <div className="management-toolbar">
        <label>
          Filter by block
          <select value={block} onChange={(e) => setBlock(e.target.value)}>
            <option value="">All assigned blocks</option>
            {blocks?.map((b) => (
              <option value={b._id} key={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <span className="management-count">{students.length} students found</span>
      </div>

      {loading ? (
        <LoadingState label="Loading students from database…" />
      ) : students.length ? (
        <div className="panel module-table-panel">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Course / Year</th>
                  <th>Current Room Assignment</th>
                  <th>Bed Allocation Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const room = typeof s.room === "object" ? s.room : undefined;
                  const assigned = !!s.room;
                  return (
                    <tr key={s._id}>
                      <td>
                        <strong>{s.user?.name}</strong>
                        <small className="table-subtext">{s.user?.email}</small>
                      </td>
                      <td>{s.studentId}</td>
                      <td>
                        {s.department || s.course} · Year {s.year}
                      </td>
                      <td>
                        {room ? (
                          <span style={{ fontWeight: 600, color: "#4f46e5" }}>
                            Room {room.roomNumber} ({typeof room.block === "object" ? room.block.name : "Assigned"})
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Unallocated</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="row-action approve"
                            onClick={() => {
                              setSelected(s);
                              setTarget("");
                              setRemarks("");
                              setActionError("");
                            }}
                          >
                            {assigned ? "Transfer Room" : "Allocate Bed"}
                          </button>
                          {assigned && (
                            <button
                              className="row-action danger-text"
                              disabled={busy}
                              onClick={() => void act("release", s)}
                            >
                              Vacate Bed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="No students found" description="Students will display here once registered." />
      )}

      {/* Allocation History Log */}
      <section className="panel" style={{ marginTop: "24px" }}>
        <div className="panel-heading">
          <div>
            <h3>Recent Room Allocation & Transfer History</h3>
            <p>Audit trail of all room assignments, transfers, and bed releases</p>
          </div>
        </div>
        {history.length === 0 ? (
          <EmptyState title="No allocation history" description="Recent room movements will record here." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Student</th>
                  <th>Action</th>
                  <th>From Room</th>
                  <th>To Room</th>
                  <th>Handled By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 15).map((h) => (
                  <tr key={h._id}>
                    <td>{new Date(h.timestamp).toLocaleString()}</td>
                    <td>{h.student?.user?.name || "Student"}</td>
                    <td>
                      <StatusBadge tone={h.action === "allocated" ? "success" : h.action === "transferred" ? "info" : "warning"}>
                        {h.action.toUpperCase()}
                      </StatusBadge>
                    </td>
                    <td>{h.fromRoom?.roomNumber ? `Room ${h.fromRoom.roomNumber}` : "—"}</td>
                    <td>{h.toRoom?.roomNumber ? `Room ${h.toRoom.roomNumber}` : "—"}</td>
                    <td>{h.performedBy?.name || "Staff"}</td>
                    <td>{h.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <Modal
          title={selected.room ? "Transfer Student Room" : "Allocate a Bed"}
          subtitle={`${selected.user?.name} · ${selected.studentId}`}
          onClose={() => setSelected(null)}
        >
          <div className="modal-form">
            <label>
              Choose available room
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Choose an available room</option>
                {rooms
                  ?.filter((r) => r.availableBeds > 0 && r._id !== (typeof selected.room === "string" ? selected.room : selected.room?._id))
                  .map((r) => (
                    <option key={r._id} value={r._id}>
                      Room {r.roomNumber} ({typeof r.block === "object" ? r.block.name : "Wing"}) · {r.availableBeds} bed(s) available · ₹{r.monthlyFee}/mo
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Remarks / Reason
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Semester allocation, student request"
              />
            </label>
            {actionError && <p className="form-error">{actionError}</p>}
            <div className="modal-actions">
              <button className="outline-button" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button
                className="primary-action"
                disabled={busy || !target}
                onClick={() => void act(selected.room ? "transfer" : "allocate", selected, target)}
              >
                {busy ? "Saving…" : selected.room ? "Complete Transfer" : "Confirm Allocation"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function StudentProfilePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const { data, error, loading } = useLoad(() => (id ? fetchStudent(id) : fetchStudent("me")), [id]);
  const profile = data?.student;

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title={id ? "Student Profile" : "My Student Profile"}
        subtitle="Comprehensive student demographic, academic, and hostel accommodation record."
        action={
          user?.role !== "student" && profile ? (
            <Link className="outline-button" to={`/${user?.role}/students`}>
              Back to Students
            </Link>
          ) : undefined
        }
      />

      {error && <Notice error={error} />}

      {loading ? (
        <LoadingState label="Loading profile from MongoDB…" />
      ) : profile ? (
        <>
          <div className="profile-banner">
            <span className="profile-avatar">
              {profile.user?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join("") || "S"}
            </span>
            <div>
              <h2>{profile.user?.name}</h2>
              <p>
                {profile.studentId} · {profile.department || profile.course} · Year {profile.year}
              </p>
            </div>
            <StatusBadge tone={profile.status === "active" ? "success" : "warning"}>
              {profile.status?.toUpperCase()}
            </StatusBadge>
          </div>

          <div className="profile-grid">
            <section className="panel profile-panel">
              <h3>Personal Details</h3>
              <dl>
                <div>
                  <dt>Email Address</dt>
                  <dd>{profile.user?.email}</dd>
                </div>
                <div>
                  <dt>Phone Number</dt>
                  <dd>{profile.user?.phone || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Gender</dt>
                  <dd>{profile.gender ? profile.gender.toUpperCase() : "Not specified"}</dd>
                </div>
                <div>
                  <dt>Admission Date</dt>
                  <dd>{profile.admissionDate ? new Date(profile.admissionDate).toLocaleDateString() : "Not recorded"}</dd>
                </div>
              </dl>
            </section>

            <section className="panel profile-panel">
              <h3>Academic & Guardian</h3>
              <dl>
                <div>
                  <dt>Department</dt>
                  <dd>{profile.department || profile.course}</dd>
                </div>
                <div>
                  <dt>Course</dt>
                  <dd>{profile.course}</dd>
                </div>
                <div>
                  <dt>Current Year</dt>
                  <dd>Year {profile.year}</dd>
                </div>
                <div>
                  <dt>Guardian Name & Phone</dt>
                  <dd>
                    {profile.guardianName || "Not provided"} {profile.guardianPhone && `· ${profile.guardianPhone}`}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="panel profile-panel">
              <h3>Accommodation</h3>
              <dl>
                <div>
                  <dt>Allocated Room</dt>
                  <dd>
                    {typeof profile.room === "object"
                      ? `Room ${profile.room.roomNumber} (${typeof profile.room.block === "object" ? profile.room.block.name : "Hostel Block"})`
                      : "No room allocated"}
                  </dd>
                </div>
                <div>
                  <dt>Room Type</dt>
                  <dd>{typeof profile.room === "object" ? profile.room.type?.toUpperCase() : "—"}</dd>
                </div>
                <div>
                  <dt>Floor</dt>
                  <dd>{typeof profile.room === "object" ? `Floor ${profile.room.floor}` : "—"}</dd>
                </div>
                <div>
                  <dt>Monthly Hostel Fee</dt>
                  <dd>{typeof profile.room === "object" ? `₹${profile.room.monthlyFee?.toLocaleString("en-IN")}` : "—"}</dd>
                </div>
              </dl>
            </section>

            <section className="panel profile-panel">
              <h3>Fee Summary</h3>
              <dl>
                <div>
                  <dt>Paid Fees</dt>
                  <dd style={{ color: "#16a34a", fontWeight: 600 }}>₹{(data.feeSummary?.paid || 0).toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Pending Balance</dt>
                  <dd style={{ color: (data.feeSummary?.pending || 0) > 0 ? "#dc2626" : "#475569", fontWeight: 600 }}>
                    ₹{(data.feeSummary?.pending || 0).toLocaleString("en-IN")}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      ) : (
        <EmptyState title="Profile unavailable" description="This student profile could not be loaded." />
      )}
    </div>
  );
}

