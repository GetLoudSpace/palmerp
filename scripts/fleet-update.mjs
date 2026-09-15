#!/usr/bin/env node
/**
 * fleet-update.mjs — Actualización 1-click para fleet independiente (cliente)
 * Flujo a prueba de pánico: backup → fetch upstream → merge → npm ci → prisma generate/migrate → build verify → push
 * Uso:
 *   node scripts/fleet-update.mjs --check          # solo comprueba
 *   node scripts/fleet-update.mjs --apply          # aplica si hay update
 *   node scripts/fleet-update.mjs --apply --force  # fuerza aunque parezca al día
 *   node scripts/fleet-update.mjs --dry-run        # simula sin tocar
 *
 * Requiere: git, upstream configurado, DATABASE_URL, BACKUP_ENCRYPTION_KEY
 * MiniPC: mismo flujo, pero con pm2 restart si hay ecosystem
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import fs from "node:fs";

function log(msg) { console.log(`[fleet-update] ${msg}`); }
function warn(msg) { console.warn(`[fleet-update] ⚠️  ${msg}`); }
function sh(cmd, opts = {}) {
  const { dryRun = false, ...rest } = opts;
  if (dryRun) { log(`(dry-run) $ ${cmd}`); return ""; }
  log(`$ ${cmd}`);
  return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...rest });
}
function shInherit(cmd, opts = {}) {
  if (opts.dryRun) { log(`(dry-run) $ ${cmd}`); return; }
  log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

async function checkUpstream() {
  // usa el mismo código que src/lib/fleet/upstream.ts pero en mjs sin TS
  const repo = process.env.PALMERP_UPSTREAM_REPO || "Palm-ERP/palmerp";
  const branch = process.env.PALMERP_UPSTREAM_BRANCH || "master";
  const token = process.env.GITHUB_TOKEN || "";
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, { headers });
    if (res.ok) {
      const j = await res.json();
      return { repo, branch, commit: j.sha, commitShort: j.sha.slice(0,7) };
    }
  } catch {}
  try {
    const out = execSync(`git ls-remote https://github.com/${repo}.git refs/heads/${branch}`, { encoding: "utf8" }).trim();
    const sha = out.split(/\s+/)[0];
    return { repo, branch, commit: sha, commitShort: sha.slice(0,7) };
  } catch { return null; }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const checkOnly = args.has("--check");
  const apply = args.has("--apply");
  const force = args.has("--force");

  const localCommit = (() => { try { return execSync("git rev-parse HEAD", {encoding:"utf8"}).trim(); } catch { return null; }})();
  const localShort = localCommit ? localCommit.slice(0,7) : "unknown";
  let localVersion = "0.0.0";
  try { localVersion = JSON.parse(fs.readFileSync("package.json","utf8")).version; } catch {}

  log(`Local: v${localVersion} @ ${localShort}`);
  const up = await checkUpstream();
  if (!up) { log("No se pudo consultar upstream (sin internet o repo privado sin GITHUB_TOKEN)"); process.exit(0); }
  log(`Upstream: ${up.repo}@${up.branch} @ ${up.commitShort}`);

  // behind count
  let behind = null;
  try {
    execSync(`git fetch https://github.com/${up.repo}.git ${up.branch} --quiet`, { stdio: "ignore" });
    const c = execSync(`git rev-list --count HEAD..FETCH_HEAD`, { encoding:"utf8" }).trim();
    behind = parseInt(c,10) || 0;
  } catch { behind = localCommit !== up.commit ? 1 : 0; }

  log(`Behind: ${behind} commits`);
  const needsUpdate = localCommit !== up.commit || (behind !== null && behind > 0);
  if (!needsUpdate && !force) {
    log("✅ Al día. Nada que hacer.");
    if (checkOnly) return;
    if (!apply) { log("Usa --apply para forzar o espera a nuevo commit upstream."); return; }
  }

  if (checkOnly) {
    if (needsUpdate) log(`🔔 Actualización disponible: ${behind} commits por detrás`);
    return;
  }

  if (!apply && !force) {
    log("Hay actualización. Ejecuta con --apply para aplicarla o --dry-run para simular.");
    return;
  }

  // --- APPLY ---
  log("🚀 Iniciando actualización con backup previo...");

  // 1) Backup previo (si hay DB)
  if (process.env.DATABASE_URL) {
    try {
      log("1/6 Backup previo (logical)...");
      // intenta via node inline runner si existe
      shInherit(`node -e "import('./src/lib/backup/runner.js').then(m=>m.runBackupAllTenants().then(r=>console.log(JSON.stringify(r,null,2))))"`, { dryRun });
    } catch {
      warn("Backup previo falló o no disponible — continúa, pero revisa luego /api/admin/restore");
    }
  } else {
    warn("DATABASE_URL no configurado — sin backup previo");
  }

  // 2) Stash dirty?
  let hadDirty = false;
  try {
    const status = execSync("git status --porcelain", { encoding:"utf8" }).trim();
    if (status) {
      hadDirty = true;
      warn("Working tree sucio — stash");
      sh(`git stash push -m "fleet-update autostash ${new Date().toISOString()}"`, { dryRun });
    }
  } catch {}

  // 3) Asegurar upstream remote
  const remotes = (() => { try { return execSync("git remote", {encoding:"utf8"}); } catch { return ""; }})();
  if (!remotes.includes("upstream")) {
    log(`Configurando upstream → https://github.com/${up.repo}.git`);
    sh(`git remote add upstream https://github.com/${up.repo}.git`, { dryRun });
  }

  // 4) Fetch + merge
  try {
    shInherit(`git fetch upstream ${up.branch}`, { dryRun });
    shInherit(`git merge upstream/${up.branch} --no-edit --no-ff`, { dryRun });
    log("✅ Merge upstream OK");
  } catch (e) {
    warn("Merge con conflictos — abortando. Haz `git merge --abort` y resuelve manual.");
    try { sh(`git merge --abort`, { dryRun }); } catch {}
    if (hadDirty) sh(`git stash pop`, { dryRun });
    process.exit(1);
  }

  // 5) Deps + Prisma
  try {
    shInherit(`npm ci --legacy-peer-deps`, { dryRun });
    shInherit(`npx prisma generate`, { dryRun });
    // intenta migrate deploy, fallback db push
    try { shInherit(`npx prisma migrate deploy`, { dryRun }); }
    catch { shInherit(`npx prisma db push`, { dryRun }); }
    log("✅ Prisma OK");
  } catch (e) {
    warn("Prisma falló — revisa DATABASE_URL y schema");
    process.exit(1);
  }

  // 6) Verify build
  try {
    shInherit(`npx tsc --noEmit --skipLibCheck`, { dryRun });
    shInherit(`npm run build`, { dryRun });
    log("✅ Build OK");
  } catch {
    warn("Build falló — revisa TypeScript. No se hará push.");
    process.exit(1);
  }

  // 7) Push → Vercel auto-deploy
  try {
    const branch = (() => { try { return execSync("git rev-parse --abbrev-ref HEAD",{encoding:"utf8"}).trim(); } catch { return "master"; }})();
    shInherit(`git push origin ${branch}`, { dryRun });
    log(`✅ Push a origin/${branch} — Vercel desplegará en 1-2 min`);
  } catch (e) {
    warn("Push falló — haz `git push origin HEAD` manual");
  }

  if (hadDirty) {
    try { sh(`git stash pop`, { dryRun }); log("Stash pop OK"); } catch {}
  }

  // 8) MiniPC pm2?
  try {
    execSync("which pm2", { stdio: "ignore" });
    log("pm2 detectado — reiniciando...");
    shInherit(`pm2 restart palmerp || pm2 restart all || true`, { dryRun });
  } catch {}

  log("🎉 Actualización completada. Verifica https://<dominio>/admin/settings/updates → verde");
  log(`   Local ahora: ${(() => { try { return execSync("git rev-parse --short HEAD",{encoding:"utf8"}).trim(); } catch { return "?"; }})()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
