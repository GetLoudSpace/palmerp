// Upstream check — compara local vs repo base (Palm-ERP/palmerp)
// Usa GitHub API si hay token, sino fallback a git ls-remote
import { execSync } from "node:child_process";
import { getLocalVersion, compareSemver } from "./version";

export interface UpstreamInfo {
  repo: string; // "Palm-ERP/palmerp"
  branch: string; // "main"
  commit: string | null;
  commitShort: string | null;
  version: string | null; // package.json version del upstream (si se puede leer)
  fetchedAt: string;
}

export interface UpdateCheck {
  local: ReturnType<typeof getLocalVersion>;
  upstream: UpstreamInfo | null;
  updateAvailable: boolean;
  behindByCommits: number | null; // si se puede calcular via git rev-list
  reason: string;
}

const DEFAULT_REPO = "Palm-ERP/palmerp";
const DEFAULT_BRANCH = "main";

function getRepoAndBranch(): { repo: string; branch: string } {
  const repo = process.env.PALMERP_UPSTREAM_REPO || process.env.PALMERP_UPSTREAM || DEFAULT_REPO;
  const branch = process.env.PALMERP_UPSTREAM_BRANCH || DEFAULT_BRANCH;
  return { repo, branch };
}

async function fetchUpstreamViaGitHub(repo: string, branch: string): Promise<UpstreamInfo | null> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    // 1) commit del branch
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { sha: string };
    const commit = data.sha || null;
    // 2) package.json version del upstream (raw)
    let version: string | null = null;
    try {
      const rawRes = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/package.json`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
      if (rawRes.ok) {
        const pkg = (await rawRes.json()) as { version?: string };
        version = pkg.version || null;
      }
    } catch {}
    return {
      repo,
      branch,
      commit,
      commitShort: commit ? commit.slice(0, 7) : null,
      version,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function fetchUpstreamViaGitLsRemote(repo: string, branch: string): UpstreamInfo | null {
  try {
    const url = `https://github.com/${repo}.git`;
    const out = execSync(`git ls-remote ${url} refs/heads/${branch}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    // out: "<sha>\trefs/heads/main"
    const sha = out.split(/\s+/)[0] || null;
    return { repo, branch, commit: sha, commitShort: sha ? sha.slice(0, 7) : null, version: null, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function checkForUpdates(): Promise<UpdateCheck> {
  const local = getLocalVersion();
  const { repo, branch } = getRepoAndBranch();

  let upstream: UpstreamInfo | null = await fetchUpstreamViaGitHub(repo, branch);
  if (!upstream) upstream = fetchUpstreamViaGitLsRemote(repo, branch);

  if (!upstream || !upstream.commit) {
    return { local, upstream, updateAvailable: false, behindByCommits: null, reason: "No se pudo consultar upstream (sin internet o repo privado sin GITHUB_TOKEN)" };
  }

  // Si local.commit coincide con upstream → al día
  let behindByCommits: number | null = null;
  try {
    // Fetch upstream sin merge para contar
    execSync(`git fetch https://github.com/${repo}.git ${branch} --quiet`, { stdio: "ignore", timeout: 8000 });
    const upstreamRef = `FETCH_HEAD`;
    try {
      const countStr = execSync(`git rev-list --count HEAD..${upstreamRef}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      behindByCommits = parseInt(countStr, 10) || 0;
    } catch {
      // fallback: si no hay FETCH_HEAD, compara shas
      behindByCommits = local.commit && upstream.commit && local.commit !== upstream.commit ? 1 : 0;
    }
  } catch {
    behindByCommits = local.commit && upstream.commit && local.commit !== upstream.commit ? 1 : 0;
  }

  let updateAvailable = false;
  let reason = "";
  if (upstream.version && local.version) {
    const cmp = compareSemver(local.version, upstream.version);
    if (cmp < 0) {
      updateAvailable = true;
      reason = `Nueva versión ${upstream.version} disponible (local ${local.version})`;
    } else if (behindByCommits !== null && behindByCommits > 0) {
      updateAvailable = true;
      reason = `${behindByCommits} commit(s) por detrás de ${repo}@${branch}`;
    } else {
      reason = "Al día";
    }
  } else if (behindByCommits !== null && behindByCommits > 0) {
    updateAvailable = true;
    reason = `${behindByCommits} commit(s) por detrás de ${repo}@${branch}`;
  } else if (local.commit && upstream.commit && local.commit !== upstream.commit) {
    updateAvailable = true;
    reason = `Commit distinto (local ${local.commitShort} vs upstream ${upstream.commitShort})`;
  } else {
    reason = "Al día";
  }

  return { local, upstream, updateAvailable, behindByCommits, reason };
}
