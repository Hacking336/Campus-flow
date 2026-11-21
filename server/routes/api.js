import { Router } from "express";
import { db, getSetting, getSettings, logActivity, setSetting } from "../db.js";
import { hashPassword } from "../security.js";
import {
  actorName,
  assert,
  dateValue,
  isValidRole,
  nowTimeString,
  requireAuth,
  requireRole,
  requireStaff,
  text,
  timeValue,
  todayString,
} from "../util.js";

const router = Router();

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

const DOC_STATUSES = ["requested", "processing", "ready", "claimed", "cancelled"];
const UNIFORM_STATUSES = ["ordered", "ready", "claimed", "cancelled"];
const CATEGORIES = ["PE", "General", "Nursing"];
const TAILORING_STATUSES = ["queued", "sewing", "finished"];

/* P.E. Pants and P.E. Shirt are counted separately, each with its own sizes. */
const PE_ITEM_SIZES = {
  Pants: ["S", "M", "L", "XL", "2XL", "3XL"],
  Shirt: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
};
const PE_ITEM_NAMES = ["Pants", "Shirt"];

function sizeRangeLabel(item) {
  const sizes = PE_ITEM_SIZES[item];
  return `${sizes[0]}–${sizes[sizes.length - 1]}`;
}

function stockRow(item, size) {
  return db.prepare("SELECT * FROM pe_inventory WHERE item = ? AND size = ?").get(item, size);
}

function inventoryGroups() {
  return PE_ITEM_NAMES.map((item) => {
    const rows = db.prepare("SELECT * FROM pe_inventory WHERE item = ?").all(item);
    const known = PE_ITEM_SIZES[item];
    const sizes = known.map((size) => {
      const row = rows.find((entry) => entry.size === size);
      return { item, size, quantity: row ? row.quantity : 0 };
    });
    for (const row of rows) {
      if (!known.includes(row.size)) sizes.push({ item, size: row.size, quantity: row.quantity });
    }
    return {
      item,
      size_range: sizeRangeLabel(item),
      sizes,
      total: sizes.reduce((sum, entry) => sum + entry.quantity, 0),
    };
  });
}

function lowStockRows() {
  return inventoryGroups().flatMap((group) => group.sizes.filter((entry) => entry.quantity <= 3));
}

/* Registrar staff work the document desk and the Property Office works
   uniforms. Each staff payload is scoped to the caller's desk; admin sees both. */
function deskScope(role) {
  if (role === "registrar") return "documents";
  if (role === "custodian") return "uniforms";
  return "all";
}

const STUDENT_COLUMNS = `
  s.*,
  (SELECT COUNT(*) FROM documents d WHERE d.student_no = s.student_no AND d.status = 'ready') AS ready_documents,
  (SELECT COUNT(*) FROM uniform_orders u WHERE u.student_no = s.student_no AND u.status = 'ready') AS ready_uniforms,
  (SELECT COUNT(*) FROM documents d WHERE d.student_no = s.student_no AND d.status IN ('requested', 'processing')) AS pending_documents,
  (SELECT COUNT(*) FROM uniform_orders u WHERE u.student_no = s.student_no AND u.status = 'ordered') AS pending_uniforms,
  EXISTS(SELECT 1 FROM users u WHERE u.student_no = s.student_no) AS has_account,
  (SELECT u.avatar FROM users u WHERE u.student_no = s.student_no LIMIT 1) AS avatar
`;

function findStudent(studentNo) {
  return db.prepare("SELECT * FROM students WHERE student_no = ? COLLATE NOCASE").get(studentNo);
}

function requireStudent(studentNo, user) {
  const student = findStudent(studentNo);
  assert(student, 404, "Student record not found.");
  if (user.role === "student") {
    assert(student.student_no === user.student_no, 403, "You can only view your own records.");
  }
  return student;
}

function getDocuments(studentNo) {
  return db
    .prepare(
      `SELECT d.*, s.full_name, s.program
         FROM documents d
         JOIN students s ON s.student_no = d.student_no
        WHERE d.student_no = ?
        ORDER BY
          CASE d.status WHEN 'ready' THEN 0 WHEN 'processing' THEN 1 WHEN 'requested' THEN 2 ELSE 3 END,
          COALESCE(d.date_requested, '') DESC, d.id DESC`
    )
    .all(studentNo);
}

function getUniforms(studentNo) {
  return db
    .prepare(
      `SELECT u.*, s.full_name, s.program
         FROM uniform_orders u
         JOIN students s ON s.student_no = u.student_no
        WHERE u.student_no = ?
        ORDER BY
          CASE u.status WHEN 'ready' THEN 0 WHEN 'ordered' THEN 1 ELSE 2 END,
          u.date_ordered DESC, u.id DESC`
    )
    .all(studentNo);
}

function accountSummary(studentNo) {
  const user = db
    .prepare("SELECT username, avatar, created_at FROM users WHERE student_no = ?")
    .get(studentNo);
  return user ? { has_account: 1, ...user } : { has_account: 0 };
}

function settingsFor(role) {
  const all = getSettings();
  if (role === "student") {
    const allowed = ["school_year", "semester", "tailoring_open", "pickup_note", "office_hours"];
    return Object.fromEntries(allowed.filter((k) => all[k] !== undefined).map((k) => [k, all[k]]));
  }
  if (role !== "admin") delete all.default_student_password;
  return all;
}

/* ------------------------------------------------------------------ */
/* Student overview (student's own home)                               */
/* ------------------------------------------------------------------ */

