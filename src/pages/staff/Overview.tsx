import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/api";
import type { ActivityEntry, DashboardResponse } from "../../lib/types";
import { dateLabel, uniformLabel } from "../../lib/format";
import { EmptyState, PageError, StatCard, StatusBadge, Toggle } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { Spinner } from "../../components/ui";

const ENTITY_META: Record<string, { icon: string; tone: string; to: string }> = {
  document: { icon: "file", tone: "emerald", to: "/staff/documents" },
  uniform: { icon: "shirt", tone: "violet", to: "/staff/uniforms" },
  student: { icon: "users", tone: "sky", to: "/staff/students" },
  settings: { icon: "settings", tone: "amber", to: "/staff/settings" },
  account: { icon: "idCard", tone: "rose", to: "/staff/accounts" },
  inventory: { icon: "box", tone: "amber", to: "/staff/inventory" },
};

function entityMeta(entry: ActivityEntry) {
  return ENTITY_META[entry.entity] ?? { icon: "sparkle", tone: "lilac", to: "/staff" };
}

export function StaffOverview() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi<DashboardResponse>("/dashboard");
  const [tailoringBusy, setTailoringBusy] = useState(false);
  const [desk, setDesk] = useState<"all" | "Registrar" | "Property">("all");

  const isCustodian = user?.role === "custodian";
  const isRegistrar = user?.role === "registrar";
  const canDocs = !isCustodian;
  const canUniforms = !isRegistrar;

  if (loading && !data) return <Spinner label="Loading the staff dashboard" />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  const tailoringOpen = data.settings.tailoring_open === "1";
  const lowStock = data.low_stock;
  const pendingTotal = data.totals.documents_pending + data.totals.uniforms_pending;

  async function toggleTailoring(open: boolean) {
    setTailoringBusy(true);
    try {
      await api("/settings/tailoring", { method: "PATCH", body: JSON.stringify({ open }) });
      notify(open ? "Tailoring is now open for new orders." : "Tailoring is now closed.");
      reload();
    } catch {
      notify("Could not update tailoring availability.", "error");
    } finally {
      setTailoringBusy(false);
    }
  }

  const queue = [
    ...(canDocs
      ? data.readyDocuments.map((doc) => ({
          key: `doc-${doc.id}`,
          kind: "document" as const,
          student_no: doc.student_no,
          full_name: doc.full_name ?? "",
          item: doc.doc_type,
          desk: "Registrar" as const,
          ready: doc.date_ready ?? doc.updated_at,
        }))
      : []),
    ...(canUniforms
      ? data.readyUniforms.map((uniform) => ({
          key: `uniform-${uniform.id}`,
          kind: "uniform" as const,
          student_no: uniform.student_no,
          full_name: uniform.full_name ?? "",
          item: uniformLabel(uniform.category, uniform.item),
          desk: "Property" as const,
          ready: uniform.updated_at,
        }))
      : []),
  ].sort((a, b) => String(b.ready).localeCompare(String(a.ready)));

  const deskTabs = [
    { key: "all" as const, label: "All", count: queue.length },
    { key: "Registrar" as const, label: "Registrar", count: queue.filter((row) => row.desk === "Registrar").length },
    { key: "Property" as const, label: "Property", count: queue.filter((row) => row.desk === "Property").length },
  ];
  const visibleQueue = queue.filter((row) => desk === "all" || row.desk === desk).slice(0, 6);

  return (
    <div className="dash-page">
      <section className="dash-stats" aria-label="Today at a glance">
        {canDocs ? (
          <StatCard
            label="Documents ready"
            value={data.totals.documents_ready}
            icon="file"
            tone="emerald"
            hint="for pick-up at the registrar"
            onClick={() => navigate("/staff/documents?status=ready")}
          />
        ) : null}
        {canUniforms ? (
          <StatCard
            label="Uniforms ready"
            value={data.totals.uniforms_ready}
            icon="shirt"
            tone="violet"
            hint="for pick-up at the property desk"
            onClick={() => navigate("/staff/uniforms?status=ready")}
          />
        ) : null}
        <StatCard
          label="In progress"
          value={pendingTotal}
          icon="clock"
          tone="amber"
          hint={
            canDocs && canUniforms
              ? `${data.totals.documents_pending} docs · ${data.totals.uniforms_pending} uniforms`
              : canDocs
                ? "Requests still being prepared"
                : "Orders still being prepared"
          }
        />
        <StatCard
          label="Claimed today"
          value={data.totals.claimed_today}
          icon="check"
          tone="sky"
          hint="completed pick-ups"
        />
      </section>

      <section className="dash-panel" aria-label="Ready for pick-up">
        <div className="dash-panel-head">
          {canDocs && canUniforms ? (
            <div className="segmented-tabs pickup-tabs" role="tablist" aria-label="Filter by desk">
              {deskTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={desk === tab.key}
                  className={desk === tab.key ? "is-active" : ""}
                  onClick={() => setDesk(tab.key)}
                >
                  {tab.label}
                  <span className="tab-count">{tab.count}</span>
                </button>
              ))}
            </div>
          ) : (
            <span className="dash-panel-caption">
              {canDocs ? "Registrar desk" : "Property desk"} · {queue.length} ready
            </span>
          )}
          <Link
            to={canDocs ? "/staff/documents?status=ready" : "/staff/uniforms?status=ready"}
            className="btn btn-primary panel-action"
          >
            <Icon name="arrowUpRight" size={16} />
            View all
          </Link>
        </div>

        {queue.length === 0 ? (
          <EmptyState icon="check" title="Nothing waiting" message="Ready documents and uniforms appear here." />
        ) : visibleQueue.length === 0 ? (
          <EmptyState icon="check" title="Nothing waiting here" message="No ready items at this desk right now." />
        ) : (
          <div className="pickup-grid">
            {visibleQueue.map((row) => (
              <article className="pickup-card" key={row.key}>
                <div className="pickup-top">
                  <span className={`pickup-icon tone-${row.kind === "document" ? "emerald" : "violet"}`}>
                    <Icon name={row.kind === "document" ? "file" : "shirt"} size={18} />
                  </span>
                  <div className="pickup-title">
                    <strong>{row.item}</strong>
                    <small>{row.desk} desk</small>
                  </div>
                  <StatusBadge status="ready" label="Ready" />
                </div>

                <div className="pickup-meter">
                  <div className="pickup-meter-head">
                    <span>Ready since</span>
                    <span>{dateLabel(row.ready)}</span>
                  </div>
                  <div className="pickup-bar">
                    <span style={{ width: row.kind === "document" ? "75%" : "68%" }} />
                  </div>
                </div>

                <div className="pickup-foot">
                  <div className="pickup-meta">
                    <span>Student</span>
                    <strong>{row.full_name || row.student_no}</strong>
                  </div>
                  <div className="pickup-meta">
                    <span>Student no.</span>
                    <strong>{row.student_no}</strong>
                  </div>
                  <Link
                    to={`/staff/students/${encodeURIComponent(row.student_no)}`}
                    className="pickup-arrow"
                    aria-label={`Open the record for ${row.full_name || row.student_no}`}
                  >
                    <Icon name="arrowUpRight" size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="dash-rail">
        {canUniforms ? (
          <section className="spotlight-card">
            <div className="spotlight-head">
              <span className="spotlight-chip">{tailoringOpen ? "Accepting orders" : "Paused"}</span>
              <Link to="/staff/inventory" className="spotlight-arrow" aria-label="Manage tailoring inventory">
                <Icon name="chevronRight" size={16} />
              </Link>
            </div>
            <h2>{tailoringOpen ? "Accepting tailoring orders today!" : "Tailoring is paused for now."}</h2>
            <p>
              {data.tailoring.sewing ?? 0} being sewn · {data.tailoring.queued ?? 0} in queue
            </p>
            <div className="spotlight-switch">
              <Toggle
                label={tailoringOpen ? "Open for orders" : "Closed for orders"}
                checked={tailoringOpen}
                onChange={toggleTailoring}
                disabled={tailoringBusy}
              />
            </div>
          </section>
        ) : (
          <section className="spotlight-card">
            <div className="spotlight-head">
              <span className="spotlight-chip">Registrar desk</span>
              <Link to="/staff/documents?status=ready" className="spotlight-arrow" aria-label="Open the registrar queue">
                <Icon name="chevronRight" size={16} />
              </Link>
            </div>
            <h2>{data.totals.documents_ready} documents ready to release.</h2>
            <p>{data.totals.documents_pending} requests still being prepared.</p>
          </section>
        )}

        {lowStock.length > 0 && canUniforms ? (
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Low PE stock</h2>
                <p>Three or fewer pieces left.</p>
              </div>
              <span className="mini-icon tone-amber">
                <Icon name="alert" size={16} />
              </span>
            </div>
            <div className="size-chip-row">
              {lowStock.map((item) => (
                <span key={`${item.item}-${item.size}`} className="size-chip is-low">
                  {item.item} {item.size}
                  <strong>{item.quantity}</strong>
                </span>
              ))}
            </div>
            <Link to="/staff/inventory" className="link-with-icon">
              Update stock <Icon name="chevronRight" size={15} />
            </Link>
          </section>
        ) : null}

        <section className="card insight-card">
          <div className="card-head">
            <div>
              <h2>Recent activity</h2>
              <p>Latest changes across the desks.</p>
            </div>
          </div>
          {data.recentActivity.length === 0 ? (
            <EmptyState icon="clock" title="No activity yet" message="Record updates will appear here." />
          ) : (
            <ul className="insight-list">
              {data.recentActivity.slice(0, 4).map((entry) => {
                const meta = entityMeta(entry);
                return (
                  <li key={entry.id} className="insight-row">
                    <span className={`insight-icon tone-${meta.tone}`}>
                      <Icon name={meta.icon} size={16} />
                    </span>
                    <div className="insight-copy">
                      <strong>{entry.action}</strong>
                      <p>{entry.detail || entry.actor}</p>
                      <Link to={meta.to} className="insight-link">
                        View details
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
