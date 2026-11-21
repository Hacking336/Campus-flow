import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../context/AuthContext";
import type { DocumentRecord } from "../../lib/types";
import { dateLabel, DOC_TYPES, formatDate, formatDateTime } from "../../lib/format";
import { EmptyState, PageError, Spinner, StatusTrack } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { CancelRecordModal, DocumentModal } from "../../components/RecordModals";

const STATUS_FILTERS = ["all", "requested", "processing", "ready", "claimed", "cancelled"] as const;
const CANCELLABLE = ["requested", "processing", "ready"];

export function StaffDocuments() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<string>(params.get("status") ?? "all");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [cancelling, setCancelling] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const search = new URLSearchParams();
  if (debounced) search.set("q", debounced);
  if (status !== "all") search.set("status", status);
  if (type) search.set("type", type);
  const path = `/documents?${search.toString()}`;
  const { data, error, loading, reload } = useApi<{ documents: DocumentRecord[] }>(path);

  const canManage = user?.role === "admin" || user?.role === "registrar";
  const documents = data?.documents ?? [];

  return (
    <div className="page-stack">
      <section className="dash-panel record-panel">
        <div className="toolbar toolbar-wrap">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search student number or name"
              aria-label="Search document records"
            />
            {query ? (
              <button type="button" className="input-action" onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="close" size={16} />
              </button>
            ) : null}
          </div>

          <div className="filter-row">
            <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by document type">
              <option value="">All document types</option>
              {DOC_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="segmented-tabs record-tabs" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={status === value}
              className={status === value ? "is-active" : ""}
              onClick={() => setStatus(value)}
            >
              {value === "all" ? "All" : value === "ready" ? "Ready for pick-up" : value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>

        {error ? <PageError message={error} onRetry={reload} /> : null}

        {loading && !data ? (
          <Spinner label="Loading document records" />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="file"
            title="No document records found"
            message={
              debounced || status !== "all" || type
                ? "Try a different status, document type, or search term."
                : "No document records are on file."
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Document</th>
                    <th>Progress</th>
                    <th>Requested</th>
                    <th>Ready</th>
                    <th>Remarks</th>
                    <th className="hide-sm">Last update</th>
                    {canManage ? <th className="align-right">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="cell-primary">
                          <strong>{doc.full_name}</strong>
                          <small>{doc.student_no}</small>
                        </div>
                      </td>
                      <td>
                        <div className="cell-primary">
                          <strong>{doc.doc_type}</strong>
                          <small>{doc.program}</small>
                        </div>
                      </td>
                      <td>
                        <StatusTrack kind="document" status={doc.status} compact />
                      </td>
                      <td>{formatDate(doc.date_requested)}</td>
                      <td>{doc.date_ready ? dateLabel(doc.date_ready) : <span className="muted">—</span>}</td>
                      <td className="cell-remarks">{doc.remarks || <span className="muted">—</span>}</td>
                      <td className="hide-sm">
                        <div className="cell-primary">
                          <span>{formatDateTime(doc.updated_at)}</span>
                          <small>{doc.updated_by || doc.encoded_by}</small>
                        </div>
                      </td>
                      {canManage ? (
                        <td className="align-right">
                          <div className="row-actions">
                            {CANCELLABLE.includes(doc.status) ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-danger-text"
                                onClick={() => setCancelling(doc)}
                              >
                                <Icon name="close" size={15} /> Cancel
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditing(doc)}
                            >
                              <Icon name="edit" size={15} /> Update
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-foot">
              {documents.length} record{documents.length === 1 ? "" : "s"} shown · statuses are updated by registrar staff
            </p>
          </>
        )}
      </section>

      {editing ? (
        <DocumentModal
          studentNo={editing.student_no}
          studentName={editing.full_name}
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      ) : null}

      {cancelling ? (
        <CancelRecordModal
          title="Cancel this document request?"
          subtitle={`${cancelling.full_name} · ${cancelling.doc_type}`}
          message="The request is withdrawn: the student stops seeing it as pending or ready, and the Registrar's Office no longer prepares it."
          endpoint={`/documents/${cancelling.id}/cancel`}
          onClose={() => setCancelling(null)}
          onCancelled={reload}
        />
      ) : null}
    </div>
  );
}
