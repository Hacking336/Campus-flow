import { db } from "./db.js";
import { hashToken } from "./security.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function assert(condition, status, message) {
  if (!condition) throw new ApiError(status, message);
}

export function text(value, max = 500) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

export function dateValue(value, field = "date") {
  const s = text(value, 10);
  if (!s) return null;
  assert(/^\d{4}-\d{2}-\d{2}$/.test(s), 400, `${field} must use the YYYY-MM-DD format.`);
  return s;
}

export function timeValue(value, field = "time") {
  const s = text(value, 5);
  if (!s) return null;
  assert(/^\d{2}:\d{2}$/.test(s), 400, `${field} must use the HH:MM format.`);
  return s;
}

export function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    full_name: row.full_name,
    email: row.email ?? null,
    avatar: row.avatar ?? null,
    student_no: row.student_no ?? null,
  };
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new ApiError(401, "Please sign in to continue.");
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.full_name, u.email, u.avatar, u.student_no,
              s.expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`
    )
    .get(hashToken(token));
  if (!row) throw new ApiError(401, "Your session has expired. Please sign in again.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  req.user = row;
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw new ApiError(401, "Please sign in to continue.");
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Your account does not have access to this action.");
    }
    next();
  };
}

export const requireStaff = requireRole("registrar", "custodian", "admin");

export function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowTimeString() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function actorName(user) {
  return user.full_name;
}

export function isValidRole(role) {
  return ["student", "registrar", "custodian", "admin"].includes(role);
}