/* Students see the same per-size counts the Property Office records, so they
   can tell at a glance whether their size is worth ordering right now. */
function studentStockView() {
  return inventoryGroups().map((group) => ({
    item: group.item,
    size_range: group.size_range,
    total_quantity: group.sizes.reduce((sum, entry) => sum + entry.quantity, 0),
    available_count: group.sizes.filter((entry) => entry.quantity > 0).length,
    sizes: group.sizes.map((entry) => ({
      item: entry.item,
      size: entry.size,
      quantity: entry.quantity,
      available: entry.quantity > 0,
      low: entry.quantity > 0 && entry.quantity <= 3,
    })),
  }));
}

router.use(requireAuth);

router.get("/me/overview", (req, res) => {
  assert(req.user.role === "student" && req.user.student_no, 403, "This view is for student accounts.");
  const student = findStudent(req.user.student_no);
  assert(student, 404, "Student record not found.");
  const documents = getDocuments(student.student_no);
  const uniforms = getUniforms(student.student_no);
  const readyDocuments = documents.filter((d) => d.status === "ready");
  const readyUniforms = uniforms.filter((u) => u.status === "ready");
  res.json({
    student,
    documents,
    uniforms,
    account: accountSummary(student.student_no),
    summary: {
      ready_documents: readyDocuments.length,
      ready_uniforms: readyUniforms.length,
      ready_total: readyDocuments.length + readyUniforms.length,
      pending_documents: documents.filter((d) => ["requested", "processing"].includes(d.status)).length,
      pending_uniforms: uniforms.filter((u) => u.status === "ordered").length,
      tailoring: uniforms.filter((u) => u.category !== "PE" && u.status === "ordered").map((u) => ({
        id: u.id,
        category: u.category,
        tailoring_status: u.tailoring_status,
      })),
    },
    pe_stock: studentStockView(),
    settings: settingsFor("student"),
  });
});

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

