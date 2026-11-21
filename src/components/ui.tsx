import { useEffect } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { initials, STATUS_LABELS } from "../lib/format";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

const DOCUMENT_STEPS = [
  { key: "requested", label: "Requested" },
  { key: "processing", label: "Processing" },
  { key: "ready", label: "Ready" },
  { key: "claimed", label: "Claimed" },
] as const;

const UNIFORM_STEPS = [
  { key: "ordered", label: "Ordered" },
  { key: "ready", label: "Ready" },
  { key: "claimed", label: "Claimed" },
] as const;

/**
 * A visual stage strip: which steps are finished, where the record is now,
 * and what still has to happen before the student can pick the item up.
 */
export function StatusTrack({
  kind,
  status,
  compact = false,
}: {
  kind: "document" | "uniform";
  status: string;
  compact?: boolean;
}) {
  if (status === "cancelled") {
    return (
      <span className="status-cancelled">
        <span className="status-dot" />
        Cancelled
      </span>
    );
  }
  const steps = kind === "document" ? DOCUMENT_STEPS : UNIFORM_STEPS;
  const current = steps.findIndex((step) => step.key === status);
  return (
    <ol
      className={`status-track status-track-${kind} ${compact ? "is-compact" : ""}`}
      aria-label={`Progress: ${STATUS_LABELS[status] ?? status}`}
      title={`${steps.map((step) => step.label).join(" → ")} · now: ${STATUS_LABELS[status] ?? status}`}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const state = done ? "is-done" : index === current ? "is-current" : "is-todo";
        return (
          <li key={step.key} className={state} aria-current={index === current ? "step" : undefined}>
            <span className="status-dot">{done ? <Icon name="check" size={9} /> : null}</span>
            {compact && index !== current ? null : <span className="status-label">{step.label}</span>}
          </li>
        );
      })}
    </ol>
  );
}

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 40, className = "" }: AvatarProps) {
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {src ? <img src={src} alt={name ? `${name}'s profile photo` : "Profile photo"} /> : initials(name)}
    </span>
  );
}

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ title, subtitle, onClose, children, footer, wide }: ModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: string;
  tone?: "indigo" | "emerald" | "amber" | "sky" | "rose" | "violet";
  onClick?: () => void;
}

export function StatCard({ label, value, hint, icon, tone = "indigo", onClick }: StatCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp className={`stat-card tone-${tone} ${onClick ? "stat-clickable" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <span className="stat-top">
        <span className="stat-icon">
          <Icon name={icon} size={16} />
        </span>
        <span className="stat-label">{label}</span>
        {onClick ? (
          <span className="stat-more" aria-hidden="true">
            <Icon name="arrowUpRight" size={15} />
          </span>
        ) : null}
      </span>
      <span className="stat-body">
        <strong className="stat-value">{value}</strong>
        {hint ? <span className="stat-hint">{hint}</span> : null}
      </span>
    </Comp>
  );
}

export function EmptyState({
  icon = "sparkle",
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={24} />
      </span>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`toggle-row ${disabled ? "is-disabled" : ""}`}>
      <div>
        <span className="toggle-label">{label}</span>
        {description ? <span className="toggle-description">{description}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle ${checked ? "is-on" : ""}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="spinner-row" role="status">
      <span className="spinner" />
      <span>{label}…</span>
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-error" role="alert">
      <Icon name="alert" size={18} />
      <div>
        <strong>Something went wrong</strong>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
