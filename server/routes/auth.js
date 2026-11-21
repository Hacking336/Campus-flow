import { Router } from "express";
import { db, getSetting, logActivity } from "../db.js";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "../security.js";
import {
  ApiError,
  assert,
  publicUser,
  requireAuth,
  text,
} from "../util.js";

const router = Router();
const SESSION_DAYS = 7;
const attempts = new Map();

function userRowByUsername(identifier) {
  return db
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(identifier);
}

function createSession(userId) {
  const token = newSessionToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(hashToken(token), userId, now.toISOString(), expires.toISOString());
  return token;
}

function loginPayload(user, token) {
  const student = user.student_no
    ? db.prepare("SELECT * FROM students WHERE student_no = ?").get(user.student_no)
    : null;
  return { token, user: publicUser(user), student: student ?? null };
}

router.post("/login", (req, res) => {
  const identifier = text(req.body?.identifier, 80);
  const password = String(req.body?.password ?? "");
  assert(identifier, 400, "Enter your student number or staff username.");
  assert(password, 400, "Enter your password.");

  const key = `${identifier.toLowerCase()}|${req.ip}`;
  const record = attempts.get(key);
  if (record && record.count >= 8 && Date.now() - record.first < 10 * 60 * 1000) {
    throw new ApiError(429, "Too many sign-in attempts. Please wait a few minutes and try again.");
  }

  const user = userRowByUsername(identifier);
  if (!user || !verifyPassword(password, user.password_hash)) {
    const next = record && Date.now() - record.first < 10 * 60 * 1000
      ? { ...record, count: record.count + 1 }
      : { count: 1, first: Date.now() };
    attempts.set(key, next);
    throw new ApiError(401, "Incorrect student number/username or password.");
  }

  attempts.delete(key);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  const token = createSession(user.id);
  res.json(loginPayload(user, token));
});

router.post("/register", (req, res) => {
  const enabled = getSetting("allow_student_registration", "1") === "1";
  assert(enabled, 403, "Student self-registration is currently closed. Please ask the admin office to create your account.");

  const studentNo = text(req.body?.student_no, 40);
  const password = String(req.body?.password ?? "");
  assert(studentNo, 400, "Enter your student number.");
  assert(password.length >= 6, 400, "Password must be at least 6 characters.");

  const student = db.prepare("SELECT * FROM students WHERE student_no = ? COLLATE NOCASE").get(studentNo);
  assert(student, 404, "That student number is not on the enrolled students list. Please visit the Registrar's Office.");
  const existing = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(student.student_no);
  assert(!existing, 409, "An account already exists for this student number. Please sign in or ask the admin to reset your password.");

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at)
       VALUES (?, 'student', ?, ?, ?, NULL, ?, ?, ?)`
    )
    .run(student.student_no, student.full_name, student.email, hashPassword(password), student.student_no, now, now);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  logActivity({
    actor: student.full_name,
    action: "registered",
    entity: "account",
    entityId: student.student_no,
    detail: "Student created an account via self-registration",
  });
  const token = createSession(user.id);
  res.status(201).json(loginPayload(user, token));
});

router.use(requireAuth);

router.get("/me", (req, res) => {
  const student = req.user.student_no
    ? db.prepare("SELECT * FROM students WHERE student_no = ?").get(req.user.student_no)
    : null;
  res.json({ user: publicUser(req.user), student: student ?? null });
});

router.post("/logout", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  res.json({ ok: true });
});

router.patch("/profile", (req, res) => {
  const fullName = text(req.body?.full_name, 80);
  assert(fullName, 400, "Your name cannot be empty.");
  const email = text(req.body?.email, 120);
  if (email) assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, "Enter a valid email address.");

  let avatar = req.user.avatar;
  if (req.body?.avatar === null) avatar = null;
  else if (typeof req.body?.avatar === "string" && req.body.avatar.length) {
    assert(
      /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(req.body.avatar),
      400,
      "Profile photo must be a PNG, JPG, or WebP image."
    );
    assert(req.body.avatar.length < 1_400_000, 413, "Profile photo is too large. Please choose a smaller image.");
    avatar = req.body.avatar;
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE users SET full_name = ?, email = ?, avatar = ?, updated_at = ? WHERE id = ?"
  ).run(fullName, email, avatar, now, req.user.id);
  if (req.user.student_no) {
    db.prepare("UPDATE students SET full_name = ?, email = ?, updated_at = ? WHERE student_no = ?").run(
      fullName,
      email,
      now,
      req.user.student_no
    );
  }
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const student = updated.student_no
    ? db.prepare("SELECT * FROM students WHERE student_no = ?").get(updated.student_no)
    : null;
  logActivity({ actor: fullName, action: "updated profile", entity: "user", entityId: req.user.id });
  res.json({ user: publicUser(updated), student: student ?? null });
});

router.post("/change-password", (req, res) => {
  const current = String(req.body?.current_password ?? "");
  const next = String(req.body?.new_password ?? "");
  assert(current, 400, "Enter your current password.");
  assert(next.length >= 6, 400, "New password must be at least 6 characters.");
  assert(next !== current, 400, "New password must be different from your current password.");

  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
  assert(row && verifyPassword(current, row.password_hash), 400, "Your current password is incorrect.");

  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
    hashPassword(next),
    new Date().toISOString(),
    req.user.id
  );
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(req.user.id);
  const token = createSession(req.user.id);
  logActivity({ actor: req.user.full_name, action: "changed password", entity: "user", entityId: req.user.id });
  res.json({ ok: true, token });
});

export default router;
