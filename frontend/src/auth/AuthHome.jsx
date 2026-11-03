import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const rolePath = { admin: "/admin", warden: "/warden", student: "/student" };
const roleLabel = { admin: "Administrator", warden: "Warden", student: "Student" };

export function AuthHome() {
  const { user, student, success, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <main className="home-shell">
      <header className="home-header">
        <Link className="brand text-indigo-600 font-bold" to={rolePath[user.role]}>
          HOSTEL360
        </Link>
        <button className="secondary-button" onClick={() => void logout()}>
          Log out
        </button>
      </header>
      <section className="home-card">
        <p className="eyebrow">{roleLabel[user.role]} access</p>
        <h1>Welcome, {user.name}</h1>
        <p>
          You are signed in as <strong>{user.email}</strong>.
        </p>
        {student && (
          <p className="student-summary">
            Student ID {student.studentId} · {student.course} · Year {student.year}
          </p>
        )}
        {success && (
          <p className="form-message success" role="status">
            {success}
          </p>
        )}
      </section>
    </main>
  );
}

export function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <main className="home-shell">
      <section className="home-card">
        <p className="eyebrow">Access denied</p>
        <h1>This page is not available to your role.</h1>
        <p>Signed in as {user?.role || "guest"}.</p>
        {user && (
          <Link className="primary-link" to={rolePath[user.role]}>
            Return to your dashboard
          </Link>
        )}
      </section>
    </main>
  );
}

