import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../context/AuthContext";
import type { UniformOrder } from "../../lib/types";
import { dateLabel, formatDate, timeLabel, uniformLabel } from "../../lib/format";
import { EmptyState, PageError, Spinner, StatusBadge, StatusTrack } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { CancelRecordModal, UniformModal, UniformOrderModal } from "../../components/RecordModals";

const STATUS_FILTERS = ["all", "ordered", "ready", "claimed", "cancelled"] as const;
const CANCELLABLE = ["ordered", "ready"];
const CATEGORY_FILTERS = ["all", "PE", "General", "Nursing"] as const;

export function StaffUniforms() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<string>(params.get("status") ?? "all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<UniformOrder | null>(null);
  const [cancelling, setCancelling] = useState<UniformOrder | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const search = new URLSearchParams();
  if (debounced) search.set("q", debounced);
  if (status !== "all") search.set("status", status);
  if (category !== "all") search.set("category", category);
  const path = `/uniforms?${search.toString()}`;
  const { data, error, loading, reload } = useApi<{ uniforms: UniformOrder[] }>(path);

  const canManage = user?.role === "admin" || user?.role === "custodian";
  const uniforms = data?.uniforms ?? [];

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
              aria-label="Search uniform orders"
            />
            {query ? (
              <button type="button" className="input-action" onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="close" size={16} />
              </button>
            ) : null}
          </div>

          <div className="filter-row">
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by uniform type">
              {CATEGORY_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All uniform types" : value === "PE" ? "P.E. uniform" : `${value} uniform`}
                </option>
              ))}
            </select>
            {canManage ? (
              <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
                <Icon name="plus" size={16} />
                New order
              </button>
            ) : null}
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
          <Spinner label="Loading uniform orders" />
        ) : uniforms.length === 0 ? (
          <EmptyState
            icon="shirt"
            title="No uniform orders found"
            message={
              debounced || status !== "all" || category !== "all"
                ? "Try a different status, uniform type, or search term."
                : "No uniform orders are on file."
            }
            action={
              canManage ? (
                <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
                  <Icon name="plus" size={16} /> New order
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Uniform</th>
                    <th>Size</th>
                    <th>Progress</th>
                    <th>Tailoring</th>
                    <th>Ordered</th>
                    <th>Remarks</th>
                    <th className="hide-sm">Last update</th>
                    {canManage ? <th className="align-right">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {uniforms.map((uniform) => (
                    <tr key={uniform.id}>
                      <td>
                        <div className="cell-primary">
                          <strong>{uniform.full_name}</strong>
                          <small>{uniform.student_no}</small>
                        </div>
                      </td>
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
                          <span>{dateLabel(uniform.updated_at)}</span>
                          <small>{uniform.updated_by || uniform.encoded_by}</small>
                        </div>
                      </td>
                      {canManage ? (
                        <td className="align-right">
                          <div className="row-actions">
                            {CANCELLABLE.includes(uniform.status) ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-danger-text"
                                onClick={() => setCancelling(uniform)}
                              >
                                <Icon name="close" size={15} /> Cancel
                              </button>
                            ) : null}
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(uniform)}>
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
              {uniforms.length} order{uniforms.length === 1 ? "" : "s"} shown
            </p>
          </>
        )}
      </section>

      {showNew ? (
        <UniformOrderModal
          onClose={() => setShowNew(false)}
          onSaved={reload}
        />
      ) : null}

      {editing ? (
        <UniformModal
          studentNo={editing.student_no}
          studentName={editing.full_name}
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      ) : null}

      {cancelling ? (
        <CancelRecordModal
          title="Cancel this uniform order?"
          subtitle={`${cancelling.full_name} · ${uniformLabel(cancelling.category, cancelling.item)}`}
          message="The order is withdrawn: the student stops seeing it as pending or ready. No stock is deducted, because nothing was claimed."
          endpoint={`/uniforms/${cancelling.id}/cancel`}
          onClose={() => setCancelling(null)}
          onCancelled={reload}
        />
      ) : null}
    </div>
  );
}
