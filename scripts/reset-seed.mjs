import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
for (const file of ["campusflow.db", "campusflow.db-wal", "campusflow.db-shm"]) {
  const full = path.join(dataDir, file);
  if (fs.existsSync(full)) fs.rmSync(full);
}

const { seedDatabase } = await import("../server/seed.js");
seedDatabase({ force: true });
console.log("Database reset. Demo records reloaded.");
console.log("Restart the app (./start.sh) so the server opens the fresh database file.");
