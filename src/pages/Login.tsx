import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../lib/useApi";
import { ApiError } from "../lib/api";
import { Icon } from "../components/Icon";
import type { Role } from "../lib/types";

interface PublicConfig {
  allow_student_registration: boolean;
  school_year?: string;
  semester?: string;
}

const DEMO_ACCOUNTS: { label: string; identifier: string; password: string; role: Role }[] = [
  { label: "Student", identifier: "2024-00101", password: "Campus123", role: "student" },
  { label: "Registrar", identifier: "registrar", password: "registrar123", role: "registrar" },
  { label: "Property office", identifier: "custodian", password: "custodian123", role: "custodian" },
  { label: "Admin", identifier: "admin", password: "admin123", role: "admin" },
];

export function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const { data: config } = useApi<PublicConfig>("/public/config");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={user.role === "student" ? "/" : "/staff"} replace />;
  }

  const goHome = (role: Role) => navigate(role === "student" ? "/" : "/staff", { replace: true });

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(identifier.trim(), password);
      goHome(signedIn.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await register(studentNo.trim(), newPassword);
      goHome(created.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
    setIdentifier("");
    setPassword("");
    setStudentNo("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark brand-mark-lg">
            <span className="brand-bar" />
            <span className="brand-bar" />
            <span className="brand-bar" />
          </span>
          <div>
            <strong>CampusFlow</strong>
            <small>Document &amp; uniform pick-up tracker</small>
          </div>
        </div>

        <div className="login-card">
          <div className="login-heading">
            {config?.school_year ? (
              <span className="login-term">
                {config.school_year} · {config.semester ?? "Semester"}
              </span>
            ) : null}
            <h2>{mode === "login" ? "Welcome back" : "Create your student account"}</h2>
            <p>
              {mode === "login"
                ? "Sign in with your student number or staff username."
                : "Verify your student number to start tracking your records."}
            </p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label className="field">
                <span className="field-label">Student number or username</span>
                <div className="input-with-icon">
                  <Icon name="idCard" size={17} />
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="2024-00101 or registrar"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span className="field-label">Password</span>
                <div className="input-with-icon">
                  <Icon name="lock" size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                  </button>
                </div>
              </label>

              {error ? (
                <div className="alert alert-error" role="alert">
                  <Icon name="alert" size={17} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
                {!submitting ? <Icon name="chevronRight" size={17} /> : null}
              </button>

              {config?.allow_student_registration ? (
                <p className="switch-hint">
                  New student?{" "}
                  <button type="button" className="link-btn" onClick={() => switchMode("register")}>
                    Create an account
                  </button>
                </p>
              ) : null}
            </form>
          ) : (
            <form onSubmit={handleRegister} className="form-stack">
              <label className="field">
                <span className="field-label">Student number</span>
                <div className="input-with-icon">
                  <Icon name="idCard" size={17} />
                  <input
                    value={studentNo}
                    onChange={(event) => setStudentNo(event.target.value)}
                    placeholder="e.g. 2024-00101"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
                <span className="field-hint">It must match the enrolled students list of the Registrar.</span>
              </label>

              <label className="field">
                <span className="field-label">Create a password</span>
                <div className="input-with-icon">
                  <Icon name="lock" size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                  </button>
                </div>
              </label>

              <label className="field">
                <span className="field-label">Confirm password</span>
                <div className="input-with-icon">
                  <Icon name="lock" size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-type your password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              {error ? (
                <div className="alert alert-error" role="alert">
                  <Icon name="alert" size={17} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
              <p className="switch-hint">
                Already have an account?{" "}
                <button type="button" className="link-btn" onClick={() => switchMode("login")}>
                  Sign in
                </button>
              </p>
            </form>
          )}

          {mode === "login" ? (
            <div className="demo-box">
              <span className="demo-caption">Demo accounts · click to fill</span>
              <div className="demo-grid">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.identifier}
                    type="button"
                    className="demo-account"
                    onClick={() => {
                      setIdentifier(account.identifier);
                      setPassword(account.password);
                      setError(null);
                    }}
                  >
                    <span>{account.label}</span>
                    <small>{account.identifier}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <p className="login-footnote">CampusFlow · Capstone prototype · Data stays on this device.</p>
      </section>
    </div>
  );
}
