import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface LocalVersion {
  version: string; // package.json version
  commit: string | null; // git rev-parse HEAD
  commitShort: string | null;
  branch: string | null;
  dirty: boolean;
  builtAt: string; // ISO
  upstreamRepo: string | null; // env PALMERP_UPSTREAM_REPO
}

export function getLocalVersion(): LocalVersion {
  let version = "0.0.0";
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    version = pkg.version || version;
  } catch {}
  let commit: string | null = null;
  let commitShort: string | null = null;
  let branch: string | null = null;
  let dirty = false;
  try {
    commit = execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
    commitShort = commit ? commit.slice(0, 7) : null;
  } catch {}
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {}
  try {
    const status = execSync("git status --porcelain", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    dirty = status.length > 0;
  } catch {}
  return {
    version,
    commit,
    commitShort,
    branch,
    dirty,
    builtAt: new Date().toISOString(),
    upstreamRepo: process.env.PALMERP_UPSTREAM_REPO || process.env.PALMERP_UPSTREAM || null,
  };
}

/**
 * Compara versiones semver simples x.y.z
 * return -1 si a < b, 0 si igual, 1 si a > b
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}
