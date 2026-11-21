import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api, ApiError } from "../lib/api";
import { formatDate, roleLabel } from "../lib/format";
import { Avatar, Field, SectionHeader } from "../components/ui";
import { ImageCropModal } from "../components/ImageCropModal";
import { Icon } from "../components/Icon";
import type { Student, User } from "../lib/types";

interface ProfilePayload {
  user: User;
  student: Student | null;
}

export function Profile() {
  const { user, student, applyProfile, applyToken, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const { notify } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  // The chosen file is edited in the crop dialog before anything is uploaded.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.full_name, user?.email]);

  if (!user) return null;

  async function saveProfile(extra: { avatar?: string | null } = {}) {
    setProfileError(null);
    setSavingProfile(true);
    try {
      const payload = await api<ProfilePayload>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, email, ...extra }),
      });
      applyProfile(payload);
      notify("Profile updated.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not update your profile.";
      setProfileError(message);
      notify(message, "error");
    } finally {
      setSavingProfile(false);
    }
  }

  function choosePhoto(file?: File) {
    if (!file) return;
    setProfileError(null);
    setPendingPhoto(file);
  }

  function clearPhotoInput() {
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleCroppedPhoto(avatar: string) {
    setUploading(true);
    setProfileError(null);
    try {
      await saveProfile({ avatar });
      setPendingPhoto(null);
    } catch {
      // saveProfile already surfaced the error and kept the dialog open.
    } finally {
      setUploading(false);
      clearPhotoInput();
    }
  }

  async function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const payload = await api<{ token: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      applyToken(payload.token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Password changed. Other devices were signed out.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Could not change your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="profile-grid">
        <aside className="profile-side">
          <section className="card profile-card">
            <div className="profile-avatar-wrap">
              <Avatar name={user.full_name} src={user.avatar} size={104} className="profile-avatar" />
              <button
                type="button"
                className="avatar-edit"
                onClick={() => fileInput.current?.click()}
                aria-label="Upload profile photo"
                disabled={uploading}
              >
                <Icon name={uploading ? "refresh" : "camera"} size={17} />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => choosePhoto(event.target.files?.[0])}
              />
            </div>
            <h2>{user.full_name}</h2>
            <span className="role-chip">{roleLabel(user.role)}</span>
            {student ? (
              <p className="profile-sub">
                {student.program}
                {student.year_level ? ` · ${student.year_level}` : ""}
                {student.section ? ` · Section ${student.section}` : ""}
              </p>
            ) : (
              <p className="profile-sub">CampusFlow staff account</p>
            )}

            <div className="profile-photo-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                <Icon name="camera" size={15} />
                {user.avatar ? "Change photo" : "Upload photo"}
              </button>
              {pendingPhoto ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingPhoto(null)}>
                  Cancel edit
                </button>
              ) : null}
              {user.avatar ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-danger-text"
                  onClick={() => saveProfile({ avatar: null })}
                  disabled={savingProfile}
                >
                  Remove
                </button>
              ) : null}
            </div>

            <dl className="profile-facts">
              <div>
                <dt>Username</dt>
                <dd>{user.username}</dd>
              </div>
              {student ? (
                <>
                  <div>
                    <dt>Student no.</dt>
                    <dd>{student.student_no}</dd>
                  </div>
                  <div>
                    <dt>Section</dt>
                    <dd>{student.section || "—"}</dd>
                  </div>
                </>
              ) : null}
            </dl>

            <button type="button" className="btn btn-ghost btn-block" onClick={() => logout()}>
              <Icon name="logout" size={16} />
              Sign out
            </button>
          </section>

          <section className="card">
            <SectionHeader title="Appearance" subtitle="Choose how CampusFlow looks." />
            <div className="theme-cards" role="radiogroup" aria-label="Theme preference">
              {(
                [
                  { value: "light", label: "Light", icon: "sun" },
                  { value: "dark", label: "Dark", icon: "moon" },
                  { value: "system", label: "System", icon: "monitor" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={preference === option.value}
                  className={`theme-card ${preference === option.value ? "is-active" : ""}`}
                  onClick={() => setPreference(option.value)}
                >
                  <span className={`theme-swatch theme-swatch-${option.value}`}>
                    <span />
                    <span />
                  </span>
                  <span className="theme-card-label">
                    <Icon name={option.icon} size={15} />
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className="profile-main">
          <section className="card">
            <SectionHeader
              title="Personal details"
              subtitle="Your name and email appear on records handled by the offices."
            />
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile();
              }}
            >
              <div className="form-row">
                <Field label="Full name" htmlFor="profile-name">
                  <input
                    id="profile-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email address" htmlFor="profile-email" hint="Used for office follow-ups.">
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@campus.edu.ph"
                    autoComplete="email"
                  />
                </Field>
              </div>

              {student ? (
                <div className="info-banner">
                  <Icon name="graduation" size={18} />
                  <div>
                    <strong>Enrolled student information</strong>
                    <p>
                      {student.program || "Program not set"} · {student.year_level || "Year level not set"} ·{" "}
                      {student.section ? `Section ${student.section}` : "Section not set"} · Student no.{" "}
                      {student.student_no}
                    </p>
                    <small>Ask the Registrar's Office to correct official enrollment details.</small>
                  </div>
                </div>
              ) : null}

              {profileError ? (
                <div className="alert alert-error" role="alert">
                  <Icon name="alert" size={17} />
                  <span>{profileError}</span>
                </div>
              ) : null}

              <div className="form-actions">
                <span className="muted small">
                  {student ? `Member since ${formatDate(student.created_at)}` : "CampusFlow staff account"}
                </span>
                <button type="submit" className="btn btn-primary" disabled={savingProfile || uploading}>
                  <Icon name="check" size={16} />
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <SectionHeader
              title="Password"
              subtitle="Changing your password signs you out of sessions on other devices."
            />
            <form className="form-stack" onSubmit={handlePassword}>
              <Field label="Current password" htmlFor="current-password">
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <div className="form-row">
                <Field label="New password" htmlFor="new-password" hint="At least 6 characters.">
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </Field>
                <Field label="Confirm new password" htmlFor="confirm-password">
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </Field>
              </div>

              {passwordError ? (
                <div className="alert alert-error" role="alert">
                  <Icon name="alert" size={17} />
                  <span>{passwordError}</span>
                </div>
              ) : null}

              <div className="form-actions">
                <span className="muted small">Use a password you do not use elsewhere.</span>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  <Icon name="lock" size={16} />
                  {savingPassword ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {pendingPhoto ? (
        <ImageCropModal
          file={pendingPhoto}
          busy={uploading}
          onCancel={() => {
            setPendingPhoto(null);
            clearPhotoInput();
          }}
          onApply={handleCroppedPhoto}
        />
      ) : null}
    </div>
  );
}
