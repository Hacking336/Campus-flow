import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const nodeDir = path.dirname(process.execPath);
const env = { ...process.env, PATH: `${nodeDir}${path.delimiter}${process.env.PATH || ""}` };
const viteBin = path.resolve("node_modules", "vite", "bin", "vite.js");

const children = [];

function start(name, args) {
  const child = spawn(process.execPath, args, { env, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`[dev] ${name} exited with code ${code}`);
      shutdown(code);
    }
  });
  children.push(child);
  return child;
}

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 400);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("api", [path.resolve("server", "index.js")]);
start("vite", [viteBin]);
