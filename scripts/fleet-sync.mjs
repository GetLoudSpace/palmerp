#!/usr/bin/env node
/**
 * fleet-sync.mjs — helper fino para solo sincronizar con upstream sin backup/build
 * Útil para agentes que quieren fetch + merge rápido
 * Uso: node scripts/fleet-sync.mjs [--dry-run]
 */
import { execSync } from "node:child_process";

const dry = process.argv.includes("--dry-run");
function sh(cmd) {
  if (dry) { console.log(`(dry-run) $ ${cmd}`); return; }
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

const repo = process.env.PALMERP_UPSTREAM_REPO || "Palm-ERP/palmerp";
const branch = process.env.PALMERP_UPSTREAM_BRANCH || "master";

try {
  const remotes = execSync("git remote", { encoding: "utf8" });
  if (!remotes.includes("upstream")) sh(`git remote add upstream https://github.com/${repo}.git`);
  sh(`git fetch upstream ${branch}`);
  sh(`git merge upstream/${branch} --no-edit --no-ff`);
  console.log("✅ Sync OK — ahora: npm ci && npx prisma generate && npx prisma migrate deploy && npm run build && git push");
} catch (e) {
  console.error("Sync falló, haz git merge --abort y resuelve conflictos");
  process.exit(1);
}
