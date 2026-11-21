import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, ApiError } from "../../lib/api";
import type { DocumentRecord, Student, UniformOrder } from "../../lib/types";
import {
  dateLabel,
  DOC_TYPE_LABELS,
  formatDate,
  formatDateTime,
  timeLabel,
  uniformLabel,
} from "../../lib/format";
import { Avatar, EmptyState, Field, Modal, PageError, Spinner, StatusBadge, StatusTrack } from "../../components/ui";
import { Icon } from "../../components/Icon";
import {
  CancelRecordModal,
  DeleteStudentModal,
  DocumentModal,
  StudentModal,
  UniformModal,
} from "../../components/RecordModals";

const CANCELLABLE_DOC = ["requested", "processing", "ready"];
const CANCELLABLE_UNIFORM = ["ordered", "ready"];

interface DetailResponse {
  student: Student;
  documents: DocumentRecord[];
  uniforms: UniformOrder[];
  account: { has_account: number; username?: string; avatar?: string | null; created_at?: string };
  can_manage: boolean;
  /** Which desk this record was scoped to: the registrar sees documents only, the Property Office uniforms only. */
  scope?: "documents" | "uniforms" | "all";
}

type ModalState =
  | { type: "document"; record: DocumentRecord }
  | { type: "uniform"; record: UniformOrder }
  | { type: "edit-student" }
  | { type: "account" }
  | { type: "delete-student" }
  | null;

