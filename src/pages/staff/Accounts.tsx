import { useState } from "react";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import type { Role } from "../../lib/types";
import { formatDate, roleLabel } from "../../lib/format";
import { Avatar, EmptyState, Field, Modal, PageError, Spinner } from "../../components/ui";
import { Icon } from "../../components/Icon";

interface AccountRow {
  id: number;
  username: string;
  role: Role;
  full_name: string;
  email: string | null;
  avatar: string | null;
  student_no: string | null;
  program: string | null;
  year_level: string | null;
  created_at: string;
  updated_at: string;
}

type Tab = "staff" | "students";

export function StaffAccounts() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, error, loading, reload } = useApi<{ users: AccountRow[] }>("/users");
  const [tab, setTab] = useState<Tab>("staff");
  const [query, setQuery] = useState("");
  const [formAccount, setFormAccount] = useState<AccountRow | "new" | null>(null);
  const [resetAccount, setResetAccount] = useState<AccountRow | null>(null);
  const [removeAccount, setRemoveAccount] = useState<AccountRow | null>(null);

  if (loading && !data) return <Spinner label="Loading accounts" />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  const filtered = data.users.filter((account) => {
    if (tab === "staff" && account.role === "student") return false;
    if (tab === "students" && account.role !== "student") return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return (
      account.full_name.toLowerCase().includes(needle) ||
      account.username.toLowerCase().includes(needle) ||
      (account.student_no ?? "").toLowerCase().includes(needle) ||
      (account.email ?? "").toLowerCase().includes(needle)
    );
  });

  const staffCount = data.users.filter((account) => account.role !== "student").length;
  const studentCount = data.users.filter((account) => account.role === "student").length;

  return (
    <div className="page-stack">
      <section className="card">
        <div className="toolbar toolbar-wrap">
          <div className="segmented-tabs segmented-inline" role="tablist" aria-label="Account type">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "staff"}
              className={tab === "staff" ? "is-active" : ""}
              onClick={() => setTab("staff")}
            >
              <Icon name="idCard" size={16} /> Staff <span className="tab-count">{staffCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "students"}
              className={tab === "students" ? "is-active" : ""}
              onClick={() => setTab("students")}
            >
              <Icon name="graduation" size={16} /> Students <span className="tab-count">{studentCount}</span>
            </button>
          </div>

          <div className="filter-row">
            <div className="search-field">
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search accounts"
                aria-label="Search accounts"
              />
            </div>
            {tab === "staff" ? (
              <button type="button" className="btn btn-primary" onClick={() => setFormAccount("new")}>
                <Icon name="plus" size={16} /> Add staff
              </button>
            ) : null}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title={query ? "No accounts matched" : tab === "staff" ? "No staff accounts" : "No student logins yet"}
            message={
              query
                ? "Try another name, username, or student number."
                : tab === "staff"
                  ? "Create a registrar, property, or admin login."
                  : "Import the student list with logins enabled, or create a login from a student's record."
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tab === "staff" ? "Staff member" : "Student"}</th>
                  <th>Username</th>
                  <th>{tab === "staff" ? "Role" : "Program"}</th>
                  <th className="hide-sm">Email</th>
                  <th className="hide-sm">Created</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="student-cell">
                        <Avatar name={account.full_name} src={account.avatar} size={36} />
                        <div className="cell-primary">
                          <strong>{account.full_name}</strong>
                          {account.role === "student" ? <small>{account.student_no}</small> : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="inline-code">{account.username}</code>
                    </td>
                    <td>
                      {account.role === "student" ? (
                        <div className="cell-primary">
                          <span>{account.program || "—"}</span>
                          <small>{account.year_level || ""}</small>
                        </div>
                      ) : (
                        <span className="role-chip role-chip-sm">{roleLabel(account.role)}</span>
                      )}
                    </td>
                    <td className="hide-sm">{account.email || <span className="muted">—</span>}</td>
                    <td className="hide-sm">{formatDate(account.created_at)}</td>
                    <td className="align-right">
                      <div className="row-actions">
                        {account.role !== "student" ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormAccount(account)}>
                            Edit
                          </button>
                        ) : null}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetAccount(account)}>
                          Reset password
                        </button>
                        {account.id !== user?.id ? (
                          <button
                            type="button"
                            className="icon-btn subtle btn-danger-text"
                            aria-label={`Remove ${account.username}`}
                            title="Remove account"
                            onClick={() => setRemoveAccount(account)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="table-foot">
          Student logins are always linked to a student number. Removing a login does not delete the student's document or
          uniform records.
        </p>
      </section>

      <div className="info-banner">
        <Icon name="info" size={18} />
        <div>
          <strong>How students get accounts</strong>
          <p>
            Recommended: import the registrar's list from <strong>Students</strong> with “Create logins” enabled. Each
            student receives the default password and can change it after signing in. Alternatively, students may
            self-register using a student number that is already on the roster — this can be turned off in Settings.
          </p>
        </div>
      </div>

      {formAccount ? (
        <StaffFormModal
          account={formAccount === "new" ? null : formAccount}
          onClose={() => setFormAccount(null)}
          onSaved={() => {
            reload();
            notify(formAccount === "new" ? "Staff account created." : "Staff account updated.");
          }}
        />
      ) : null}

      {resetAccount ? (
        <ResetPasswordModal
          account={resetAccount}
          onClose={() => setResetAccount(null)}
          onSaved={() => {
            reload();
            notify(`Password reset for ${resetAccount.username}.`);
          }}
        />
      ) : null}

      {removeAccount ? (
        <RemoveAccountModal
          account={removeAccount}
          onClose={() => setRemoveAccount(null)}
          onRemoved={() => {
            reload();
            notify(`${removeAccount.username} can no longer sign in.`, "info");
          }}
        />
      ) : null}
    </div>
  );
}

function StaffFormModal({
  account,
  onClose,
  onSaved,
}: {
  account: AccountRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(account?.username ?? "");
  const [fullName, setFullName] = useState(account?.full_name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [role, setRole] = useState<Role>(account?.role ?? "registrar");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (account) {
        await api(`/users/${account.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            full_name: fullName,
            email,
            role,
            password: password || undefined,
          }),
        });
      } else {
        await api("/users", {
          method: "POST",
          body: JSON.stringify({ username, full_name: fullName, email, role, password }),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={account ? "Edit staff account" : "Add staff account"}
      subtitle={account ? account.username : "Registrar, Property Office, or Administrator"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="staff-form" className="btn btn-primary" disabled={saving}>
            <Icon name="check" size={16} />
            {saving ? "Saving…" : account ? "Save changes" : "Create account"}
          </button>
        </>
      }
    >
      <form id="staff-form" className="form-stack" onSubmit={submit}>
        <div className="form-row">
          <Field label="Username" htmlFor="staff-username">
            <input
              id="staff-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. registrar2"
              disabled={Boolean(account)}
              required
            />
          </Field>
          <Field label="Role" htmlFor="staff-role">
            <select id="staff-role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="registrar">Registrar staff</option>
              <option value="custodian">Property custodian</option>
              <option value="admin">Administrator</option>
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Full name" htmlFor="staff-name">
            <input
              id="staff-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </Field>
          <Field label="Email" htmlFor="staff-email">
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="office@campus.edu.ph"
            />
          </Field>
        </div>
        <Field
          label={account ? "New password (optional)" : "Password"}
          htmlFor="staff-password"
          hint={account ? "Leave blank to keep the current password." : "At least 6 characters."}
        >
          <input
            id="staff-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={account ? undefined : 6}
            required={!account}
            placeholder={account ? "Unchanged" : "Temporary password"}
          />
        </Field>
        {error ? (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={17} />
            <span>{error}</span>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  account,
  onClose,
  onSaved,
}: {
  account: AccountRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api(`/users/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset this password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Reset password"
      subtitle={`${account.full_name} · ${account.username}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="reset-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Reset password"}
          </button>
        </>
      }
    >
      <form id="reset-form" className="form-stack" onSubmit={submit}>
        <Field label="New password" htmlFor="reset-password" hint="Active sessions for this account will be signed out.">
          <input
            id="reset-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            placeholder="At least 6 characters"
            required
          />
        </Field>
        {error ? (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={17} />
            <span>{error}</span>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function RemoveAccountModal({
  account,
  onClose,
  onRemoved,
}: {
  account: AccountRow;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await api(`/users/${account.id}`, { method: "DELETE" });
      onRemoved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove this account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Remove account?"
      subtitle={`${account.full_name} · ${account.username}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
            <Icon name="trash" size={16} />
            {busy ? "Removing…" : "Remove account"}
          </button>
        </>
      }
    >
      <p>
        This account will no longer be able to sign in.{" "}
        {account.role === "student"
          ? "The student's document and uniform records are kept."
          : "Records they encoded remain labelled with their name."}
      </p>
      {error ? (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" size={17} />
          <span>{error}</span>
        </div>
      ) : null}
    </Modal>
  );
}
