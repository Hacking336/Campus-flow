import { useState } from "react";
import { useApi } from "../lib/useApi";
import type { OverviewResponse } from "../lib/types";
import {
  dateLabel,
  DOC_TYPE_LABELS,
  formatDate,
  formatDateTime,
  STATUS_LABELS,
  timeLabel,
  uniformLabel,
} from "../lib/format";
import { EmptyState, PageError, StatusBadge, StatusTrack } from "../components/ui";
import { Icon } from "../components/Icon";
import { Spinner } from "../components/ui";

type Tab = "documents" | "uniforms";

export function StudentRecords() {
  const { data, error, loading, reload } = useApi<OverviewResponse>("/me/overview");
  const [tab, setTab] = useState<Tab>("documents");

  if (loading && !data) return <Spinner label="Loading your records" />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  const documents = data.documents;
  const uniforms = data.uniforms;
  const documentCounts = {
    all: documents.length,
    ready: documents.filter((doc) => doc.status === "ready").length,
    claimed: documents.filter((doc) => doc.status === "claimed").length,
  };
  const uniformCounts = {
    all: uniforms.length,
    ready: uniforms.filter((uniform) => uniform.status === "ready").length,
    claimed: uniforms.filter((uniform) => uniform.status === "claimed").length,
  };

  return (
    <div className="page-stack">
      <div className="segmented-tabs" role="tablist" aria-label="Record type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "documents"}
          className={tab === "documents" ? "is-active" : ""}
          onClick={() => setTab("documents")}
        >
          <Icon name="file" size={17} />
          Documents
          <span className="tab-count">{documentCounts.all}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "uniforms"}
          className={tab === "uniforms" ? "is-active" : ""}
          onClick={() => setTab("uniforms")}
        >
          <Icon name="shirt" size={17} />
          Uniforms
          <span className="tab-count">{uniformCounts.all}</span>
        </button>
      </div>

      {tab === "documents" ? (
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Document requests</h2>
              <p>
                {documentCounts.ready} ready · {documentCounts.claimed} claimed · {documents.length} total
              </p>
            </div>
            <span className="mini-icon">
              <Icon name="file" size={16} />
            </span>
          </div>

          {documents.length === 0 ? (
            <EmptyState icon="file" title="No document requests yet" message="Visit the Registrar's Office to request a document." />
          ) : (
            <>
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
                        <td className="cell-remarks">{doc.remarks || <span className="muted">No remarks</span>}</td>
                        <td className="hide-sm">
                          <div className="cell-primary">
                            <span>{formatDateTime(doc.updated_at)}</span>
                            {doc.updated_by ? <small>by {doc.updated_by}</small> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-record-list">
                {documents.map((doc) => (
                  <article className="mobile-record" key={`m-${doc.id}`}>
                    <div className="mobile-record-head">
                      <div className="cell-primary">
                        <strong>{doc.doc_type}</strong>
                        <small>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</small>
                      </div>
                      <StatusTrack kind="document" status={doc.status} compact />
                    </div>
                    <div className="mobile-record-meta">
                      <span>Requested {formatDate(doc.date_requested)}</span>
                      <span>Ready {doc.date_ready ? dateLabel(doc.date_ready) : "—"}</span>
                    </div>
                    {doc.remarks ? <p className="remark-note">{doc.remarks}</p> : null}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Uniform orders</h2>
              <p>
                {uniformCounts.ready} ready · {uniformCounts.claimed} claimed · {uniforms.length} total
              </p>
            </div>
            <span className="mini-icon">
              <Icon name="shirt" size={16} />
            </span>
          </div>

          {uniforms.length === 0 ? (
            <EmptyState icon="shirt" title="No uniform orders yet" message="Order your PE or general uniform at the Property Office." />
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Uniform</th>
                      <th>Progress</th>
                      <th>Size</th>
                      <th>Tailoring</th>
                      <th>Ordered</th>
                      <th>Remarks</th>
                      <th className="hide-sm">Last update</th>
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
                        <td>
                          <StatusTrack kind="uniform" status={uniform.status} compact />
                        </td>
                        <td>{uniform.size || <span className="muted">—</span>}</td>
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
                        <td className="cell-remarks">{uniform.remarks || <span className="muted">No remarks</span>}</td>
                        <td className="hide-sm">
                          <div className="cell-primary">
                            <span>{formatDateTime(uniform.updated_at)}</span>
                            <small>by {uniform.updated_by || uniform.encoded_by}</small>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-record-list">
                {uniforms.map((uniform) => (
                  <article className="mobile-record" key={`m-${uniform.id}`}>
                    <div className="mobile-record-head">
                      <div className="cell-primary">
                        <strong>{uniformLabel(uniform.category, uniform.item)}</strong>
                        <small>
                          {uniform.size ? `Size ${uniform.size}` : uniform.category === "PE" ? "" : "No size"}
                        </small>
                      </div>
                      <StatusTrack kind="uniform" status={uniform.status} compact />
                    </div>
                    <div className="mobile-record-meta">
                      <span>Ordered {formatDate(uniform.date_ordered)} · {timeLabel(uniform.time_ordered)}</span>
                      {uniform.tailoring_status ? (
                        <span>Tailoring: {STATUS_LABELS[uniform.tailoring_status]}</span>
                      ) : null}
                    </div>
                    {uniform.remarks ? <p className="remark-note">{uniform.remarks}</p> : null}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
