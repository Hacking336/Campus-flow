import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../context/AuthContext";
import type { StudentWithCounts } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Avatar, EmptyState, PageError, Spinner } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { DeleteStudentModal, ImportModal, StudentModal } from "../../components/RecordModals";
import { useToast } from "../../context/ToastContext";

interface StudentsResponse {
  students: StudentWithCounts[];
  total: number;
}

export function StaffStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentWithCounts | null>(null);

  // The top bar search links here with ?q=…; without this the page keeps the
  // query it first mounted with and ignores a second search.
  useEffect(() => {
    setQuery(urlQuery);
    setDebounced(urlQuery.trim());
  }, [urlQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const path = `/students?q=${encodeURIComponent(debounced)}`;
  const { data, error, loading, reload } = useApi<StudentsResponse>(path);
  const isCustodian = user?.role === "custodian";
  const canManage = user?.role === "admin" || user?.role === "registrar";
  // The Property Office adds a student who walks in to order a uniform, so the
  // roster entry is theirs to create; importing the list stays with the registrar.
  const canAdd = canManage || isCustodian;
  // The Property Office files the walk-in's uniform order with the roster entry.
  const canOrder = isCustodian || user?.role === "admin";
  const canDelete = canManage || isCustodian;
  const students = data?.students ?? [];

  return (
    <div className="page-stack">
      <section className="card">
        <div className="toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by student number, name or program"
              aria-label="Search students"
              autoFocus
            />
            {query ? (
              <button type="button" className="input-action" onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="close" size={16} />
              </button>
            ) : null}
          </div>
          {canAdd ? (
            <div className="button-row">
              {canManage ? (
                <button type="button" className="btn btn-ghost" onClick={() => setShowImport(true)}>
                  <Icon name="upload" size={16} />
                  Import list
                </button>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
                <Icon name="plus" size={16} />
                Add student
              </button>
            </div>
          ) : null}
        </div>

        {error ? <PageError message={error} onRetry={reload} /> : null}

        {loading && !data ? (
          <Spinner label="Searching students" />
        ) : students.length === 0 ? (
          <EmptyState
            icon="users"
            title={debounced ? "No students matched" : "No students yet"}
            message={
              debounced
                ? `We could not find a student for “${debounced}”. Check the student number or try a surname.`
                : canManage
                  ? "Add a student one by one, or import the registrar's list."
                  : "Add the student ordering a uniform, or ask the registrar for the list."
            }
            action={
              canAdd && !debounced ? (
                <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
                  <Icon name="plus" size={16} /> Add student
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table student-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Program</th>
                    <th>Ready for pick-up</th>
                    <th>In progress</th>
                    <th>Login</th>
                    <th className="align-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const ready = student.ready_documents + student.ready_uniforms;
                    const pending = student.pending_documents + student.pending_uniforms;
                    return (
                      <tr
                        key={student.student_no}
                        className="clickable-row"
                        onClick={() => navigate(`/staff/students/${encodeURIComponent(student.student_no)}`)}
                      >
                        <td>
                          <div className="student-cell">
                            <Avatar name={student.full_name} src={student.avatar} size={38} />
                            <div className="cell-primary">
                              <strong>{student.full_name}</strong>
                              <small>{student.student_no}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-primary">
                            <span>{student.program || "—"}</span>
                            <small>
                              {[student.year_level, student.section ? `Sec. ${student.section}` : null]
                                .filter(Boolean)
                                .join(" · ") || "Year and section not set"}
                            </small>
                          </div>
                        </td>
                        <td>
                          {ready > 0 ? (
                            <span className="ready-count">{ready} ready</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>{pending > 0 ? `${pending} pending` : <span className="muted">—</span>}</td>
                        <td>
                          {student.has_account ? (
                            <span className="account-chip is-active">
                              <Icon name="check" size={13} /> Active
                            </span>
                          ) : (
                            <span className="account-chip">No login</span>
                          )}
                        </td>
                        <td className="align-right">
                          <div className="row-actions">
                            {canDelete ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-danger-text"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteTarget(student);
                                }}
                                aria-label={`Delete ${student.full_name}`}
                              >
                                <Icon name="trash" size={15} /> Delete
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/staff/students/${encodeURIComponent(student.student_no)}`);
                              }}
                            >
                              Open <Icon name="chevronRight" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phone layout: the table above is hidden below 720px. */}
            <div className="mobile-record-list">
              {students.map((student) => {
                const ready = student.ready_documents + student.ready_uniforms;
                const pending = student.pending_documents + student.pending_uniforms;
                return (
                  <article
                    className="mobile-record"
                    key={`m-${student.student_no}`}
                    onClick={() => navigate(`/staff/students/${encodeURIComponent(student.student_no)}`)}
                  >
                    <div className="mobile-record-head">
                      <div className="student-cell">
                        <Avatar name={student.full_name} src={student.avatar} size={36} />
                        <div className="cell-primary">
                          <strong>{student.full_name}</strong>
                          <small>{student.student_no}</small>
                        </div>
                      </div>
                      {ready > 0 ? <span className="ready-count">{ready} ready</span> : null}
                    </div>
                    <div className="mobile-record-meta">
                      <span>{student.program || "Program not set"}</span>
                      <span>{pending > 0 ? `${pending} in progress` : "Nothing in progress"}</span>
                      <span>{student.has_account ? "Login active" : "No login yet"}</span>
                    </div>
                    <div className="row-actions">
                      {canDelete ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger-text"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(student);
                          }}
                          aria-label={`Delete ${student.full_name}`}
                        >
                          <Icon name="trash" size={15} /> Delete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/staff/students/${encodeURIComponent(student.student_no)}`);
                        }}
                      >
                        Open record <Icon name="chevronRight" size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="table-foot">
              Showing {students.length} student{students.length === 1 ? "" : "s"}
              {data && data.total > students.length ? ` of ${data.total}` : ""} · last updated{" "}
              {formatDate(students[0]?.updated_at)}
            </p>
          </>
        )}
      </section>

      {showAdd ? (
        <StudentModal
          allowAccount={canManage}
          allowUniformOrder={canOrder}
          onClose={() => setShowAdd(false)}
          onSaved={(student) => {
            reload();
            notify(`Student ${student.full_name} is on the list.`, "info");
          }}
        />
      ) : null}

      {showImport ? (
        <ImportModal onClose={() => setShowImport(false)} onImported={reload} />
      ) : null}

      {deleteTarget ? (
        <DeleteStudentModal
          studentNo={deleteTarget.student_no}
          fullName={deleteTarget.full_name}
          summary={[
            canManage
              ? `${deleteTarget.ready_documents + deleteTarget.pending_documents} document record(s)`
              : "Document requests filed with the registrar",
            `${deleteTarget.ready_uniforms + deleteTarget.pending_uniforms} uniform order(s)`,
            deleteTarget.has_account ? "Student login (signs them out everywhere)" : "No student login",
          ]}
          onClose={() => setDeleteTarget(null)}
          onDeleted={reload}
        />
      ) : null}
    </div>
  );
}
