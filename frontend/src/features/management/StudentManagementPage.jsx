import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { DataTable, EmptyState, LoadingState, Modal, SectionHeading, StatusBadge } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { getApiError } from "../../lib/api.js";
import {
  fetchBlocks,
  fetchRooms,
  fetchStudents,
  createStudent,
  updateStudent,
  deactivateStudentAccount,
} from "./api.js";

const today = () => new Date().toISOString().slice(0, 10);
const dateValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : today());

export function StudentManagementPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const roleBase = user?.role === "warden" ? "/warden" : "/admin";
  const [students, setStudents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [query, setQuery] = useState(params.get("q") || "");
  const [year, setYear] = useState("");
  const [block, setBlock] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState(null);

  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);

  useEffect(() => {
    fetchBlocks().then(setBlocks).catch((reason) => setError(getApiError(reason)));
  }, []);

  useEffect(() => {
    if (!block) {
      setRooms([]);
      setRoom("");
      return;
    }
    fetchRooms({ block }).then(setRooms).catch((reason) => setError(getApiError(reason)));
  }, [block]);

  const loadData = () => {
    setLoading(true);
    setError("");
    fetchStudents({ q: query || undefined, year: year || undefined, status: status || undefined })
      .then((result) => {
        setStudents(result.data || []);
      })
      .catch((reason) => {
        setError(getApiError(reason, "Unable to load students."));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [query, year, status, location.key]);

  const columns = useMemo(() => [
    {
      key: "student",
      title: "Student",
      render: (row) => (
        <span className="person-cell">
          <span className="mini-avatar">{row.user?.name?.slice(0, 1).toUpperCase() || "S"}</span>
          <span>
            <strong>{row.user?.name || "Student account"}</strong>
            <small>
              {row.studentId} · {row.user?.email}
            </small>
          </span>
        </span>
      ),
    },
    {
      key: "department",
      title: "Course / Year",
      render: (row) => (
        <span className="management-primary">
          {row.department || row.course}
          <small>Year {row.year}</small>
        </span>
      ),
    },
    {
      key: "room",
      title: "Hostel / Room",
      render: (row) => {
        const assignedRoom = typeof row.room === "object" ? row.room : null;
        const assignedBlock = assignedRoom && typeof assignedRoom.block === "object" ? assignedRoom.block : null;
        return assignedRoom ? (
          <span className="management-primary">
            Room {assignedRoom.roomNumber}
            <small>{assignedBlock?.name || "Hostel"}</small>
          </span>
        ) : (
          <span className="muted-value">Unallocated</span>
        );
      },
    },
    {
      key: "status",
      title: "Account Status",
      render: (row) => (
        <StatusBadge tone={row.status === "active" && row.user?.isActive ? "success" : "neutral"}>
          {row.status === "active" && row.user?.isActive ? "Active" : row.status === "graduated" ? "Graduated" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      className: "actions-cell",
      render: (row) => (
        <div className="row-actions">
          <Link className="row-action" to={`${roleBase}/students/${row._id}`}>
            Profile
          </Link>
          <button
            className="row-action"
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            Edit
          </button>
          {user?.role === "admin" && row.status === "active" && (
            <button className="row-action danger-action" onClick={() => setPendingDeactivate(row)}>
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ], [roleBase, user?.role]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function submitFilters(event) {
    event.preventDefault();
    setParams(query ? { q: query } : {});
    loadData();
  }

  async function saveStudent(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get("name")).trim(),
      studentId: String(data.get("studentId")).trim() || undefined,
      email: String(data.get("email")).trim(),
      password: String(data.get("password")) || undefined,
      phone: String(data.get("phone")).trim() || undefined,
      course: String(data.get("course")).trim(),
      department: String(data.get("department")).trim() || undefined,
      year: Number(data.get("year")),
      gender: String(data.get("gender")) || undefined,
      guardianName: String(data.get("guardianName")).trim() || undefined,
      guardianPhone: String(data.get("guardianPhone")).trim() || undefined,
      admissionDate: String(data.get("admissionDate")),
      status: editing ? String(data.get("status")) : "active",
    };

    try {
      if (editing) {
        await updateStudent(editing._id, input);
      } else {
        await createStudent(input);
      }
      setNotice(editing ? "Student profile updated successfully." : "Student account created successfully.");
      setFormOpen(false);
      loadData();
    } catch (reason) {
      setError(getApiError(reason, "Unable to save student."));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!pendingDeactivate) return;
    try {
      const result = await deactivateStudentAccount(pendingDeactivate._id);
      setNotice(result.message);
      setPendingDeactivate(null);
      loadData();
    } catch (reason) {
      setError(getApiError(reason, "Unable to deactivate account."));
      setPendingDeactivate(null);
    }
  }

  return (
    <div className="dashboard-page management-page">
      <SectionHeading
        title="Students"
        subtitle="Manage student resident profiles, academic records, and hostel allocations."
        action={
          user?.role === "admin" && (
            <button className="primary-action" onClick={openCreate}>
              <Icon name="Plus" size={16} />
              Add Student
            </button>
          )
        }
      />

      {notice && (
        <p className="toast-message" role="status">
          <Icon name="CheckCircle2" size={16} />
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <Icon name="X" size={14} />
          </button>
        </p>
      )}

      {error && (
        <p className="management-error" role="alert">
          <Icon name="CircleAlert" size={16} />
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </p>
      )}

      <form className="management-filters" onSubmit={submitFilters}>
        <label className="management-search">
          <Icon name="Search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student name, email, or ID"
            aria-label="Search students"
          />
          <button type="submit">Search</button>
        </label>
        <label>
          <span className="sr-only">Year</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">All years</option>
            {[1, 2, 3, 4, 5].map((item) => (
              <option key={item} value={item}>
                Year {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Account status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </select>
        </label>
      </form>

      <section className="panel management-table-panel">
        <div className="management-table-heading">
          <div>
            <h3>Resident Directory</h3>
            <p>{students.length} student records found</p>
          </div>
          <span className="live-data-chip">
            <i /> Live MongoDB
          </span>
        </div>

        {loading ? (
          <LoadingState label="Loading students from database…" />
        ) : error && students.length === 0 ? (
          <EmptyState
            title="Student records unavailable"
            description="Could not load records. Please retry."
            action={
              <button className="outline-button" onClick={loadData}>
                Retry
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={students}
            emptyTitle="No students found"
            emptyDescription="Adjust your search or add a new student record."
          />
        )}
      </section>

      {formOpen && (
        <Modal
          title={editing ? "Edit Student Record" : "Add New Student"}
          subtitle={
            editing
              ? "Update personal, academic, and guardian details."
              : "Create a student resident account in MongoDB."
          }
          onClose={() => setFormOpen(false)}
          wide
        >
          <form className="management-form-grid" onSubmit={saveStudent} key={editing?._id || "new-student"}>
            <label>
              Full name
              <input name="name" required minLength={2} maxLength={120} defaultValue={editing?.user?.name} />
            </label>
            <label>
              Student ID
              <input
                name="studentId"
                minLength={4}
                maxLength={30}
                pattern="[A-Za-z0-9-]+"
                defaultValue={editing?.studentId}
                placeholder="Auto-generated if left blank"
              />
            </label>
            <label>
              Email address
              <input name="email" type="email" required maxLength={254} defaultValue={editing?.user?.email} />
            </label>
            {!editing && (
              <label>
                Initial password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  defaultValue="Student@Hostel360"
                />
              </label>
            )}
            <label>
              Phone number
              <input
                name="phone"
                type="tel"
                minLength={7}
                maxLength={30}
                defaultValue={editing?.user?.phone}
                placeholder="+91 98765 43210"
              />
            </label>
            <label>
              Course
              <input name="course" required maxLength={120} defaultValue={editing?.course || "Computer Science"} />
            </label>
            <label>
              Department
              <input name="department" maxLength={120} defaultValue={editing?.department} placeholder="Optional" />
            </label>
            <label>
              Academic year
              <select name="year" required defaultValue={editing?.year || 1}>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <option key={item} value={item}>
                    Year {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Gender
              <select name="gender" defaultValue={editing?.gender || ""}>
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Admission date
              <input name="admissionDate" type="date" required defaultValue={dateValue(editing?.admissionDate)} />
            </label>
            <label>
              Guardian name
              <input name="guardianName" maxLength={120} defaultValue={editing?.guardianName} />
            </label>
            <label>
              Guardian contact phone
              <input name="guardianPhone" type="tel" minLength={7} maxLength={30} defaultValue={editing?.guardianPhone} />
            </label>
            {editing && (
              <label>
                Account status
                <select name="status" defaultValue={editing.status}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="graduated">Graduated</option>
                </select>
              </label>
            )}
            <div className="management-form-actions">
              <button type="button" className="outline-button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-action" disabled={saving}>
                {saving ? (
                  <>
                    <span className="button-spinner" />
                    Saving…
                  </>
                ) : editing ? (
                  "Save Changes"
                ) : (
                  "Create Student"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDeactivate && (
        <Modal
          title="Deactivate Student Account?"
          subtitle={`${pendingDeactivate.user?.name} will lose sign-in access and any currently assigned bed will be released.`}
          onClose={() => setPendingDeactivate(null)}
        >
          <div className="modal-actions">
            <button className="outline-button" onClick={() => setPendingDeactivate(null)}>
              Cancel
            </button>
            <button className="danger-button" onClick={() => void deactivate()}>
              Deactivate Account
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

