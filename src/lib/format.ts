import type { Role } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parse(value?: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDate(value?: string | null, fallback = "—"): string {
  const date = parse(value);
  if (!date) return fallback;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortDate(value?: string | null, fallback = "—"): string {
  const date = parse(value);
  if (!date) return fallback;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function dateLabel(value?: string | null, fallback = "—"): string {
  const date = parse(value);
  if (!date) return fallback;
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(value);
}

export function formatDateTime(value?: string | null): string {
  const date = parse(value);
  if (!date) return "—";
  const time = date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  return `${formatDate(value)} · ${time}`;
}

export function timeLabel(value?: string | null): string {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowInputTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function todayLongLabel(): string {
  return new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  COR: "Certificate of Registration",
  COG: "Certificate of Grades",
  TOR: "Transcript of Records",
  Authentication: "Document authentication",
  "Good Moral": "Certificate of Good Moral",
  "Certificate of Enrollment": "Certificate of Enrollment",
  "Certificate of Completion": "Certificate of Completion",
  Other: "Other document",
};

export const DOC_TYPES = [
  "COR",
  "COG",
  "TOR",
  "Authentication",
  "Good Moral",
  "Certificate of Enrollment",
  "Certificate of Completion",
  "Other",
];

export const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  processing: "Processing",
  ready: "Ready for pick-up",
  claimed: "Claimed",
  cancelled: "Cancelled",
  ordered: "Ordered",
  queued: "In queue",
  sewing: "Being sewn",
  finished: "Sewing finished",
};

export function roleLabel(role: Role | string): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "registrar":
      return "Registrar staff";
    case "custodian":
      return "Property custodian";
    case "student":
      return "Student";
    default:
      return role;
  }
}

export function uniformLabel(category: string, item?: string | null): string {
  if (category === "PE") return `PE ${item || "Uniform"}`;
  if (category === "Nursing") return "Nursing Uniform";
  return "General Uniform";
}

export function categoryTone(category: string): string {
  if (category === "PE") return "tone-sky";
  if (category === "Nursing") return "tone-rose";
  return "tone-violet";
}
