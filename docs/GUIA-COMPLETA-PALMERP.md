# Guía Completa PalmerP — Sistema Fleet + Triple Backup + Updates 1-Click

> **Para quién es:** Dueño del negocio (usuario) + Instalador (técnico/IA) + Tú (PalmerP).  
> **Objetivo:** que entiendas **qué** montamos, **por qué** cada pieza existe y **cómo** operarlo paso a paso, sin tecnicismos innecesarios pero sin dejar huecos.  
> **Principio:** cada capítulo está dividido en micro-pasos verificables. Si marcas todas las casillas, estás cubierto.

**Versión:** 1.1 — 15 Sep 2026  
**Stack:** Next.js 16.2 + Prisma 7.8 + Supabase pooler 6543 + Vercel + R2 + MiniPC siempre ON + systemd 02:00  
**Repo base:** `Palm-ERP/palmerp` (GitHub Template) → cada cliente es un fork independiente

---

## Índice

1. [La Idea en 2 Minutos — Por Qué Este Sistema](#1-la-idea)
2. [Mapa Visual — Cómo Encaja Todo](#2-mapa-visual)
3. [Por Qué Cada Decisión (sin humo)](#3-por-que)
4. [Manual de Usuario — Lo Que Ves Cada Día](#4-manual-usuario)
5. [Manual del Instalador — De 0 a 100% Paso a Paso](#5-manual-instalador)
6. [El Triple Backup 3-2-1 — Tus 3 Seguros](#6-backup)
7. [El MiniPC — Tu Copia A y Tu Cerebro Local](#7-minipc)
8. [Actualizar Como Yo — 1 Click, Sin Miedo](#8-updates)
9. [Operación Diaria — 1 Minuto Cada Mañana](#9-operacion)
10. [Seguridad y Claves — Lo Que Nunca Debes Perder](#10-seguridad)
11. [Troubleshooting — Cuando Algo No Sale Verde](#11-troubleshooting)
12. [Checklists Firmables y Entrega](#12-checklists)
13. [Glosario y Referencias](#13-glosario)

---

## 1. La Idea en 2 Minutos — Por Qué Este Sistema <a id="1-la-idea"></a>

### El problema que teníamos

Un SaaS central (`*.palmerp.es` + 1 Supabase) es barato, pero te ata: si Vercel o Supabase fallan, todos caen; si un cliente quiere irse, no puedes darle su base; si Vercel sube precios, tú pagas por todos. Y no puedes ponerle un cerebro local (modelo que aprende de su negocio) sin exponer datos de otros.

### La solución que montamos

**Fleet independiente:** cada cliente tiene **su** GitHub (fork), **su** Vercel, **su** Supabase, **su** R2 y **su** MiniPC. Tú mantienes el repo base `palmerp` y cada `git push origin master` suyo despliega solo su ERP. Él paga su nube directo, tú pagas solo un bucket vault central.

**Triple Backup 3-2-1:** cada noche 02:00 se crean **2 artefactos** (`logical JSON` + `physical pg_dump`) cifrados **solo con su clave** y se guardan en **3 sitios**: A) disco MiniPC (7d), B) su R2 (30d), C) tu vault `palmerp-vault` (90d inmutable). Aunque Vercel y Supabase desaparezcan, tiene 2 copias fuera.

**Updates como tú:** el cliente ve en `/admin/settings/updates` el mismo semáforo que tú, con `v0.1.0 @ abc` vs `Palm-ERP/palmerp@master @ def`, `N commits por detrás`, y copia 7 comandos (Vercel) o 1 comando MiniPC (`npm run fleet:update`) que hace backup → merge → migrate → build → push. Si el build falla, no despliega.

> **En una frase:** es tu ERP, pero cada cliente duerme en su casa, con 3 llaves y la misma llave inglesa que tú para actualizar.

---

## 2. Mapa Visual — Cómo Encaja Todo <a id="2-mapa-visual"></a>

### 2.1 Fleet (una casa por cliente)

```
TÚ (Palm-ERP/palmerp)  ── GitHub Template ──►  CLIENTE-X (fork privado)
  git push master                                 git clone → npm ci → .env
     │  (tú publicas mejora)                     │
     │  git pull upstream master ───────────────►  git merge upstream/master → git push origin master ──► VERCEL CLIENTE-X
     │                                           │  ├─ Supabase cliente (DATABASE_URL pooler 6543)
     │                                           │  ├─ R2 cliente (CLIENT_BACKUP_S3_* → B 30d)
     │                                           │  ├─ Vault PalmerP (PALMERP_VAULT_R2_* → C 90d)
     │                                           │  └─ MiniPC /data/backups/palmerp (A 7d, siempre ON)
     │                                           │
     └─ control.palmerp.es ◄── heartbeat ────────┘  POST /api/fleet/backup-heartbeat cada noche
```

**Cada flecha es opcional:** si el cliente no te da acceso a su Vercel/Supabase, tú solo ves el semáforo (heartbeat). Si te añade como Member, puedes ayudar.

### 2.2 Backup 02:00

```
02:00 CET
  ├─ Vercel cron 30 2 * * * → GET /api/cron/daily-backups (logical JSON → gzip → AES-GCM solo clave cliente → sha256 → sube a A/B/C → BackupLog + AuditLog)
  └─ MiniPC systemd OnCalendar=02:00 → node scripts/backup-agent.mjs --once (logical + physical pg_dump → gzip → encrypt → sha256 → A/B/C → BackupLog)
       └─ vault nunca borra (inmutable 90d), A 7d y B 30d sí rotan
```

### 2.3 Update 1-click

```
TÚ: git push origin master en palmerp (bump package.json version)
        │
CLIENTE: /admin/settings/updates → ve "3 commits por detrás" (GET /api/admin/updates → src/lib/fleet/upstream.ts via GitHub API o git ls-remote)
        ├─ Vercel: copia 7 comandos → git push origin master → Vercel deploy
        └─ MiniPC: npm run fleet:update (= fleet-update.mjs --apply → backup → fetch → merge → npm ci → prisma migrate deploy → build → push → pm2 restart)
                └─ si build falla → no push; si merge conflicto → abort + stash pop
```

---

## 3. Por Qué Cada Decisión (sin humo) <a id="3-por-que"></a>

| Decisión | Por qué | Alternativa descartada y por qué no |
|---|---|---|
| **Fleet independiente (1 DB por cliente)** | Aislamiento real, GDPR limpio, cliente se puede ir con `pg_dump`, tú no pagas su tráfico, puedes ponerle MiniPC sin mezclar datos | Single-DB compartida: barata pero 1 bug filtra datos (`where tenantId` olvidado), backup por tenant es JSON no físico, no puedes darle su DB |
| **Vercel por cliente (no wildcard)** | Él paga su factura, su dominio, su env. Tú no eres cuello de botella. Cada `push` despliega solo él | Wildcard `*.palmerp.es` + 1 Vercel: 1 deploy para todos, 1 caída para todos, 1 env para todos |
| **Supabase pooler 6543 `?pgbouncer=true`** | Serverless Vercel necesita pooler transacción, si no agota conexiones | Direct 5432: funciona en local pero en Vercel peta con `too many connections` |
| **Triple Backup 3-2-1** | Regla de oro: 3 copias, 2 medios, 1 off-site. Si un R2 falla, quedan 2 | Solo R2: si Cloudflare falla o borras bucket, adiós |
| **A LOCAL en MiniPC** | No depende de internet, instantáneo, el dueño lo toca | Solo nube: si Vercel cae a las 02:00 no hay backup esa noche |
| **B R2 del cliente** | Él controla su segunda copia, no depende de ti | Solo tu vault: si tú desapareces, él no tiene nada |
| **C vault PalmerP 90d inmutable** | Tú garantizas 90 días aunque él borre B, y es tu prueba legal. Inmutable = ni él lo borra | Sin vault: si él borra A y B por error, no hay red |
| **Cifrado solo clave cliente** | Privacidad real: tú guardas `.enc` opaco, sin clave no abres. GDPR tranquilo | Clave compartida: tú puedes ver sus datos, él no quiere |
| **2 artefactos (logical + physical)** | Logical: ligero, restaura usuarios sin parar. Physical: clon exacto para reconstruir | Solo uno: si eliges solo logical, no hay secuencias; si solo physical, es pesado para un contacto |
| **02:00 CET** | Hora valle, menos pedidos, menos locks | 23:30: coincide con cron viejo, más carga |
| **MiniPC siempre ON** | Garantiza A y physical cada noche, y alberga el modelo local | MiniPC apagable: esa noche no hay A ni physical (amarillo) |
| **Updates como tú (git upstream)** | 1 flujo, 1 verdad. Cliente aprende tu oficio, no depende de deploy mágico | Deploy central: tú actualizas a todos sin que sepan, riesgoso |
| **Backup previo antes de update** | Si update rompe, restauras `logical` de esa noche | Update sin backup: si falla migration, no hay vuelta |
| **Build antes de push** | Si `tsc` o `build` fallan, no despliegas roto | Push directo: Vercel falla en producción |

---

## 4. Manual de Usuario — Lo Que Ves Cada Día <a id="4-manual-usuario"></a>

> Si eres dueño, lee solo este capítulo. No toques `.env` ni MiniPC si no te apetece.

### 4.1 Entrar

1. Abre `https://tu-dominio.vercel.app/login`
2. Email + contraseña (te la dio el instalador)
3. Entrar → `/admin` (dashboard, contactos, ventas, etc.)

### 4.2 Lo que ves cada mañana (1 minuto, café en mano)

No abras 3 consolas. Mira un semáforo:

- **`/admin/settings/updates` → arriba** o **`GET /api/fleet/backup-heartbeat`**
  - **Verde** (<24h): todo guardado en 3 sitios, al día
  - **Amarillo** (24-48h o 2 destinos): revisa, lanza backup manual (pide al instalador: `curl -H "Bearer $CRON_SECRET" /api/cron/daily-backups`)
  - **Rojo** (>48h): llama hoy. Mira MiniPC encendido y credenciales R2

- **`/admin/settings` → tarjeta “Actualizaciones Fleet” → “Abrir Actualizaciones”** lleva a `/admin/settings/updates`. Ahí ves versión `v0.1.0` vs upstream, commits por detrás y último backup.

Si ves verde, cierra y trabaja.

### 4.3 Si borras algo sin querer (tranquilo)

Pide al instalador que restaure **lógico** de anoche (no borra, solo añade lo que falta):

1. Él entra a `/api/admin/restore?tenantId=xxx` y elige `*.logical.json.gz.enc` de ayer
2. Lo descarga del MiniPC (`/data/...`) o tu R2 o vault `vault/tenants/...`
3. Hace `dryRun:true` → ves preview `{users:3, contacts:120}`
4. Si ok, `dryRun:false` → `restoredUsers: 2`

Si hay que reconstruir todo (raro), es **físico** `*.physical.sql.gz.enc` del MiniPC/vault → `psql "$DATABASE_URL" < dump.sql` en staging primero.

### 4.4 Pedir una actualización (como la mía)

1. Entra a **Ajustes → Actualizaciones** → `Comprobar`
2. Si sale “3 commits por detrás” → copia el bloque **Vercel** (7 líneas) si tu ERP está en Vercel, o **MiniPC** (`npm run fleet:update`) si es on-premise
3. Pega en tu portátil (Vercel) o SSH al MiniPC, ejecuta, espera `Build OK` y `Push OK` → Vercel despliega en 1-2 min
4. Vuelve a `Actualizaciones` → debe poner “Al día” verde

> **Tú no rompes nada:** si el build falla, no se despliega. Siempre hay backup de esa noche.

---

## 5. Manual del Instalador — De 0 a 100% Paso a Paso <a id="5-manual-instalador"></a>

> Si eres técnico o IA, este es tu contrato. Cada paso tiene comando literal y salida esperada. No avances si falla.

### 5.0 Mapa rápido

```
0 Pre-requisitos (5 min) → 1 GitHub fork + upstream (2 min) → 2 Supabase (3 min) → 3 Claves (1 min)
→ 4 .env (3 min) → 5 npm ci + prisma + provision (4 min) → 6 Vercel import (3 min)
→ 7 MiniPC agente (5 min) → 8 Verificación (4 min) → 9 Handover (2 min)
```

### 5.1 Pre-requisitos

Marca antes de tocar teclado:

- [ ] GitHub del cliente (crear repo privado ok)
- [ ] Vercel Team del cliente (o crea en tu Team y transfiere)
- [ ] Supabase project (region `eu-central-1` si España)
- [ ] **Cloudflare R2 cliente** (Account ID + bucket `cliente-backups` + Access Key/Secret) destino B 30d — **10 GB gratis, 0 € egress** (ver §5.3b)
- [ ] **Cloudflare R2 PalmerP** (tu cuenta, bucket `palmerp-vault`) destino C 90d inmutable — mismo R2 gratis
- [ ] MiniPC Ubuntu 22/24, Node ≥20.9, 50GB disco, siempre enchufado, SSH
- [ ] Datos: `slug` (`bodega-lopez`), `name`, `adminName`, `adminEmail`, `domain`
- [ ] Herramientas tu portátil: `node -v ≥20.9`, `npm -v`, `git --version`, `openssl`, `curl`, `jq`

Verifica:

```bash
node -v
npm -v
git --version
openssl version
```

### 5.2 GitHub — Fork + upstream

**Template (recomendado):** `https://github.com/Palm-ERP/palmerp` → **Use this template → Create a new repository** (cliente-x, Private, sin “Include all branches”).

**Si no es template:**

```bash
git clone https://github.com/Palm-ERP/palmerp.git cliente-x
cd cliente-x
git remote remove origin
gh repo create cliente-x --private --source=. --remote=origin --push
```

**Upstream (siempre):**

```bash
git remote add upstream https://github.com/Palm-ERP/palmerp.git
git remote -v  # origin (cliente) + upstream (tú)
```

*Cuando publiques mejora:* `git fetch upstream && git merge upstream/master --no-edit && git push origin master` → Vercel cliente despliega solo.

### 5.3 Supabase — DB pooler

1. Supabase → New Project → `cliente-x`, `eu-central-1`, password fuerte → espera 2 min
2. Project Settings → Database → **Connection string → URI → Pooler** 6543 `?pgbouncer=true` → copia:

```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Guárdala como `DATABASE_URL`. Fleet = 1 DB por cliente (no Single-DB).

Prueba:

```bash
psql "postgresql://..." -c "select 1"  # → 1
```

### 5.3b Cloudflare R2 — 10 GB Gratis, 0 € Egress (para B y C)

> **Por qué R2:** `src/lib/storage.ts:3` y `src/lib/backup/storage-provider.ts:11` usan `S3Client` con `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`. R2 da **10 GB storage gratis + 0 € por descarga** (`hosting_and_business_strategy.md:113`). 2-10 MB/noche × 90 días = 0.2-0.9 GB → gratis. **B** = R2 del cliente (30d), **C** = tu vault `palmerp-vault` (90d inmutable). Sin R2, backup marca `not configured`.

**1) Crear cuenta (2 min):** `https://dash.cloudflare.com/sign-up` → email+pass → verifica → plan **Free** (0 €). Para R2 pedirá tarjeta pero no cobra los 10 GB. Copia tu **Account ID** (arriba derecha, URL `.../accounts/<ACCOUNT_ID>`).

**2) Activar R2 y buckets (2 min):** Menú **R2 Object Storage → Enable R2 → Create bucket** dos veces:
- Cliente (B): Name `cliente-backups` (o `cliente-x-backups`), Location `Automatic`, **Create**
- Vault PalmerP (C) en tu cuenta: Name `palmerp-vault`, Location `Automatic`
> Recomendado separar: B en cuenta del cliente (él paga), C en tu cuenta (tú pagas vault). En cada bucket → Settings → `Public access: Not public`.

**3) Crear API Tokens (2 min por cuenta):** R2 → **Manage R2 API Tokens → Create API Token** → Name `palmerp-backup-cliente-x`, Permissions `Admin` (o `Object Read & Write`), TTL Forever → **Create** → copia **Access Key ID** (32 chars) y **Secret Access Key** (64 hex) — no se muestran de nuevo.
Guarda: `R2_ACCOUNT_ID` (Account ID), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

**4) Gratis verificado:** R2 → Overview → `Storage: 10 GB / 10 GB Free` + egress 0 €. Tus backups son céntimos.

**5) Prueba sin esperar 02:00:** `npm run backup:agent` debe decir `[CLIENT_STORAGE] uploaded` y `[VAULT] uploaded` (no `not configured`). Si dice `not configured`, revisa Account ID y keys.

**.env para 5.5:**

```ini
# B — R2 cliente (su cuenta, Cloudflare 10GB gratis)
CLIENT_BACKUP_S3_ENDPOINT="https://<ACCOUNT_ID_CLIENTE>.r2.cloudflarestorage.com"
CLIENT_BACKUP_S3_BUCKET="cliente-backups"
CLIENT_BACKUP_S3_ACCESS_KEY="<Access Key cliente>"
CLIENT_BACKUP_S3_SECRET_KEY="<Secret cliente>"
# C — Vault PalmerP (tu cuenta R2)
PALMERP_VAULT_R2_ACCOUNT_ID="<ACCOUNT_ID_PALMERP>"
PALMERP_VAULT_R2_ACCESS_KEY_ID="<Access Key vault>"
PALMERP_VAULT_R2_SECRET_ACCESS_KEY="<Secret vault>"
PALMERP_VAULT_R2_BUCKET_NAME="palmerp-vault"
```

### 5.4 Claves — genera una vez

```bash
openssl rand -base64 32 | tr -d '\n' ; echo  # BACKUP_ENCRYPTION_KEY (44 chars, SOLO cliente, QR en caja fuerte)
openssl rand -base64 32 | tr -d '\n' ; echo  # NEXTAUTH_SECRET
openssl rand -base64 32 | tr -d '\n' ; echo  # CRON_SECRET
openssl rand -base64 32 | tr -d '\n' ; echo  # FLEET_API_KEY
# Admin password: crypto.randomBytes(12).toString('base64url') o elige
```

No van a Git. `.gitignore` ignora `.env*`.

### 5.5 .env — todas las vars

```bash
cd cliente-x
cp .env.example .env.local
nano .env.local
```

**Mínimo:**

```ini
NEXTAUTH_URL="https://cliente-x.vercel.app"
NEXTAUTH_SECRET="..."
DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true"
PALMERA_PLATFORM_URL="https://cliente-x.vercel.app"
PALMERA_INSTANCE_SLUG="cliente-x"
PALMERA_INSTANCE_NAME="Cliente X S.L."
PALMERA_INSTANCE_DOMAIN="cliente-x.palmerp.es"
PALMERA_INSTANCE_ADMIN_NAME="Ana López"
PALMERA_INSTANCE_ADMIN_EMAIL="ana@cliente.es"
PALMERA_INSTANCE_ADMIN_PASSWORD="Cambia123!"
PALMERA_INSTANCE_TIMEZONE="Europe/Madrid"
PALMERA_INSTANCE_MODES="VENTAS,RESTAURANTE"
BACKUP_ENCRYPTION_KEY="...44chars..."
BACKUP_LOCAL_DIR="/data/backups/palmerp"
CLIENT_BACKUP_S3_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
CLIENT_BACKUP_S3_BUCKET="cliente-backups"
CLIENT_BACKUP_S3_ACCESS_KEY="..."
CLIENT_BACKUP_S3_SECRET_KEY="..."
CLIENT_BACKUP_S3_REGION="auto"
PALMERP_VAULT_R2_ACCOUNT_ID="...tu vault..."
PALMERP_VAULT_R2_ACCESS_KEY_ID="..."
PALMERP_VAULT_R2_SECRET_ACCESS_KEY="..."
PALMERP_VAULT_R2_BUCKET_NAME="palmerp-vault"
CRON_SECRET="..."
FLEET_API_KEY="..."
PALMERP_CONTROL_URL="https://control.palmerp.es"
PALMERP_UPSTREAM_REPO="Palm-ERP/palmerp"
PALMERP_UPSTREAM_BRANCH="master"
# GITHUB_TOKEN="ghp_..." # solo si palmerp privado
```

Replica **exacto** en Vercel → Settings → Environment Variables (Production). No subas `.env.local`.

| Var | Dónde | Si falta |
|---|---|---|
| `DATABASE_URL` pooler 6543 | Vercel+MiniPC | migrate falla, backup no guarda |
| `BACKUP_ENCRYPTION_KEY` | Vercel+MiniPC | gz sin cifrar, restore `auth failed` |
| `CLIENT_BACKUP_S3_*` | Vercel+MiniPC | B `not configured`, `PARTIAL` |
| `PALMERP_VAULT_R2_*` | Vercel+MiniPC | C `not configured` |
| `CRON_SECRET` | Vercel | 401 en `/api/cron/daily-backups` |
| `PALMERP_UPSTREAM_REPO` | Vercel+MiniPC | check updates usa default `Palm-ERP/palmerp` |

### 5.6 Instalar y provisionar

```bash
npm ci --legacy-peer-deps            # added packages OK
npx prisma generate                  # ✔ Generated Prisma Client
npx prisma migrate deploy            # 3 migrations applied (o No pending)
# o npx prisma db push si no hay migrations
npm run instance:provision -- \
  --slug cliente-x --name "Cliente X S.L." --domain cliente-x.palmerp.es \
  --admin-name "Ana López" --admin-email ana@cliente.es --admin-password "Cambia123!"
# → Tenant seeded ... Slug: cliente-x

# Atajo 100%:
node scripts/template-bootstrap.mjs  # interactivo: slug/name/email/domain/modos → genera .env + claves + provisiona
```

Verifica local:

```bash
npx tsc --noEmit --skipLibCheck  # sin output = OK
npm run build                     # ✓ Compiled 67 rutas
./init.sh                         # [OK] Entorno listo
npm run dev                       # http://localhost:3000
# login: ana@cliente.es / Cambia123! en cliente-x.localhost:3000/login
```

### 5.7 Vercel — import + auto-deploy

1. vercel.com → Add New Project → Import `cliente/cliente-x` → Framework Next.js, Build `prisma generate && next build`, Install `npm ci --legacy-peer-deps` → Add Environment Variables (las del §5.5, Production) → Deploy → Visit
2. Settings → Domains → Add `cliente.es` → DNS
3. Settings → Cron Jobs → verifica `30 2 * * * /api/cron/daily-backups` (no cambies sin cambiar MiniPC)
4. Prueba deploy:

```bash
git commit --allow-empty -m "test deploy" && git push origin master  # Deployments verde 1-2 min
```

### 5.8 MiniPC — agente 02:00

**OS:**

```bash
ssh mini@192.168.1.50
sudo apt update && sudo apt install -y nodejs npm postgresql-client git curl jq
node -v  # ≥20.9
pg_dump --version
sudo mkdir -p /data/backups/palmerp && sudo chown $USER:$USER /data/backups/palmerp
```

**Repo + env:**

```bash
git clone https://github.com/cliente/cliente-x.git /opt/palmerp
cd /opt/palmerp && npm ci --legacy-peer-deps
cp .env.example .env && nano .env  # pega MISMAS vars que Vercel
grep -E "DATABASE_URL|BACKUP_|PALMERP_UPSTREAM" .env
```

**Prueba manual:**

```bash
npm run backup:agent  # o node scripts/backup-agent.mjs --once
# [agent][LOCAL] wrote /data/.../daily/*.logical.json.gz.enc 4KB
# [agent][CLIENT_STORAGE] uploaded ...
# [agent][VAULT] uploaded vault/...
# [agent] done cliente-x logical ... phys yes

ls -lh /data/backups/palmerp/tenants/*/daily/  # 2 .enc de hoy
```

**Systemd 02:00:**

```bash
sudo cp scripts/systemd/palmerp-backup.* /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now palmerp-backup.timer
systemctl list-timers | grep palmerp  # 02:00
sudo systemctl start palmerp-backup.service && journalctl -u palmerp-backup.service -n 50 --no-pager  # all done
```

### 5.9 Verificación — no entregues sin esto

```bash
npx prisma generate && npx tsc --noEmit --skipLibCheck && npm run build && ./init.sh  # todo [OK]

curl -H "Authorization: Bearer $CRON_SECRET" https://cliente-x.vercel.app/api/cron/daily-backups | jq .summary
# {success:1, partial:0, failed:0} + 3 destinos success + logical (physical solo MiniPC normal)

npm run backup:agent && ls -lh /data/backups/palmerp/tenants/*/daily/ && echo LOCAL_OK

curl -H "Authorization: Bearer $FLEET_API_KEY" https://control.palmerp.es/api/fleet/backup-heartbeat | jq .status
# [{slug:"cliente-x", color:"green", ageHours:<24}]

npm run fleet:check  # Al día o N commits por detrás
curl https://cliente-x.vercel.app/api/admin/updates | jq .reason  # Al día
open https://cliente-x.vercel.app/admin/settings/updates  # semáforo verde
open https://cliente-x.vercel.app/login  # ana@cliente.es entra a /admin
```

Si falla, §11.

---

## 6. El Triple Backup 3-2-1 — Tus 3 Seguros <a id="6-backup"></a>

### Qué guarda

- **Logical JSON** (`*.logical.json.gz.enc`): foto filtrada por `tenantId` (Tenant, Users, Contacts, Shops, Orders, AuditLogs). Restauras usuarios/contactos sin parar.
- **Physical pg_dump** (`*.physical.sql.gz.enc`): clon exacto SQL (tablas, keys, secuencias). Solo MiniPC (Vercel no tiene `pg_dump`). Reconstruyes todo.

Ambos: `JSON/SQL → gzip → AES-GCM (iv12+tag16+cipher) solo clave cliente → sha256 → BackupLog + AuditLog`.

### Dónde

| Destino | Dónde | Retención | Si Vercel cae a las 02:00 |
|---|---|---|---|
| A LOCAL | `/data/backups/palmerp/tenants/<id>/daily/` MiniPC | 7 días | ✅ Sigue (MiniPC directo a Supabase) |
| B Tu nube | `CLIENT_BACKUP_S3_*` bucket tuyo | 30 días | ✅ Vía MiniPC |
| C Vault PalmerP | `PALMERP_VAULT_R2_*` `vault/tenants/...` inmutable | 90 días | ✅ Vía MiniPC |

**Código:** `src/lib/backup/crypto.ts:1` (solo `BACKUP_ENCRYPTION_KEY`), `storage-provider.ts:1` (3 providers), `runner.ts:1` (logical+physical+retención), `daily-backups/route.ts:1` (cron 02:30), `backup-agent.mjs:1`.

---

## 7. El MiniPC — Tu Copia A y Tu Cerebro Local <a id="7-minipc"></a>

Siempre ON. Dos roles:

1. **Guardián backup físico** (único que crea `physical`). Si Vercel cae, él salva la noche.
2. **Cerebro local** (próximo): Ollama (`OLLAMA_BASE_URL`) + vector DB que aprende de tu negocio (pedidos, contactos) sin enviar datos fuera. Nightly ETL → embeddings → `/api/insights`.

Sin MiniPC: esa noche no hay A ni physical (amarillo).

---

## 8. Actualizar Como Yo — 1 Click, Sin Miedo <a id="8-updates"></a>

**Principio:** cliente actualiza igual que tú. Un flujo, una verdad.

**Tú publicas:** `package.json version 0.1.0 → 0.2.0` + `git push origin master` en `Palm-ERP/palmerp`.

**Cliente ve:** `/admin/settings/updates` → `GET /api/admin/updates` → `src/lib/fleet/upstream.ts:1` (GitHub API o `git ls-remote`, `git rev-list --count HEAD..FETCH_HEAD`, semver `compareSemver`) → `N commits por detrás` + backup age + último update. Semáforo amarillo → acción.

**Vercel (7 líneas, copia/pega):**

```bash
git fetch upstream
git merge upstream/master --no-edit --no-ff
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build
git push origin master  # Vercel despliega
```

**MiniPC (1 comando):**

```bash
npm run fleet:update  # = node scripts/fleet-update.mjs --apply
# --check (solo informa), --dry-run (simula), --force (aunque al día)
# hace: backup → fetch → merge → npm ci → migrate → tsc+build → push → pm2 restart
```

Seguridad: no push si `build` falla; `merge --abort` + stash pop si conflicto; `GITHUB_TOKEN` si tu repo privado; `PALMERP_UPSTREAM_REPO` en `.env`.

**APIs:** `src/app/api/admin/updates/route.ts:1`, `src/app/api/fleet/check-update/route.ts:1`, `src/lib/fleet/version.ts:1`.

---

## 9. Operación Diaria — 1 Minuto Cada Mañana <a id="9-operacion"></a>

1. Abre `/admin/settings/updates` o `curl /api/fleet/backup-heartbeat | jq .status` → verde = sigue
2. Si amarillo 24-48h: `curl -H "Bearer $CRON_SECRET" /api/cron/daily-backups` o `npm run backup:agent` en MiniPC
3. Si rojo >48h: MiniPC encendido? `systemctl status palmerp-backup.timer`, `pg_dump --version`, `env | grep BACKUP`, `journalctl -u palmerp-backup.service`

Logs: `BackupLog` (tenantId, destination, fileKey, checksum, size, encrypted, status) + `AuditLog BACKUP_RUN`.

---

## 10. Seguridad y Claves — Lo Que Nunca Debes Perder <a id="10-seguridad"></a>

- `BACKUP_ENCRYPTION_KEY` 44 chars base64: **solo cliente**, vault guarda `.enc` opaco. Pierdes clave → `auth failed` forever. Guarda en Vercel Env + MiniPC `.env` + papel QR caja fuerte + NAS cifrado.
- `NEXTAUTH_SECRET`, `CRON_SECRET`, `FLEET_API_KEY`: `openssl rand -base64 32`.
- `.env*` nunca a Git (`.gitignore`). En Vercel, Production.
- RLS: `tenant_id = current_setting('app.tenant_id')` + `where tenantId` siempre + `withTenantContext` transaccional.
- Vault 90d inmutable: lifecycle R2, no `delete` desde cliente (`storage-provider.ts` no-op para VAULT).

---

## 11. Troubleshooting — Cuando Algo No Sale Verde <a id="11-troubleshooting"></a>

| Error | Causa | Fix |
|---|---|---|
| `Can't find DATABASE_URL` | `.env` no cargado | `cp .env.example .env.local` |
| `P1001 Can't reach` | pooler 5432 sin `?pgbouncer=true` | usa 6543 pooler |
| `Ya existe slug` | Tenant existe | `npx prisma studio` borra o nuevo slug |
| `401` en cron | `CRON_SECRET` mal | Vercel Env = header Bearer |
| `not configured` B/C | `*_S3_*` / `PALMERP_VAULT_*` vacías | rellena Vercel+MiniPC y redeploy |
| Solo `LOGICAL` en Vercel | normal | physical solo MiniPC |
| `BACKUP_ENCRYPTION_KEY no configurada` | `.env` MiniPC vacío | copia de Vercel |
| `pg_dump not available` | `postgresql-client` no instalado | `apt install postgresql-client` |
| `auth failed` restore | clave distinta | usa clave con que se cifró |
| `TenantMismatch` /admin | token slug ≠ subdominio | `cliente-x.localhost:3000` o `cliente-x.vercel.app` |
| `git push` no despliega | Vercel no conectado | Import Git Repository debe ser fork cliente, branch `master` |
| `fleet:check` siempre 1 commit por detrás | local sin fetch | `git fetch upstream` o revisa `PALMERP_UPSTREAM_REPO` |

Logs:

```bash
vercel logs cliente-x.vercel.app --follow
journalctl -u palmerp-backup.service -n 100 --no-pager
ls -lh /data/backups/palmerp/tenants/*/daily/
npx prisma studio
```

---

## 12. Checklists Firmables y Entrega <a id="12-checklists"></a>

### Instalador (marca antes de irte)

```
☐ Clave BACKUP_ENCRYPTION_KEY en 4 sitios (Vercel, MiniPC, QR papel, NAS)
☐ DATABASE_URL pooler 6543 psql select 1 OK
☐ npx prisma generate + migrate deploy OK
☐ npm run build 67 rutas + ./init.sh [OK] + tsc OK
☐ Vercel import, branch master, auto-deploy git push OK
☐ Cron 02:30 visible
☐ MiniPC /data/backups ok, pg_dump OK, backup:agent 2 .enc + B/C OK
☐ systemd timer 02:00 enable --now OK
☐ curl cron → success 3 destinos
☐ heartbeat verde <24h
☐ restore dryRun:true OK
☐ upstream git remote -v (origin+upstream)
☐ updates /admin/settings/updates verde o N commits, fleet:check OK
☐ Handover: PDF + QR + accesos Vercel/Supabase/GitHub
☐ Cliente sabe: push despliega, fetch upstream, semáforo 1 min, updates 1-click como tú
Instalador: __________ Fecha: ______ Firma: ______
Cliente:    __________ Fecha: ______ Firma: ______
```

### Entrega al cliente

- `docs/Manual-PalmerP-Triple-Backup-Fleet.pdf` (dueño, sin tecnicismos)
- QR `BACKUP_ENCRYPTION_KEY` + `NEXTAUTH_SECRET` sobre cerrado
- Invites Vercel Team + Supabase Org + GitHub repo como ADMIN
- URLs `https://cliente-x.vercel.app` + `/admin` + `control.palmerp.es`
- Frase: *“Si ves verde cada mañana y guardas la clave en caja fuerte, estás cubierto aunque falle Vercel o Supabase. Yo veo el vault pero no puedo abrirlo sin ti. Actualizas como yo en /admin/settings/updates.”*

---

## 13. Glosario y Referencias <a id="13-glosario"></a>

| Término | Qué es |
|---|---|
| Fleet | Una casa por cliente (GitHub+Vercel+Supabase+R2+MiniPC) vs Single-DB compartida |
| Upstream | Tu `Palm-ERP/palmerp` base (template) |
| Logical JSON | JSON filtrado `tenantId` → gzip+encrypt, Vercel+MiniPC |
| Physical pg_dump | `pg_dump --no-owner` → gzip+encrypt, solo MiniPC |
| Vault inmutable | R2 `palmerp-vault` 90d, sin delete desde cliente |
| Fleet update | `git fetch upstream && merge && npm ci && migrate && build && push` |

**Referencias archivo:línea:** `package.json:1`, `vercel.json:1`, `prisma/schema.prisma:1`, `src/lib/db.ts:1`, `src/lib/backup/*:1`, `src/lib/fleet/*:1`, `src/app/api/cron/daily-backups/route.ts:1`, `src/app/api/admin/updates/route.ts:1`, `scripts/*:1`, `docs/TEMPLATE-INSTALADOR.md:1`, `docs/architecture.md`.

---

*PalmerP — Hecho con mimo en Europa — 2026*