export function StudentDetail() {
  const { studentNo = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, error, loading, reload } = useApi<DetailResponse>(`/students/${encodeURIComponent(studentNo)}`);
  const [modal, setModal] = useState<ModalState>(null);
  const [password, setPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<
    { kind: "document" | "uniform"; id: number; label: string } | null
  >(null);

  const isAdmin = user?.role === "admin";
  const isRegistrar = user?.role === "registrar";
  const isCustodian = user?.role === "custodian";
  const canDocs = isAdmin || isRegistrar;
  const canUniforms = isAdmin || isCustodian;
  // The registrar maintains the student roster and their logins.
  const canManageStudent = isAdmin || isRegistrar;
  // The Property Office may remove a student from the roster too.
  const canDeleteStudent = canManageStudent || isCustodian;
  const canCancelUniforms = canUniforms;

  if (loading && !data) return <Spinner label="Loading student record" />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  const { student, documents, uniforms, account } = data;
  // Staff only see the records of their own desk; the server already scopes the
  // payload, and these flags keep the empty section off the page entirely.
  const showDocs = data.scope !== "uniforms";
  const showUniforms = data.scope !== "documents";
  const readyDocs = documents.filter((doc) => doc.status === "ready");
  const readyUniforms = uniforms.filter((uniform) => uniform.status === "ready");
  const readyTotal = readyDocs.length + readyUniforms.length;

  async function createOrResetAccount() {
    setAccountError(null);
    setAccountBusy(true);
    try {
      const result = await api<{ was_reset: boolean; username: string }>(
        `/students/${encodeURIComponent(student.student_no)}/account`,
        {
          method: "POST",
          body: JSON.stringify({ password: password || undefined }),
        }
      );
      notify(result.was_reset ? "Student password reset." : "Student login created.");
      setModal(null);
      setPassword("");
      reload();
    } catch (err) {
      setAccountError(err instanceof ApiError ? err.message : "Could not update this account.");
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <Link to="/staff/students" className="back-link">
        <Icon name="arrowLeft" size={16} /> Back to students
      </Link>

      <section className="card student-header">
        <div className="student-header-main">
          <Avatar name={student.full_name} src={account.avatar} size={72} />
          <div className="student-header-copy">
            <div className="student-header-title">
              <h2>{student.full_name}</h2>
              {readyTotal > 0 ? <span className="ready-count">{readyTotal} ready</span> : null}
            </div>
            <p>
              <strong>{student.student_no}</strong>
              {student.program ? <> · {student.program}</> : null}
              {student.year_level ? <> · {student.year_level}</> : null}
              {student.section ? <> · Section {student.section}</> : null}
            </p>
            <div className="student-header-meta">
              <span>
                <Icon name="idCard" size={14} />
                {account.has_account ? `Login: ${account.username}` : "No student login yet"}
              </span>
              {student.email ? (
                <span>
                  <Icon name="info" size={14} />
                  {student.email}
                </span>
              ) : null}
              <span>
                <Icon name="clock" size={14} /> Updated {dateLabel(student.updated_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="student-header-actions">
          {canManageStudent ? (
            <button type="button" className="btn btn-ghost" onClick={() => setModal({ type: "edit-student" })}>
              <Icon name="edit" size={16} /> Edit info
            </button>
          ) : null}
          {canDeleteStudent ? (
            <button
              type="button"
              className="btn btn-ghost btn-danger-text"
              onClick={() => setModal({ type: "delete-student" })}
            >
              <Icon name="trash" size={16} /> Delete
            </button>
          ) : null}
        </div>
      </section>

      <section className="mini-stat-grid">
        {showDocs ? (
          <>
            <div className="mini-stat tone-emerald">
              <span>Documents ready</span>
              <strong>{readyDocs.length}</strong>
            </div>
            <div className="mini-stat tone-amber">
              <span>Documents in progress</span>
              <strong>{documents.filter((doc) => ["requested", "processing"].includes(doc.status)).length}</strong>
            </div>
          </>
        ) : null}
        {showUniforms ? (
          <>
            <div className="mini-stat tone-violet">
              <span>Uniforms ready</span>
              <strong>{readyUniforms.length}</strong>
            </div>
            <div className="mini-stat tone-sky">
              <span>Uniforms in progress</span>
              <strong>{uniforms.filter((uniform) => uniform.status === "ordered").length}</strong>
            </div>
          </>
        ) : null}
      </section>

      {showDocs ? (
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Document records</h2>
            <p>Registrar records linked to {student.student_no}.</p>
          </div>
        </div>

        {documents.length === 0 ? (
          <EmptyState icon="file" title="No document records" message="No document is on file for this student." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Progress</th>
                  <th>Requested</th>
                  <th>Ready</th>
                  <th>Remarks</th>
                  <th className="hide-sm">Last update</th>
                  {canDocs ? <th className="align-right">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="cell-primary">
                        <strong>{doc.doc_type}</strong>
                        <small>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</small>
                      </div>
                    </td>
                    <td>
                      <StatusTrack kind="document" status={doc.status} compact />
                    </td>
                    <td>{formatDate(doc.date_requested)}</td>
                    <td>{doc.date_ready ? dateLabel(doc.date_ready) : "—"}</td>
                    <td className="cell-remarks">{doc.remarks || <span className="muted">—</span>}</td>
                    <td className="hide-sm">
                      <div className="cell-primary">
                        <span>{formatDateTime(doc.updated_at)}</span>
                        {doc.updated_by ? <small>{doc.updated_by}</small> : null}
                      </div>
                    </td>
                    {canDocs ? (
                      <td className="align-right">
                        <div className="row-actions">
                          {CANCELLABLE_DOC.includes(doc.status) ? (
                            <button
                              type="button"
                              className="icon-btn btn-danger-text"
                              aria-label="Cancel document request"
                              title="Cancel this request"
                              onClick={() =>
                                setCancelTarget({
                                  kind: "document",
                                  id: doc.id,
                                  label: `${doc.doc_type} · ${student.full_name}`,
                                })
                              }
                            >
                              <Icon name="close" size={16} />
                            </button>
                          ) : null}
                          <button type="button" className="icon-btn" onClick={() => setModal({ type: "document", record: doc })} aria-label="Edit document">
                            <Icon name="edit" size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}

      {showUniforms ? (
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Uniform orders</h2>
            <p>PE, general and nursing uniforms linked to {student.student_no}.</p>
          </div>
        </div>

        {uniforms.length === 0 ? (
          <EmptyState icon="shirt" title="No uniform orders" message="No uniform order is on file for this student." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Uniform</th>
                  <th>Size</th>
                  <th>Progress</th>
                  <th>Tailoring</th>
                  <th>Ordered</th>
                  <th>Remarks</th>
                  <th className="hide-sm">Last update</th>
                  {canCancelUniforms ? <th className="align-right">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {uniforms.map((uniform) => (
                  <tr key={uniform.id}>
                    <td>
                      <div className="cell-primary">
                        <strong>{uniformLabel(uniform.category, uniform.item)}</strong>
                        <small>{uniform.category} uniform</small>
                      </div>
                    </td>
                    <td>{uniform.size || <span className="muted">—</span>}</td>
                    <td>
                      <StatusTrack kind="uniform" status={uniform.status} compact />
                    </td>
                    <td>
                      {uniform.tailoring_status ? (
                        <StatusBadge status={uniform.tailoring_status} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-primary">
                        <span>{formatDate(uniform.date_ordered)}</span>
                        <small>{timeLabel(uniform.time_ordered)}</small>
                      </div>
                    </td>
                    <td className="cell-remarks">{uniform.remarks || <span className="muted">—</span>}</td>
                    <td className="hide-sm">
                      <div className="cell-primary">
                        <span>{formatDateTime(uniform.updated_at)}</span>
                        <small>{uniform.updated_by || uniform.encoded_by}</small>
                      </div>
                    </td>
                    {canCancelUniforms ? (
                      <td className="align-right">
                        <div className="row-actions">
                          {CANCELLABLE_UNIFORM.includes(uniform.status) ? (
                            <button
                              type="button"
                              className="icon-btn btn-danger-text"
                              aria-label="Cancel uniform order"
                              title="Cancel this order"
                              onClick={() =>
                                setCancelTarget({
                                  kind: "uniform",
                                  id: uniform.id,
                                  label: `${uniformLabel(uniform.category, uniform.item)} · ${student.full_name}`,
                                })
                              }
                            >
                              <Icon name="close" size={16} />
                            </button>
                          ) : null}
                          {canUniforms ? (
                            <button type="button" className="icon-btn" onClick={() => setModal({ type: "uniform", record: uniform })} aria-label="Edit uniform order">
                              <Icon name="edit" size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}

      {canManageStudent ? (
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Student login</h2>
              <p>Students use their student number and password to view these records.</p>
            </div>
            <span className={`account-chip ${account.has_account ? "is-active" : ""}`}>
              {account.has_account ? "Account active" : "No login yet"}
            </span>
          </div>
          <div className="account-row">
            <div className="cell-primary">
              <span>{account.has_account ? `Username: ${account.username}` : "Create a login for this student"}</span>
              <small>
                {account.has_account
                  ? `Created ${formatDate(account.created_at)} · records are always linked to ${student.student_no}`
                  : "The student can change the password after their first sign-in."}
              </small>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setModal({ type: "account" })}>
              <Icon name="lock" size={16} />
              {account.has_account ? "Reset password" : "Create login"}
            </button>
          </div>
        </section>
      ) : null}

      {modal?.type === "document" ? (
        <DocumentModal
          studentNo={student.student_no}
          studentName={student.full_name}
          record={modal.record}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      ) : null}

      {modal?.type === "uniform" ? (
        <UniformModal
          studentNo={student.student_no}
          studentName={student.full_name}
          record={modal.record}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      ) : null}

      {modal?.type === "edit-student" ? (
        <StudentModal
          student={student}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            // A corrected student number changes this record's URL.
            if (saved.student_no !== student.student_no) {
              navigate(`/staff/students/${encodeURIComponent(saved.student_no)}`, { replace: true });
            } else {
              reload();
            }
          }}
        />
      ) : null}

      {modal?.type === "account" ? (
        <Modal
          title={account.has_account ? "Reset student password" : "Create student login"}
          subtitle={`${student.full_name} · ${student.student_no}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={createOrResetAccount} disabled={accountBusy}>
                <Icon name="check" size={16} />
                {accountBusy ? "Saving…" : account.has_account ? "Reset password" : "Create login"}
              </button>
            </>
          }
        >
          <div className="form-stack">
            <Field
              label="New password (optional)"
              htmlFor="account-password"
              hint="Leave blank to use the default student password from Settings."
            >
              <input
                id="account-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Default password"
                minLength={6}
              />
            </Field>
            {account.has_account ? (
              <p className="modal-meta">
                Resetting the password also signs the student out of active sessions.
              </p>
            ) : null}
            {accountError ? (
              <div className="alert alert-error" role="alert">
                <Icon name="alert" size={17} />
                <span>{accountError}</span>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {cancelTarget ? (
        <CancelRecordModal
          title={cancelTarget.kind === "document" ? "Cancel this document request?" : "Cancel this uniform order?"}
          subtitle={cancelTarget.label}
          message={
            cancelTarget.kind === "document"
              ? "The request is withdrawn: the student stops seeing it as pending or ready, and the Registrar's Office no longer prepares it."
              : "The order is withdrawn: the student stops seeing it as pending or ready. No stock is deducted, because nothing was claimed."
          }
          endpoint={`/${cancelTarget.kind === "document" ? "documents" : "uniforms"}/${cancelTarget.id}/cancel`}
          onClose={() => setCancelTarget(null)}
          onCancelled={reload}
        />
      ) : null}

      {modal?.type === "delete-student" ? (
        <DeleteStudentModal
          studentNo={student.student_no}
          fullName={student.full_name}
          summary={[
            canDocs
              ? `${documents.length} document record${documents.length === 1 ? "" : "s"}`
              : "Document requests filed with the registrar",
            `${uniforms.length} uniform order${uniforms.length === 1 ? "" : "s"}`,
            account.has_account ? "Student login (signs them out everywhere)" : "No student login",
          ]}
          onClose={() => setModal(null)}
          onDeleted={() => navigate("/staff/students", { replace: true })}
        />
      ) : null}
    </div>
  );
}
