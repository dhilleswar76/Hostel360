import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const rolePath = { admin: "/admin", warden: "/warden", student: "/student" };

function AuthFrame({ children, mode }) {
  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <section className="auth-story">
          <Link className="auth-brand" to="/login">
            <span className="auth-brand-mark">
              <Icon name="Building2" size={20} />
            </span>
            <span className="font-bold text-xl tracking-wide">
              HOSTEL<span className="text-indigo-400">360</span>
            </span>
          </Link>
          <div className="auth-story-content">
            <span className="story-overline">
              <i /> SMART RESIDENCE MANAGEMENT SYSTEM
            </span>
            <h1>
              A better stay
              <br />
              starts <em>right here.</em>
            </h1>
            <p>Complete 360-degree smart management for students, wardens, and administrators.</p>
            <div className="auth-feature">
              <span>
                <Icon name="ShieldCheck" size={17} />
              </span>
              <div>
                <strong>Everything in one place</strong>
                <small>Rooms, leaves, QR gate passes, payments, and 24/7 emergency SOS.</small>
              </div>
            </div>
            <div className="story-illustration">
              <div className="illustration-glow" />
              <div className="illustration-building building-left">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="illustration-building building-main">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="illustration-building building-right">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="illustration-ground" />
            </div>
          </div>
          <div className="auth-story-footer">
            <span>© HOSTEL360 · Smart Hostel Management</span>
            <span>
              <i /> Secure 256-bit encryption
            </span>
          </div>
        </section>
        <section className={`auth-form-side ${mode}`}>
          <div className="auth-form-card">
            <div className="mobile-auth-brand">
              <span className="auth-brand-mark">
                <Icon name="Building2" size={19} />
              </span>
              <strong>
                HOSTEL<span className="text-indigo-600">360</span>
              </strong>
            </div>
            {children}
          </div>
          <p className="auth-legal">Secure access for your hostel community.</p>
        </section>
      </div>
    </main>
  );
}

function PasswordInput({ name, label, autoComplete, minLength, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="form-label">
      {label}
      <span className="password-control">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={72}
          required
          placeholder="••••••••••"
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <Icon name={visible ? "EyeOff" : "Eye"} size={17} />
        </button>
      </span>
    </label>
  );
}

export function LoginPage() {
  const { user, loading: sessionLoading, login, error, success, clearMessages } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname;

  if (sessionLoading) {
    return (
      <main className="auth-loading">
        <span className="spinner" />
        Checking your session…
      </main>
    );
  }
  if (user) return <Navigate to={rolePath[user.role]} replace />;

  async function submit(event) {
    event.preventDefault();
    clearMessages();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from || "/", { replace: true });
    } catch {
      // Handled in context
    } finally {
      setSubmitting(false);
    }
  }

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <AuthFrame mode="login">
      <div className="auth-heading">
        <span className="form-eyebrow">WELCOME BACK</span>
        <h2>Sign in to HOSTEL360</h2>
        <p>Enter your details to access your dashboard.</p>
      </div>

      <div className="demo-credentials-banner" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "12px" }}>
        <p style={{ fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Demo Accounts (Quick Select):</p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => fillDemo("admin@hostel360.dev", "Admin@Hostel360")}
          >
            Admin
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => fillDemo("warden@hostel360.dev", "Warden@Hostel360")}
          >
            Warden
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => fillDemo("student@hostel360.dev", "Student@Hostel360")}
          >
            Student
          </button>
        </div>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label className="form-label">
          Email address
          <span className="input-control">
            <Icon name="UserRound" size={17} />
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="name@hostel360.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </span>
        </label>
        <PasswordInput
          name="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="auth-message error" role="alert">
            <Icon name="CircleAlert" size={17} />
            {error}
          </p>
        )}
        {success && (
          <p className="auth-message success" role="status">
            <Icon name="CheckCircle2" size={17} />
            {success}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="button-spinner" />
              Signing in…
            </>
          ) : (
            <>
              Sign in <Icon name="ArrowUpRight" size={16} />
            </>
          )}
        </button>
      </form>
      <div className="auth-separator">
        <span>NEW RESIDENT?</span>
      </div>
      <p className="auth-bottom-link">
        Are you a student? <Link to="/register">Create an account <Icon name="ArrowUpRight" size={14} /></Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { user, loading: sessionLoading, register, error, clearMessages } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  if (sessionLoading) {
    return (
      <main className="auth-loading">
        <span className="spinner" />
        Checking your session…
      </main>
    );
  }
  if (user) return <Navigate to={rolePath[user.role]} replace />;

  async function submit(event) {
    event.preventDefault();
    clearMessages();
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const details = {
      name: String(data.get("name")).trim(),
      email: String(data.get("email")).trim(),
      password: String(data.get("password")),
      studentId: String(data.get("studentId")).trim(),
      course: String(data.get("course")).trim(),
      year: Number(data.get("year")),
      phone: String(data.get("phone")).trim() || undefined,
    };
    try {
      await register(details);
      navigate("/student", { replace: true });
    } catch {
      // Handled in context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame mode="register">
      <div className="auth-heading">
        <span className="form-eyebrow">STUDENT PORTAL</span>
        <h2>Create your account</h2>
        <p>Register with your student details to get started with HOSTEL360.</p>
      </div>
      <form className="auth-form register-form" onSubmit={submit}>
        <label className="form-label">
          Full name
          <input name="name" autoComplete="name" minLength={2} maxLength={120} required placeholder="Your full name" />
        </label>
        <label className="form-label">
          Student ID
          <input name="studentId" minLength={4} maxLength={30} pattern="[A-Za-z0-9-]+" required placeholder="e.g. STU-2026-009" />
        </label>
        <label className="form-label full-row">
          Email address
          <span className="input-control">
            <Icon name="UserRound" size={17} />
            <input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="student@university.edu" />
          </span>
        </label>
        <label className="form-label">
          Course
          <input name="course" minLength={2} maxLength={120} required placeholder="Computer Science" />
        </label>
        <label className="form-label">
          Year of study
          <input name="year" type="number" min={1} max={10} step={1} required defaultValue={1} />
        </label>
        <label className="form-label full-row">
          Phone <span className="field-optional">OPTIONAL</span>
          <input name="phone" type="tel" minLength={7} maxLength={30} autoComplete="tel" placeholder="+91 98765 43210" />
        </label>
        <label className="form-label full-row">
          Password
          <span className="password-control">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name={showPassword ? "EyeOff" : "Eye"} size={17} />
            </button>
          </span>
          <small>Use at least 8 characters.</small>
        </label>

        {error && (
          <p className="auth-message error full-row" role="alert">
            <Icon name="CircleAlert" size={17} />
            {error}
          </p>
        )}

        <button className="auth-submit full-row" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="button-spinner" />
              Creating account…
            </>
          ) : (
            <>
              Create student account <Icon name="ArrowUpRight" size={16} />
            </>
          )}
        </button>
      </form>
      <p className="auth-bottom-link">
        Already have an account? <Link to="/login">Sign in <Icon name="ArrowUpRight" size={14} /></Link>
      </p>
    </AuthFrame>
  );
}

