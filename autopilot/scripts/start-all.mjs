/**
 * Runs the dashboard (next start) and the background worker in one process group.
 * Used by `npm start` so single-service hosts (Railway, Render) run both and share
 * the same disk. If either process exits, the other is stopped so the host restarts both.
 */
import { spawn } from "node:child_process";

const procs = [
  spawn("npx", ["next", "start", "-p", process.env.PORT ?? "3000"], { stdio: "inherit" }),
  spawn("npx", ["tsx", "scripts/worker.ts"], { stdio: "inherit" }),
];

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (p.exitCode === null) p.kill("SIGTERM");
  setTimeout(() => process.exit(code), 3000).unref();
}

for (const p of procs) p.on("exit", (code) => stopAll(code ?? 1));
process.on("SIGTERM", () => stopAll(0));
process.on("SIGINT", () => stopAll(0));