router.get("/students", requireStaff, (req, res) => {
  const q = text(req.query.q, 80);
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const params = [];
  let where = "";
  if (q) {
    where = "WHERE s.student_no LIKE ? OR s.full_name LIKE ? OR s.program LIKE ?";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const rows = db
    .prepare(
      `SELECT ${STUDENT_COLUMNS}
         FROM students s
         ${where}
        ORDER BY s.full_name
        LIMIT ?`
    )
    .all(...params, limit);
  const scope = deskScope(req.user.role);
  const scoped = rows.map((row) =>
    scope === "documents"
      ? { ...row, ready_uniforms: 0, pending_uniforms: 0 }
      : scope === "uniforms"
        ? { ...row, ready_documents: 0, pending_documents: 0 }
        : row
  );
  res.json({ students: scoped, total: scoped.length });
});

router.get("/students/:studentNo", (req, res) => {
  const student = requireStudent(req.params.studentNo, req.user);
  // A student always sees their own mixed record; staff only see their desk.
  const scope = req.user.role === "student" ? "all" : deskScope(req.user.role);
  res.json({
    student,
    documents: scope === "uniforms" ? [] : getDocuments(student.student_no),
    uniforms: scope === "documents" ? [] : getUniforms(student.student_no),
    account: accountSummary(student.student_no),
    can_manage: req.user.role !== "student",
    scope,
  });
});

// The Property Office files a roster entry for a walk-in student who is only
// ordering a uniform; logins stay with the registrar.
router.post("/students", requireRole("registrar", "custodian", "admin"), (req, res) => {
  const studentNo = text(req.body?.student_no, 40);
  const fullName = text(req.body?.full_name, 80);
  assert(studentNo, 400, "Student number is required.");
  assert(/^[A-Za-z0-9-]+$/.test(studentNo), 400, "Student number may only contain letters, numbers and dashes.");
  assert(fullName, 400, "Full name is required.");
  assert(!findStudent(studentNo), 409, "A student with that student number already exists.");

  const now = new Date().toISOString();
  const email = text(req.body?.email, 120);
  const info = db
    .prepare(
      `INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      studentNo,
      fullName,
      text(req.body?.program, 80),
      text(req.body?.year_level, 20),
      text(req.body?.section, 20),
      email,
      now,
      now
    );

  let account = null;
  if (req.body?.create_account && req.user.role !== "custodian") {
    const exists = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(studentNo);
    assert(!exists, 409, "An account with that username already exists.");
    const password = String(req.body?.password || getSetting("default_student_password", "Campus123"));
    assert(password.length >= 6, 400, "Default password must be at least 6 characters.");
    db.prepare(
      `INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at)
       VALUES (?, 'student', ?, ?, ?, NULL, ?, ?, ?)`
    ).run(studentNo, fullName, email, hashPassword(password), studentNo, now, now);
    account = { username: studentNo, has_account: 1 };
  }

  logActivity({
    actor: actorName(req.user),
    action: "added student",
    entity: "student",
    entityId: studentNo,
    detail: fullName,
  });
  const student = db.prepare("SELECT * FROM students WHERE student_no = ?").get(studentNo);
  res.status(201).json({ student, account, id: Number(info.lastInsertRowid) });
});

router.patch("/students/:studentNo", requireRole("registrar", "admin"), (req, res) => {
  const student = requireStudent(req.params.studentNo, req.user);
  const fullName = req.body?.full_name !== undefined ? text(req.body.full_name, 80) : student.full_name;
  assert(fullName, 400, "Full name cannot be empty.");
  const email = req.body?.email !== undefined ? text(req.body.email, 120) : student.email;
  if (email) assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, "Enter a valid email address.");

  // The student number can be corrected after enrollment (typos, or a number
  // assigned by the registrar later), so it is editable rather than fixed.
  const studentNo = req.body?.student_no !== undefined ? text(req.body.student_no, 40) : student.student_no;
  assert(studentNo, 400, "Student number cannot be empty.");
  assert(
    /^[A-Za-z0-9-]+$/.test(studentNo),
    400,
    "Student number may only contain letters, numbers and dashes."
  );
  const renaming = studentNo !== student.student_no;
  if (renaming) {
    assert(!findStudent(studentNo), 409, "A student with that student number already exists.");
    const usernameTaken = db
      .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE AND (student_no IS NULL OR student_no <> ?)")
      .get(studentNo, student.student_no);
    assert(!usernameTaken, 409, "Another account already uses that student number as a username.");
  }

  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    if (renaming) {
      // Child rows reference students(student_no), so defer the foreign-key
      // checks to COMMIT while every reference is moved to the new number.
      db.exec("PRAGMA defer_foreign_keys = ON");
      db.prepare(
        `UPDATE users
            SET student_no = ?, updated_at = ?,
                username = CASE WHEN role = 'student' AND username = ? COLLATE NOCASE THEN ? ELSE username END
          WHERE student_no = ?`
      ).run(studentNo, now, student.student_no, studentNo, student.student_no);
      db.prepare("UPDATE documents SET student_no = ? WHERE student_no = ?").run(studentNo, student.student_no);
      db.prepare("UPDATE uniform_orders SET student_no = ? WHERE student_no = ?").run(studentNo, student.student_no);
    }
    db.prepare(
      `UPDATE students SET student_no = ?, full_name = ?, program = ?, year_level = ?, section = ?, email = ?, updated_at = ?
        WHERE student_no = ?`
    ).run(
      studentNo,
      fullName,
      req.body?.program !== undefined ? text(req.body.program, 80) : student.program,
      req.body?.year_level !== undefined ? text(req.body.year_level, 20) : student.year_level,
      req.body?.section !== undefined ? text(req.body.section, 20) : student.section,
      email,
      now,
      student.student_no
    );
    db.prepare(
      "UPDATE users SET full_name = ?, email = ?, updated_at = ? WHERE student_no = ?"
    ).run(fullName, email, now, studentNo);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  logActivity({
    actor: actorName(req.user),
    action: renaming ? "changed student number" : "updated student",
    entity: "student",
    entityId: studentNo,
    detail: renaming ? `${student.student_no} → ${studentNo} · ${fullName}` : fullName,
  });
  res.json({ student: findStudent(studentNo) });
});

router.delete("/students/:studentNo", requireRole("registrar", "custodian", "admin"), (req, res) => {
  const student = requireStudent(req.params.studentNo, req.user);
  // Documents, uniform orders and the student login (plus its sessions) go with
  // the student through ON DELETE CASCADE, so one statement removes the record.
  const counts = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM documents WHERE student_no = ?) AS documents,
              (SELECT COUNT(*) FROM uniform_orders WHERE student_no = ?) AS uniforms,
              (SELECT COUNT(*) FROM users WHERE student_no = ?) AS logins`
    )
    .get(student.student_no, student.student_no, student.student_no);
  db.prepare("DELETE FROM students WHERE student_no = ?").run(student.student_no);
  logActivity({
    actor: actorName(req.user),
    action: "deleted student",
    entity: "student",
    entityId: student.student_no,
    detail: `${student.full_name} · ${counts.documents} document(s), ${counts.uniforms} uniform order(s), ${counts.logins} login(s)`,
  });
  res.json({
    ok: true,
    removed: {
      student_no: student.student_no,
      documents: Number(counts.documents),
      uniforms: Number(counts.uniforms),
      logins: Number(counts.logins),
    },
  });
});

router.post("/students/:studentNo/account", requireRole("registrar", "admin"), (req, res) => {
  const student = requireStudent(req.params.studentNo, req.user);
  const password = String(req.body?.password || getSetting("default_student_password", "Campus123"));
  assert(password.length >= 6, 400, "Password must be at least 6 characters.");
  const existing = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(student.student_no);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      hashPassword(password),
      now,
      existing.id
    );
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  } else {
    db.prepare(
      `INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at)
       VALUES (?, 'student', ?, ?, ?, NULL, ?, ?, ?)`
    ).run(student.student_no, student.full_name, student.email, hashPassword(password), student.student_no, now, now);
  }
  logActivity({
    actor: actorName(req.user),
    action: existing ? "reset student password" : "created student account",
    entity: "account",
    entityId: student.student_no,
    detail: student.full_name,
  });
  res.json({ ok: true, has_account: 1, username: student.student_no, was_reset: Boolean(existing) });
});

