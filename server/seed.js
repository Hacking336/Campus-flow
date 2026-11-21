import { db, getSettings, logActivity, setSetting } from "./db.js";
import { hashPassword } from "./security.js";

const DAY = 24 * 60 * 60 * 1000;

function isoDaysAgo(days, hour = 10, minute = 0) {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateDaysAgo(days) {
  const d = new Date(Date.now() - days * DAY);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function futureDate(days) {
  const d = new Date(Date.now() + days * DAY);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeOf(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const STUDENTS = [
  ["2024-00101", "Juan Miguel Reyes", "BS Information Technology", "3rd Year", "A", "juanmiguel.reyes@campus.edu.ph"],
  ["2024-00102", "Althea Marie Cruz", "BS Nursing", "2nd Year", "B", "althea.cruz@campus.edu.ph"],
  ["2023-00214", "Mark Angelo Dela Cruz", "BS Accountancy", "4th Year", "A", "mark.delacruz@campus.edu.ph"],
  ["2025-00308", "Sofia Isabel Garcia", "BS Civil Engineering", "1st Year", "C", "sofia.garcia@campus.edu.ph"],
  ["2024-00147", "Nico Benedict Lim", "BS Information Technology", "2nd Year", "B", "nico.lim@campus.edu.ph"],
  ["2023-00256", "Patricia Anne Mendoza", "BS Education", "4th Year", "A", "patricia.mendoza@campus.edu.ph"],
  ["2025-00312", "Rafael Luis Torres", "BS Nursing", "1st Year", "A", "rafael.torres@campus.edu.ph"],
  ["2024-00188", "Bea Camille Ramos", "BS Accountancy", "3rd Year", "B", "bea.ramos@campus.edu.ph"],
  ["2023-00201", "Christian Paolo Aquino", "BS Civil Engineering", "3rd Year", "A", "christian.aquino@campus.edu.ph"],
  ["2025-00345", "Larah Denise Villanueva", "BS Information Technology", "1st Year", "C", "larah.villanueva@campus.edu.ph"],
  ["2024-00163", "Gabriel Isaiah Flores", "BS Education", "2nd Year", "B", "gabriel.flores@campus.edu.ph"],
  ["2025-00329", "Hannah Grace Bautista", "BS Nursing", "2nd Year", "A", "hannah.bautista@campus.edu.ph"],
];

const STAFF = [
  ["admin", "admin123", "admin", "Maria Elena Santos", "registrar@campus.edu.ph"],
  ["registrar", "registrar123", "registrar", "Jose Carlo Dela Cruz", "records@campus.edu.ph"],
  ["custodian", "custodian123", "custodian", "Ana Liza Reyes", "property@campus.edu.ph"],
];

function count(table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

function addUser({ username, password, role, fullName, email, studentNo = null, avatar = null }) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(username, role, fullName, email, hashPassword(password), avatar, studentNo, now, now);
}

export function seedDatabase({ force = false } = {}) {
  if (!force && count("students") > 0) return false;

  const now = new Date().toISOString();
  db.exec("DELETE FROM activity_log; DELETE FROM sessions; DELETE FROM pe_inventory; DELETE FROM uniform_orders; DELETE FROM documents; DELETE FROM users; DELETE FROM students;");

  const insertStudent = db.prepare(
    `INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const s of STUDENTS) insertStudent.run(...s, now, now);

  for (const [username, password, role, fullName, email] of STAFF) {
    addUser({ username, password, role, fullName, email });
  }

  for (const no of ["2024-00101", "2024-00102", "2023-00214", "2025-00308", "2024-00147", "2025-00312"]) {
    const row = STUDENTS.find((s) => s[0] === no);
    addUser({
      username: no,
      password: "Campus123",
      role: "student",
      fullName: row[1],
      email: row[5],
      studentNo: no,
    });
  }

  // P.E. Pants (S–3XL) and P.E. Shirt (XS–3XL) are counted as separate stock.
  const inventory = [
    ["Pants", "S", 12],
    ["Pants", "M", 16],
    ["Pants", "L", 12],
    ["Pants", "XL", 8],
    ["Pants", "2XL", 5],
    ["Pants", "3XL", 2],
    ["Shirt", "XS", 6],
    ["Shirt", "S", 12],
    ["Shirt", "M", 18],
    ["Shirt", "L", 14],
    ["Shirt", "XL", 9],
    ["Shirt", "2XL", 5],
    ["Shirt", "3XL", 3],
  ];
  for (const [item, size, qty] of inventory) {
    db.prepare("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)").run(item, size, qty);
  }

  const insertDoc = db.prepare(
    `INSERT INTO documents
      (student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const docs = [
    ["2024-00101", "COR", "ready", dateDaysAgo(6), dateDaysAgo(1), "Bring your school ID. Pick-up until Oct 30, 4:00 PM.", "Jose Carlo Dela Cruz"],
    ["2024-00101", "COG", "processing", dateDaysAgo(4), null, "For scholarship application. Registrar is verifying grades.", "Jose Carlo Dela Cruz"],
    ["2024-00101", "Authentication", "requested", dateDaysAgo(1), null, "Needs authentication of TOR copy.", "Jose Carlo Dela Cruz"],
    ["2024-00101", "Good Moral", "claimed", dateDaysAgo(12), dateDaysAgo(9), "Claimed by student at Window 2.", "Jose Carlo Dela Cruz"],
    ["2024-00102", "COG", "ready", dateDaysAgo(8), dateDaysAgo(2), "Ready at the Registrar's Office, Window 1.", "Jose Carlo Dela Cruz"],
    ["2024-00102", "COR", "claimed", dateDaysAgo(15), dateDaysAgo(13), null, "Jose Carlo Dela Cruz"],
    ["2023-00214", "TOR", "processing", dateDaysAgo(3), null, "For employment. Awaiting final signature.", "Jose Carlo Dela Cruz"],
    ["2023-00214", "Authentication", "ready", dateDaysAgo(7), dateDaysAgo(1), "Authentication fee paid. Bring receipt.", "Maria Elena Santos"],
    ["2025-00308", "COR", "ready", dateDaysAgo(5), dateDaysAgo(0), "Pick up before 4:30 PM.", "Jose Carlo Dela Cruz"],
    ["2025-00308", "Good Moral", "requested", dateDaysAgo(0), null, "For student organization requirement.", "Jose Carlo Dela Cruz"],
    ["2024-00147", "COG", "requested", dateDaysAgo(1), null, null, "Jose Carlo Dela Cruz"],
    ["2023-00256", "COG", "ready", dateDaysAgo(10), dateDaysAgo(3), "For board exam application.", "Maria Elena Santos"],
    ["2025-00312", "COR", "claimed", dateDaysAgo(20), dateDaysAgo(18), null, "Jose Carlo Dela Cruz"],
    ["2024-00188", "Certificate of Enrollment", "processing", dateDaysAgo(2), null, "For bank account opening.", "Jose Carlo Dela Cruz"],
    ["2023-00201", "Authentication", "requested", dateDaysAgo(0), null, "For PRC requirements.", "Jose Carlo Dela Cruz"],
  ];
  for (const d of docs) {
    const updated = d[2] === "claimed" ? isoDaysAgo(9) : now;
    insertDoc.run(...d, "Jose Carlo Dela Cruz", now, updated);
  }

  const insertUniform = db.prepare(
    `INSERT INTO uniform_orders
      (student_no, category, item, size, status, tailoring_status, date_ordered, time_ordered, remarks, encoded_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // P.E. uniforms are tracked as stock and size reference only, so the demo
  // data has tailoring orders (General / Nursing) but no P.E. order rows.
  const uniforms = [
    ["2024-00102", "Nursing", null, null, "ordered", "sewing", dateDaysAgo(5), timeOf(13, 15), "Clinical uniform with name embroidery.", "Ana Liza Reyes"],
    ["2023-00214", "General", null, null, "ready", "finished", dateDaysAgo(12), timeOf(10, 5), "Pick up at the Property Office.", "Ana Liza Reyes"],
    ["2025-00312", "Nursing", null, null, "ready", "finished", dateDaysAgo(9), timeOf(11, 20), "White nursing uniform, size M equivalent.", "Ana Liza Reyes"],
    ["2023-00256", "General", null, null, "ordered", "queued", dateDaysAgo(2), timeOf(15, 10), "For practice teaching.", "Ana Liza Reyes"],
  ];
  for (const u of uniforms) {
    const updated = u[4] === "claimed" ? isoDaysAgo(11) : now;
    insertUniform.run(...u, "Ana Liza Reyes", now, updated);
  }

  const settings = getSettings();
  const defaults = {
    school_year: "2026–2027",
    semester: "1st Semester",
    tailoring_open: "1",
    allow_student_registration: "1",
    default_student_password: "Campus123",
    pickup_note: "Bring your school ID when claiming documents or uniforms at the campus.",
    office_hours: "Mon–Fri · 8:00 AM – 4:30 PM",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (settings[key] === undefined) setSetting(key, value);
  }

  logActivity({ actor: "System", action: "seeded", entity: "database", detail: "Demo records loaded" });
  return true;
}

