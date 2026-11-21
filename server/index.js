import express from "express";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, ROOT, getSettings } from "./db.js";
import { seedDatabase } from "./seed.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import { ApiError } from "./util.js";

const app = express();
const PORT = Number(process.env.PORT) || 4318;

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(express.json({ limit: "3mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/public/config", (_req, res) => {
  const settings = getSettings();
  res.json({
    allow_student_registration: settings.allow_student_registration === "1",
    school_year: settings.school_year,
    semester: settings.semester,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

const dist = path.join(ROOT, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "That upload is too large. Please choose a smaller image." });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "The request body was not valid JSON." });
  }
  console.error("[campusflow] unexpected error:", err);
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong on the server. Please try again."
      : `Server error: ${err?.message || err}`;
  res.status(500).json({ error: message });
});

seedDatabase();

app.listen(PORT, "127.0.0.1", () => {
  console.log(`CampusFlow API listening on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  if (fs.existsSync(path.join(dist, "index.html"))) {
    console.log(`Serving built app from ${dist}`);
  }
});