router.post("/students/import", requireRole("registrar", "admin"), (req, res) => {
  const csv = String(req.body?.csv ?? "");
  assert(csv.trim(), 400, "Paste CSV rows or choose a CSV file first.");
  const createAccounts = Boolean(req.body?.create_accounts);
  const defaultPassword = String(req.body?.default_password || getSetting("default_student_password", "Campus123"));
  assert(defaultPassword.length >= 6, 400, "Default password must be at least 6 characters.");

  const rows = parseCsv(csv);
  assert(rows.length > 0, 400, "No data rows were found.");
  assert(rows.length <= 1500, 400, "Please import at most 1,500 students at a time.");

  const errors = [];
  let created = 0;
  let updated = 0;
  let accountsCreated = 0;
  const now = new Date().toISOString();

  db.exec("BEGIN");
  try {
    for (const [index, row] of rows.entries()) {
      const line = index + 2;
      const studentNo = text(row.student_no, 40);
      const fullName = text(row.full_name, 80);
      if (!studentNo || !fullName) {
        errors.push(`Line ${line}: student_no and full_name are required.`);
        continue;
      }
      const existing = findStudent(studentNo);
      if (existing) {
        db.prepare(
          `UPDATE students SET full_name = ?, program = COALESCE(?, program), year_level = COALESCE(?, year_level),
             section = COALESCE(?, section), email = COALESCE(?, email), updated_at = ?
           WHERE student_no = ?`
        ).run(
          fullName,
          text(row.program, 80),
          text(row.year_level, 20),
          text(row.section, 20),
          text(row.email, 120),
          now,
          existing.student_no
        );
        db.prepare("UPDATE users SET full_name = ?, updated_at = ? WHERE student_no = ?").run(
          fullName,
          now,
          existing.student_no
        );
        updated += 1;
      } else {
        db.prepare(
          `INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          studentNo,
          fullName,
          text(row.program, 80),
          text(row.year_level, 20),
          text(row.section, 20),
          text(row.email, 120),
          now,
          now
        );
        created += 1;
      }

      if (createAccounts) {
        const hasUser = db
          .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
          .get(studentNo);
        if (!hasUser) {
          const student = findStudent(studentNo);
          db.prepare(
            `INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at)
             VALUES (?, 'student', ?, ?, ?, NULL, ?, ?, ?)`
          ).run(
            student.student_no,
            student.full_name,
            student.email,
            hashPassword(defaultPassword),
            student.student_no,
            now,
            now
          );
          accountsCreated += 1;
        }
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  logActivity({
    actor: actorName(req.user),
    action: "imported students",
    entity: "student",
    detail: `${created} added, ${updated} updated, ${accountsCreated} accounts created`,
  });
  res.status(201).json({ created, updated, accounts_created: accountsCreated, errors, default_password: createAccounts ? defaultPassword : null });
});

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

router.get("/documents", requireRole("registrar", "admin"), (req, res) => {
  const q = text(req.query.q, 80);
  const status = text(req.query.status, 20);
  const studentNo = text(req.query.student_no, 40);
  const type = text(req.query.type, 60);
  const limit = Math.min(Number(req.query.limit) || 200, 500);

  const where = [];
  const params = [];
  if (q) {
    where.push("(d.student_no LIKE ? OR s.full_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status && DOC_STATUSES.includes(status)) {
    where.push("d.status = ?");
    params.push(status);
  }
  if (studentNo) {
    where.push("d.student_no = ?");
    params.push(studentNo);
  }
  if (type) {
    where.push("d.doc_type = ?");
    params.push(type);
  }

  const rows = db
    .prepare(
      `SELECT d.*, s.full_name, s.program
         FROM documents d
         JOIN students s ON s.student_no = d.student_no
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY
          CASE d.status WHEN 'ready' THEN 0 WHEN 'processing' THEN 1 WHEN 'requested' THEN 2 ELSE 3 END,
          COALESCE(d.date_requested, '') DESC, d.id DESC
        LIMIT ?`
    )
    .all(...params, limit);
  res.json({ documents: rows });
});

function readDocumentBody(body, current = {}) {
  const docType = body.doc_type !== undefined ? text(body.doc_type, 60) : current.doc_type;
  assert(docType, 400, "Choose a document type.");
  assert(DOC_TYPES.includes(docType), 400, "Choose a valid document type.");

  const status = body.status !== undefined ? text(body.status, 20) : current.status || "requested";
  assert(DOC_STATUSES.includes(status), 400, "Choose a valid document status.");
  assert(
    !(current.status === "claimed" && status === "cancelled"),
    409,
    "A claimed document cannot be cancelled — the student already picked it up."
  );

  let dateRequested = body.date_requested !== undefined ? dateValue(body.date_requested, "Date requested") : current.date_requested ?? null;
  let dateReady = body.date_ready !== undefined ? dateValue(body.date_ready, "Date ready") : current.date_ready ?? null;

  if (["ready", "claimed"].includes(status) && !dateReady) dateReady = todayString();
  if (status === "requested" && !dateRequested) dateRequested = todayString();

  return { docType, status, dateRequested, dateReady, remarks: body.remarks !== undefined ? text(body.remarks, 500) : current.remarks ?? null };
}

router.patch("/documents/:id", requireRole("registrar", "admin"), (req, res) => {
  const current = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  assert(current, 404, "Document record not found.");
  const data = readDocumentBody(req.body, current);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE documents
        SET doc_type = ?, status = ?, date_requested = ?, date_ready = ?, remarks = ?, updated_by = ?, updated_at = ?
      WHERE id = ?`
  ).run(
    data.docType,
    data.status,
    data.dateRequested,
    data.dateReady,
    data.remarks,
    actorName(req.user),
    now,
    current.id
  );
  if (current.status !== data.status) {
    logActivity({
      actor: actorName(req.user),
      action: `marked document ${data.status}`,
      entity: "document",
      entityId: current.id,
      detail: `${current.student_no} · ${data.docType}`,
    });
  }
  res.json({ document: db.prepare("SELECT * FROM documents WHERE id = ?").get(current.id) });
});

// Cancelling is its own action so registrar staff can withdraw a request without
// editing the record (and without being able to touch a claimed one).
router.post("/documents/:id/cancel", requireRole("registrar", "admin"), (req, res) => {
  const current = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  assert(current, 404, "Document record not found.");
  assert(current.status !== "claimed", 409, "A claimed document cannot be cancelled — the student already picked it up.");
  assert(current.status !== "cancelled", 409, "This document request is already cancelled.");
  const now = new Date().toISOString();
  db.prepare("UPDATE documents SET status = 'cancelled', updated_by = ?, updated_at = ? WHERE id = ?").run(
    actorName(req.user),
    now,
    current.id
  );
  logActivity({
    actor: actorName(req.user),
    action: "cancelled document record",
    entity: "document",
    entityId: current.id,
    detail: `${current.student_no} · ${current.doc_type}`,
  });
  res.json({ document: db.prepare("SELECT * FROM documents WHERE id = ?").get(current.id) });
});

/* ------------------------------------------------------------------ */
/* Uniform orders                                                      */
/* ------------------------------------------------------------------ */

router.get("/uniforms", requireRole("custodian", "admin"), (req, res) => {
  const q = text(req.query.q, 80);
  const status = text(req.query.status, 20);
  const category = text(req.query.category, 20);
  const studentNo = text(req.query.student_no, 40);
  const limit = Math.min(Number(req.query.limit) || 200, 500);

  const where = [];
  const params = [];
  if (q) {
    where.push("(u.student_no LIKE ? OR s.full_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status && UNIFORM_STATUSES.includes(status)) {
    where.push("u.status = ?");
    params.push(status);
  }
  if (category && CATEGORIES.includes(category)) {
    where.push("u.category = ?");
    params.push(category);
  }
  if (studentNo) {
    where.push("u.student_no = ?");
    params.push(studentNo);
  }

  const rows = db
    .prepare(
      `SELECT u.*, s.full_name, s.program
         FROM uniform_orders u
         JOIN students s ON s.student_no = u.student_no
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY
          CASE u.status WHEN 'ready' THEN 0 WHEN 'ordered' THEN 1 ELSE 2 END,
          u.date_ordered DESC, u.id DESC
        LIMIT ?`
    )
    .all(...params, limit);
  res.json({ uniforms: rows });
});

function readUniformBody(body, current = {}) {
  const category = body.category !== undefined ? text(body.category, 20) : current.category;
  assert(CATEGORIES.includes(category), 400, "Choose PE, General, or Nursing uniform.");

  const status = body.status !== undefined ? text(body.status, 20) : current.status || "ordered";
  assert(UNIFORM_STATUSES.includes(status), 400, "Choose a valid uniform status.");
  assert(
    !(current.status === "claimed" && status === "cancelled"),
    409,
    "A claimed uniform cannot be cancelled — the student already picked it up."
  );

  let item = null;
  let size = null;
  let tailoring = null;

  if (category === "PE") {
    item = body.item !== undefined ? text(body.item, 20) : current.item;
    size = body.size !== undefined ? text(body.size, 10) : current.size;
    assert(PE_ITEM_NAMES.includes(item), 400, "Choose P.E. Pants or P.E. Shirt.");
    assert(
      PE_ITEM_SIZES[item].includes(size),
      400,
      `P.E. ${item} sizes are ${sizeRangeLabel(item)} only.`
    );
  } else {
    tailoring = body.tailoring_status !== undefined ? text(body.tailoring_status, 20) : current.tailoring_status || "queued";
    assert(TAILORING_STATUSES.includes(tailoring), 400, "Choose a valid tailoring status.");
  }

  const dateOrdered = body.date_ordered !== undefined ? dateValue(body.date_ordered, "Date ordered") : current.date_ordered || todayString();
  const timeOrdered = body.time_ordered !== undefined ? timeValue(body.time_ordered, "Time ordered") : current.time_ordered || nowTimeString();

  return {
    category,
    item,
    size,
    tailoring,
    status,
    dateOrdered,
    timeOrdered,
    remarks: body.remarks !== undefined ? text(body.remarks, 500) : current.remarks ?? null,
  };
}

/* The Property Office records an order at the counter when a student walks in:
   the uniform type, the P.E. piece and size, or the tailoring track. */
router.post("/uniforms", requireRole("custodian", "admin"), (req, res) => {
  const studentNo = text(req.body?.student_no, 40);
  assert(studentNo, 400, "Choose the student ordering the uniform.");
  const student = db.prepare("SELECT * FROM students WHERE student_no = ? COLLATE NOCASE").get(studentNo);
  assert(student, 404, "That student is not on the list yet. Add the student first, then record the order.");

  const data = readUniformBody(req.body);
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO uniform_orders
        (student_no, category, item, size, status, tailoring_status, date_ordered, time_ordered,
         remarks, encoded_by, updated_by, inventory_deducted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`
    )
    .run(
      student.student_no,
      data.category,
      data.item,
      data.size,
      data.status,
      data.tailoring,
      data.dateOrdered,
      data.timeOrdered,
      data.remarks,
      actorName(req.user),
      now,
      now
    );

  logActivity({
    actor: actorName(req.user),
    action: "recorded uniform order",
    entity: "uniform",
    entityId: Number(info.lastInsertRowid),
    detail: `${student.student_no} · ${data.category}${data.item ? ` ${data.item}` : ""}${data.size ? ` · ${data.size}` : ""}`,
  });

  const created = db
    .prepare(
      `SELECT u.*, s.full_name, s.program
         FROM uniform_orders u
         JOIN students s ON s.student_no = u.student_no
        WHERE u.id = ?`
    )
    .get(info.lastInsertRowid);
  res.status(201).json({ uniform: created });
});

router.patch("/uniforms/:id", requireRole("custodian", "admin"), (req, res) => {
  const current = db.prepare("SELECT * FROM uniform_orders WHERE id = ?").get(req.params.id);
  assert(current, 404, "Uniform order not found.");
  const data = readUniformBody(req.body, current);
  const now = new Date().toISOString();

  let deducted = current.inventory_deducted;
  if (data.category === "PE" && data.status === "claimed" && !current.inventory_deducted) {
    const stock = stockRow(data.item, data.size);
    if (stock && stock.quantity > 0) {
      db.prepare("UPDATE pe_inventory SET quantity = quantity - 1 WHERE item = ? AND size = ?").run(
        data.item,
        data.size
      );
    }
    deducted = 1;
  } else if (current.status === "claimed" && data.status !== "claimed" && current.inventory_deducted) {
    if (current.category === "PE" && current.item && current.size) {
      db.prepare("UPDATE pe_inventory SET quantity = quantity + 1 WHERE item = ? AND size = ?").run(
        current.item,
        current.size
      );
    }
    deducted = 0;
  }

  db.prepare(
    `UPDATE uniform_orders
        SET category = ?, item = ?, size = ?, status = ?, tailoring_status = ?, date_ordered = ?,
            time_ordered = ?, remarks = ?, inventory_deducted = ?, updated_by = ?, updated_at = ?
      WHERE id = ?`
  ).run(
    data.category,
    data.item,
    data.size,
    data.status,
    data.tailoring,
    data.dateOrdered,
    data.timeOrdered,
    data.remarks,
    deducted,
    actorName(req.user),
    now,
    current.id
  );

  if (current.status !== data.status || current.tailoring_status !== data.tailoring) {
    logActivity({
      actor: actorName(req.user),
      action:
        current.status !== data.status
          ? `marked uniform ${data.status}`
          : `tailoring ${data.tailoring}`,
      entity: "uniform",
      entityId: current.id,
      detail: `${current.student_no} · ${data.category}${data.item ? ` ${data.item}` : ""}`,
    });
  }
  res.json({ uniform: db.prepare("SELECT * FROM uniform_orders WHERE id = ?").get(current.id) });
});

router.post("/uniforms/:id/cancel", requireRole("custodian", "admin"), (req, res) => {
  const current = db.prepare("SELECT * FROM uniform_orders WHERE id = ?").get(req.params.id);
  assert(current, 404, "Uniform order not found.");
  assert(current.status !== "claimed", 409, "A claimed uniform cannot be cancelled — the student already picked it up.");
  assert(current.status !== "cancelled", 409, "This uniform order is already cancelled.");
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE uniform_orders SET status = 'cancelled', tailoring_status = NULL, updated_by = ?, updated_at = ? WHERE id = ?"
  ).run(actorName(req.user), now, current.id);
  logActivity({
    actor: actorName(req.user),
    action: "cancelled uniform order",
    entity: "uniform",
    entityId: current.id,
    detail: `${current.student_no} · ${current.category}${current.item ? ` ${current.item}` : ""}${current.size ? ` · ${current.size}` : ""}`,
  });
  res.json({ uniform: db.prepare("SELECT * FROM uniform_orders WHERE id = ?").get(current.id) });
});

/* ------------------------------------------------------------------ */
/* PE inventory & tailoring toggle                                     */
/* ------------------------------------------------------------------ */

function readInventoryTarget(req) {
  const item = text(req.body?.item ?? req.params.item, 20);
  assert(PE_ITEM_NAMES.includes(item), 400, "Choose P.E. Pants or P.E. Shirt.");
  const size = text(req.body?.size ?? req.params.size, 10).toUpperCase();
  assert(size, 400, "Size is required.");
  assert(PE_ITEM_SIZES[item].includes(size), 400, `P.E. ${item} sizes are ${sizeRangeLabel(item)} only.`);
  return { item, size };
}

router.get("/inventory", requireRole("custodian", "admin"), (_req, res) => {
  const groups = inventoryGroups();
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  res.json({ groups, total, low_stock: lowStockRows(), settings: settingsFor("admin") });
});

router.post("/inventory", requireRole("custodian", "admin"), (req, res) => {
  const { item, size } = readInventoryTarget(req);
  const quantity = Number(req.body?.quantity);
  assert(Number.isInteger(quantity) && quantity >= 0, 400, "Quantity must be a whole number of zero or more.");
  db.prepare(
    `INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)
     ON CONFLICT(item, size) DO UPDATE SET quantity = excluded.quantity`
  ).run(item, size, quantity);
  logActivity({
    actor: actorName(req.user),
    action: "set PE inventory",
    entity: "inventory",
    entityId: `${item} ${size}`,
    detail: `${quantity} pcs`,
  });
  res.status(201).json({ item, size, quantity });
});

router.patch("/inventory/:item/:size", requireRole("custodian", "admin"), (req, res) => {
  const { item, size } = readInventoryTarget(req);
  const current = stockRow(item, size);
  assert(current, 404, `P.E. ${item} size ${size} is not in the inventory yet.`);
  let quantity;
  if (req.body?.delta !== undefined) {
    const delta = Number(req.body.delta);
    assert(Number.isInteger(delta), 400, "Adjustment must be a whole number.");
    quantity = Math.max(0, current.quantity + delta);
  } else {
    quantity = Number(req.body?.quantity);
    assert(Number.isInteger(quantity) && quantity >= 0, 400, "Quantity must be a whole number of zero or more.");
  }
  db.prepare("UPDATE pe_inventory SET quantity = ? WHERE item = ? AND size = ?").run(quantity, item, size);
  logActivity({
    actor: actorName(req.user),
    action: "updated PE inventory",
    entity: "inventory",
    entityId: `${item} ${size}`,
    detail: `${current.quantity} → ${quantity}`,
  });
  res.json({ item, size, quantity });
});

router.patch("/settings/tailoring", requireRole("custodian", "admin"), (req, res) => {
  const open = Boolean(req.body?.open);
  setSetting("tailoring_open", open ? "1" : "0");
  logActivity({
    actor: actorName(req.user),
    action: open ? "opened tailoring" : "closed tailoring",
    entity: "settings",
    detail: "Tailoring acceptance toggled",
  });
  res.json({ settings: settingsFor("admin") });
});

/* ------------------------------------------------------------------ */
/* Dashboard & activity                                                */
/* ------------------------------------------------------------------ */

router.get("/dashboard", requireStaff, (req, res) => {
  const scope = deskScope(req.user.role);
  const countBy = (table, column) => {
    const out = {};
    for (const row of db.prepare(`SELECT ${column} AS key, COUNT(*) AS n FROM ${table} GROUP BY ${column}`).all()) {
      out[row.key] = row.n;
    }
    return out;
  };

  const docCounts = countBy("documents", "status");
  const uniformCounts = countBy("uniform_orders", "status");
  const tailoringCounts = countBy("uniform_orders", "tailoring_status");
  delete tailoringCounts.null;

  const inventory = scope === "documents" ? [] : inventoryGroups();

  const readyDocuments =
    scope === "uniforms"
      ? []
      : db
          .prepare(
            `SELECT d.*, s.full_name FROM documents d JOIN students s ON s.student_no = d.student_no
              WHERE d.status = 'ready' ORDER BY COALESCE(d.date_ready, d.updated_at) DESC LIMIT 6`
          )
          .all();
  const readyUniforms =
    scope === "documents"
      ? []
      : db
          .prepare(
            `SELECT u.*, s.full_name FROM uniform_orders u JOIN students s ON s.student_no = u.student_no
              WHERE u.status = 'ready' ORDER BY u.updated_at DESC LIMIT 6`
          )
          .all();

  // The activity feed follows the same split, so a registrar never reads a
  // Property Office note (and the other way round).
  const hiddenEntity = scope === "documents" ? "uniform" : scope === "uniforms" ? "document" : null;
  const recentActivity = db
    .prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT ?")
    .all(hiddenEntity ? 40 : 8)
    .filter((entry) => !hiddenEntity || entry.entity !== hiddenEntity)
    .slice(0, 8);

  const claimedToday = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM documents WHERE status = 'claimed' AND date(updated_at, 'localtime') = date('now', 'localtime')) AS documents,
         (SELECT COUNT(*) FROM uniform_orders WHERE status = 'claimed' AND date(updated_at, 'localtime') = date('now', 'localtime')) AS uniforms`
    )
    .get();

  const totals = {
    documents_ready: scope === "uniforms" ? 0 : docCounts.ready || 0,
    uniforms_ready: scope === "documents" ? 0 : uniformCounts.ready || 0,
    documents_pending: scope === "uniforms" ? 0 : (docCounts.requested || 0) + (docCounts.processing || 0),
    uniforms_pending: scope === "documents" ? 0 : uniformCounts.ordered || 0,
    tailoring_active: scope === "documents" ? 0 : (tailoringCounts.queued || 0) + (tailoringCounts.sewing || 0),
    claimed_today:
      scope === "documents"
        ? Number(claimedToday.documents) || 0
        : scope === "uniforms"
          ? Number(claimedToday.uniforms) || 0
          : (Number(claimedToday.documents) || 0) + (Number(claimedToday.uniforms) || 0),
    students: db.prepare("SELECT COUNT(*) AS n FROM students").get().n,
    accounts: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
  };

  res.json({
    scope,
    totals,
    documents: scope === "uniforms" ? {} : docCounts,
    uniforms: scope === "documents" ? {} : uniformCounts,
    tailoring: scope === "documents" ? {} : tailoringCounts,
    inventory,
    low_stock: scope === "documents" ? [] : lowStockRows(),
    readyDocuments,
    readyUniforms,
    recentActivity,
    settings: settingsFor(req.user.role),
  });
});

router.get("/activity", requireStaff, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 200);
  const scope = deskScope(req.user.role);
  const hiddenEntity = scope === "documents" ? "uniform" : scope === "uniforms" ? "document" : null;
  const rows = db
    .prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT ?")
    .all(hiddenEntity ? 200 : limit)
    .filter((entry) => !hiddenEntity || entry.entity !== hiddenEntity)
    .slice(0, limit);
  res.json({ activity: rows });
});

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

