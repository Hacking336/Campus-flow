import { Link } from "react-router-dom";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import type { DocStatus, OverviewResponse, PeItem, UniformStatus } from "../lib/types";
import {
  dateLabel,
  DOC_TYPE_LABELS,
  firstName,
  formatDate,
  greeting,
  STATUS_LABELS,
  timeLabel,
  todayLongLabel,
  uniformLabel,
} from "../lib/format";
import { EmptyState, PageError, StatCard, StatusTrack } from "../components/ui";
import { Icon } from "../components/Icon";
import { Spinner } from "../components/ui";

const PE_ITEM_LABELS: Record<PeItem, string> = { Pants: "P.E. Pants", Shirt: "P.E. Shirt" };

export function StudentHome() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<OverviewResponse>("/me/overview");

  if (loading && !data) return <Spinner label="Loading your pick-up summary" />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  const readyDocs = data.documents.filter((doc) => doc.status === "ready");
  const readyUniforms = data.uniforms.filter((uniform) => uniform.status === "ready");
  const readyTotal = readyDocs.length + readyUniforms.length;

  const inProgress = [
    ...data.documents
      .filter((doc) => ["requested", "processing"].includes(doc.status))
      .map((doc) => ({
        key: `doc-${doc.id}`,
        kind: "document" as const,
        icon: "file",
        title:
          (DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type) === doc.doc_type
            ? doc.doc_type
            : `${doc.doc_type} · ${DOC_TYPE_LABELS[doc.doc_type]}`,
        meta: doc.status === "processing" ? "Registrar is processing" : "Request received",
        date: doc.date_requested,
        status: doc.status as DocStatus,
        remarks: doc.remarks,
      })),
    ...data.uniforms
      .filter((uniform) => uniform.status === "ordered")
      .map((uniform) => ({
        key: `uniform-${uniform.id}`,
        kind: "uniform" as const,
        icon: "shirt",
        title: uniformLabel(uniform.category, uniform.item),
        meta:
          uniform.category === "PE"
            ? `Size ${uniform.size} · Property office is preparing it`
            : `Tailoring: ${STATUS_LABELS[uniform.tailoring_status ?? ""] ?? "In queue"}`,
        date: uniform.date_ordered,
        status: "ordered" as UniformStatus,
        remarks: uniform.remarks,
      })),
  ];

  const totalClaimed =
    data.documents.filter((doc) => doc.status === "claimed").length +
    data.uniforms.filter((uniform) => uniform.status === "claimed").length;

  // Sizes from the student's own P.E. orders, so the stock list can mark them.
  const myPeSizes = new Set(
    data.uniforms
      .filter((uniform) => uniform.category === "PE" && uniform.item && uniform.size)
      .map((uniform) => `${uniform.item}|${uniform.size}`)
  );

  return (
    <div className="page-stack">
      <section className="student-hero">
        <div className="student-hero-copy">
          <span className="eyebrow eyebrow-light">
            <Icon name="calendar" size={14} /> {todayLongLabel()}
          </span>
          <h2>
            {greeting()}, {firstName(user?.full_name ?? "student")}.
          </h2>
          <p>
            {readyTotal > 0
              ? `You have ${readyTotal} ${readyTotal === 1 ? "item" : "items"} ready for pick-up at the campus.`
              : "Nothing is waiting for pick-up right now. We will mark your records as soon as they are ready."}
          </p>
          <div className="student-hero-actions">
            <a href="#ready" className="btn btn-light">
              {readyTotal > 0 ? "See what is ready" : "View my records"}
              <Icon name="chevronRight" size={16} />
            </a>
            <Link to="/records" className="btn btn-hero-ghost">
              All records
            </Link>
          </div>
        </div>
        <div className="student-hero-badge" aria-hidden="true">
          <span className="hero-ring" />
          <span className="hero-count">{readyTotal}</span>
          <span className="hero-count-label">ready for pick-up</span>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Documents ready" value={readyDocs.length} icon="file" tone="emerald" hint="At the Registrar's Office" />
        <StatCard label="Uniforms ready" value={readyUniforms.length} icon="shirt" tone="violet" hint="At the Property Office" />
        <StatCard label="In progress" value={inProgress.length} icon="clock" tone="amber" hint="Still being prepared" />
        <StatCard label="Claimed" value={totalClaimed} icon="check" tone="sky" hint="Completed pick-ups" />
      </section>

      <div className="home-grid">
        <div className="home-main">
          <section className="card" id="ready">
            <div className="card-head">
              <div>
                <h2>Ready for pick-up</h2>
                <p>Bring your school ID when claiming these items.</p>
              </div>
              <span className="count-chip">{readyTotal}</span>
            </div>

            {readyTotal === 0 ? (
              <EmptyState
                icon="clock"
                title="No items ready yet"
                message="The staff will mark a document or uniform as ready once it is available at the office."
              />
            ) : (
              <div className="ready-list">
                {readyDocs.map((doc) => (
                  <article className="ready-item" key={`doc-${doc.id}`}>
                    <span className="ready-icon tone-emerald">
                      <Icon name="file" size={18} />
                    </span>
                    <div className="ready-copy">
                      <div className="ready-title-row">
                        <h3>{doc.doc_type}</h3>
                        <StatusTrack kind="document" status="ready" compact />
                      </div>
                      <p>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</p>
                      <div className="ready-meta">
                        <span>
                          <Icon name="calendar" size={13} /> Ready {dateLabel(doc.date_ready)}
                        </span>
                        <span>
                          <Icon name="idCard" size={13} /> Registrar's Office
                        </span>
                      </div>
                      {doc.remarks ? <div className="remark-note">{doc.remarks}</div> : null}
                    </div>
                  </article>
                ))}

                {readyUniforms.map((uniform) => (
                  <article className="ready-item" key={`uniform-${uniform.id}`}>
                    <span className="ready-icon tone-violet">
                      <Icon name="shirt" size={18} />
                    </span>
                    <div className="ready-copy">
                      <div className="ready-title-row">
                        <h3>{uniformLabel(uniform.category, uniform.item)}</h3>
                        <StatusTrack kind="uniform" status="ready" compact />
                      </div>
                      <p>
                        {uniform.category === "PE"
                          ? `Size ${uniform.size} · Ordered ${formatDate(uniform.date_ordered)} at ${timeLabel(uniform.time_ordered)}`
                          : `${uniform.category} uniform · Tailoring finished`}
                      </p>
                      <div className="ready-meta">
                        <span>
                          <Icon name="calendar" size={13} /> Ready {dateLabel(uniform.updated_at)}
                        </span>
                        <span>
                          <Icon name="box" size={13} /> Property Office
                        </span>
                      </div>
                      {uniform.remarks ? <div className="remark-note">{uniform.remarks}</div> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card" id="pe-stock">
            <div className="card-head">
              <div>
                <h2>P.E. stock</h2>
                <p>Pieces on hand at the Property Office, per size.</p>
              </div>
              <span className="mini-icon">
                <Icon name="box" size={16} />
              </span>
            </div>

            <div className="pe-stock-stack">
              {data.pe_stock.map((group) => (
                <div className="pe-stock-block" key={group.item}>
                  <div className="pe-stock-block-head">
                    <strong>{PE_ITEM_LABELS[group.item]}</strong>
                    <span>
                      {group.total_quantity} on hand · {group.size_range}
                    </span>
                  </div>
                  {group.sizes.filter((entry) => entry.quantity > 0).length === 0 ? (
                    <p className="muted small">No sizes on hand right now.</p>
                  ) : (
                    <ul className="size-qty-grid">
                      {group.sizes
                        .filter((entry) => entry.quantity > 0)
                        .map((entry) => {
                          const mine = myPeSizes.has(`${entry.item}|${entry.size}`);
                          const state = entry.low ? "is-low" : "";
                          return (
                            <li
                              className={`size-qty ${state} ${mine ? "is-mine" : ""}`}
                              key={`${entry.item}-${entry.size}`}
                              title={`${entry.item} size ${entry.size}: ${entry.quantity} left${mine ? " (your size)" : ""}`}
                            >
                              <span className="size-qty-size">{entry.size}</span>
                              <span className="size-qty-count">{entry.quantity}</span>
                              {mine ? <span className="size-qty-mine">yours</span> : null}
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <p className="muted small pe-stock-note">
              Only sizes currently on hand are listed. Numbers are updated as the Property Office records claims; sizes
              outlined in violet appear on your own uniform records, and amber means three pieces or fewer.
            </p>
          </section>
        </div>

        <div className="home-side">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>In progress</h2>
                <p>Requests still being prepared.</p>
              </div>
            </div>
            {inProgress.length === 0 ? (
              <EmptyState icon="sparkle" title="You're all caught up" message="No pending requests at the moment." />
            ) : (
              <ul className="progress-list">
                {inProgress.map((item) => (
                  <li key={item.key}>
                    <span className="progress-icon">
                      <Icon name={item.icon} size={16} />
                    </span>
                    <div className="progress-copy">
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                      {item.remarks ? <span className="progress-remark">{item.remarks}</span> : null}
                    </div>
                    <div className="progress-side">
                      <StatusTrack kind={item.kind} status={item.status} compact />
                      <small>{dateLabel(item.date)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card card-tinted">
            <div className="card-head">
              <div>
                <h2>Before you visit</h2>
                <p>Reminders from the campus offices.</p>
              </div>
              <span className="mini-icon">
                <Icon name="info" size={16} />
              </span>
            </div>
            <ul className="info-list">
              <li>
                <Icon name="idCard" size={16} />
                <span>{data.settings.pickup_note || "Bring your school ID when claiming."}</span>
              </li>
              <li>
                <Icon name="clock" size={16} />
                <span>{data.settings.office_hours || "Mon–Fri · 8:00 AM – 4:30 PM"}</span>
              </li>
              <li>
                <Icon name="shirt" size={16} />
                <span>
                  Tailoring is{" "}
                  <strong>{data.settings.tailoring_open === "1" ? "accepting new orders" : "currently closed"}</strong>.
                </span>
              </li>
              <li>
                <Icon name="box" size={16} />
                <span>
                  Check the <a href="#pe-stock">P.E. stock</a> numbers before going to the Property Office.
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