router.get("/settings", (req, res) => {
  res.json({ settings: settingsFor(req.user.role) });
});

router.patch("/settings", requireRole("admin"), (req, res) => {
  const allowed = ["school_year", "semester", "tailoring_open", "allow_student_registration", "default_student_password", "pickup_note", "office_hours"];
  const updates = [];
  for (const key of allowed) {
    if (req.body?.[key] === undefined) continue;
    const value = String(req.body[key]).trim();
    if (key === "default_student_password") assert(value.length >= 6, 400, "Default password must be at least 6 characters.");
    if (key === "tailoring_open" || key === "allow_student_registration") {
      assert(["0", "1", "true", "false"].includes(value), 400, "Toggle values must be true or false.");
      setSetting(key, value === "1" || value === "true" ? "1" : "0");
    } else {
      setSetting(key, value.slice(0, 240));
    }
    updates.push(key);
  }
  assert(updates.length > 0, 400, "No settings were provided.");
  logActivity({
    actor: actorName(req.user),
    action: "updated settings",
    entity: "settings",
    detail: updates.join(", "),
  });
  res.json({ settings: settingsFor(req.user.role) });
});

/* ------------------------------------------------------------------ */
/* Staff accounts                                                      */
/* ------------------------------------------------------------------ */

router.get("/users", requireRole("admin"), (req, res) => {
  const role = text(req.query.role, 20);
  const q = text(req.query.q, 80);
  const where = [];
  const params = [];
  if (role === "student" || isValidRole(role)) {
    where.push("u.role = ?");
    params.push(role);
  }
  if (q) {
    where.push("(u.username LIKE ? OR u.full_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  const users = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.full_name, u.email, u.avatar, u.student_no, u.created_at, u.updated_at,
              s.program, s.year_level
         FROM users u
         LEFT JOIN students s ON s.student_no = u.student_no
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'registrar' THEN 1 WHEN 'custodian' THEN 2 ELSE 3 END, u.full_name`
    )
    .all(...params);
  res.json({ users });
});

router.post("/users", requireRole("admin"), (req, res) => {
  const username = text(req.body?.username, 40);
  const fullName = text(req.body?.full_name, 80);
  const role = text(req.body?.role, 20);
  const password = String(req.body?.password ?? "");
  assert(username, 400, "Username is required.");
  assert(/^[A-Za-z0-9._-]{3,40}$/.test(username), 400, "Username must be 3–40 letters, numbers, dots, dashes or underscores.");
  assert(fullName, 400, "Full name is required.");
  assert(role && ["registrar", "custodian", "admin"].includes(role), 400, "Choose a staff role.");
  assert(password.length >= 6, 400, "Password must be at least 6 characters.");
  const existing = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(username);
  assert(!existing, 409, "That username is already taken.");
  const email = text(req.body?.email, 120);
  if (email) assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, "Enter a valid email address.");
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`
    )
    .run(username.toLowerCase(), role, fullName, email, hashPassword(password), now, now);
  logActivity({
    actor: actorName(req.user),
    action: "created staff account",
    entity: "user",
    entityId: info.lastInsertRowid,
    detail: `${fullName} · ${role}`,
  });
  const user = db.prepare("SELECT id, username, role, full_name, email, avatar, student_no, created_at, updated_at FROM users WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ user });
});

router.patch("/users/:id", requireRole("admin"), (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  assert(target, 404, "Account not found.");
  const fullName = req.body?.full_name !== undefined ? text(req.body.full_name, 80) : target.full_name;
  assert(fullName, 400, "Full name cannot be empty.");
  const email = req.body?.email !== undefined ? text(req.body.email, 120) : target.email;
  if (email) assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, "Enter a valid email address.");

  let role = target.role;
  if (req.body?.role !== undefined && target.role !== "student") {
    role = text(req.body.role, 20);
    assert(["registrar", "custodian", "admin"].includes(role), 400, "Choose a valid staff role.");
    if (target.id === req.user.id) assert(role === "admin", 400, "You cannot remove your own admin access.");
  }

  const now = new Date().toISOString();
  let passwordHash = target.password_hash;
  if (req.body?.password) {
    const password = String(req.body.password);
    assert(password.length >= 6, 400, "Password must be at least 6 characters.");
    passwordHash = hashPassword(password);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(target.id);
  }

  db.prepare(
    "UPDATE users SET full_name = ?, email = ?, role = ?, password_hash = ?, updated_at = ? WHERE id = ?"
  ).run(fullName, email, role, passwordHash, now, target.id);
  if (target.student_no) {
    db.prepare("UPDATE students SET full_name = ?, email = ?, updated_at = ? WHERE student_no = ?").run(
      fullName,
      email,
      now,
      target.student_no
    );
  }
  logActivity({
    actor: actorName(req.user),
    action: req.body?.password ? "reset account password" : "updated account",
    entity: "user",
    entityId: target.id,
    detail: target.username,
  });
  const user = db.prepare("SELECT id, username, role, full_name, email, avatar, student_no, created_at, updated_at FROM users WHERE id = ?").get(target.id);
  res.json({ user });
});

router.delete("/users/:id", requireRole("admin"), (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  assert(target, 404, "Account not found.");
  assert(target.id !== req.user.id, 400, "You cannot remove your own account while signed in.");
  db.prepare("DELETE FROM users WHERE id = ?").run(target.id);
  logActivity({
    actor: actorName(req.user),
    action: "removed account",
    entity: "user",
    entityId: target.id,
    detail: `${target.username} · ${target.role}`,
  });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* CSV helper                                                          */
/* ------------------------------------------------------------------ */

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const hasHeader = header.some((h) => ["student_no", "student_number"].includes(h));
  const columns = hasHeader
    ? header.map((h) => (h === "student_number" ? "student_no" : h))
    : ["student_no", "full_name", "program", "year_level", "section", "email"];
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((cells) => {
    const record = {};
    columns.forEach((key, index) => {
      record[key] = cells[index]?.trim() ?? "";
    });
    return record;
  });
}

export default router;
