# TEMPLATE INSTALADOR — PalmerP Fleet Independiente
## Manual 100% para el Agente que Instala (IA o Humano)

> **Objetivo:** que cualquier agente (tú, otro técnico o una IA) pueda instalar PalmerP para un cliente **sin preguntar nada**, desde cero hasta backup verificado. Si falta un paso aquí, es un bug del template.

**Versión:** 1.1 — 15 Sept 2026  
**Stack:** Next.js 16.2.6 + Prisma 7.8.0 + pg + Supabase pooler 6543 + Vercel Cron + R2/S3 + systemd MiniPC siempre ON  
**Backup:** 3-2-1 (A LOCAL 7d / B R2 cliente 30d / C Vault PalmerP 90d inmutable), 02:00 CET, 2 artefactos (logical JSON + physical pg_dump), cifrado solo `BACKUP_ENCRYPTION_KEY`  
**Updates:** 1-click como tú (`/admin/settings/updates` + `scripts/fleet-update.mjs --apply`), con backup previo + `prisma migrate deploy` + `build` verificado

---

## Índice

1. [Mapa Mental en 30 Segundos](#1-mapa-mental)
2. [Pre-requisitos Exactos](#2-pre-requisitos)
3. [Crear el Fork/Template (GitHub)](#3-github)
4. [Crear Supabase (DB)](#4-supabase)
5. [Generar Claves (una vez)](#5-claves)
6. [Configurar .env (todas las vars explicadas)](#6-env)
7. [Instalar y Provisionar (comandos literales)](#7-provisionar)
8. [Conectar Vercel (auto-deploy)](#8-vercel)
9. [Instalar MiniPC Agente 02:00](#9-minipc)
10. [Verificación Obligatoria (no entregues sin esto)](#10-verificacion)
11. [Restaurar (dryRun)](#11-restaurar)
12. [Fleet: Upstream, Updates 1-click y Modos](#12-fleet)
13. [Actualizar como tú (cliente 1-click)](#13-updates)
14. [Handover al Cliente (qué entregas)](#14-handover)
15. [Troubleshooting (error → causa → fix)](#15-troubleshooting)
16. [Checklist Final Firmable](#16-checklist)

---

## 1. Mapa Mental <a id="1-mapa-mental"></a>

```
REPO BASE (tú)  ── GitHub Template ──►  REPO CLIENTE (fork)
     │                                      │  git push main ──► Vercel cliente (auto-deploy)
     │  git pull upstream main              │
     │  (tú publicas mejoras)               ├──► Supabase cliente (DATABASE_URL pooler 6543)
     │                                      ├──► R2 cliente (CLIENT_BACKUP_S3_* → 30d)
     │                                      ├──► Vault PalmerP (PALMERP_VAULT_R2_* → 90d inmutable)
     │                                      └──► MiniPC /data/backups/palmerp (LOCAL 7d, siempre ON)
```

**Cada cliente paga su Vercel + Supabase + R2.** Tú pagas solo el Vault central. Si Vercel cae a las 02:00, el MiniPC igualmente guarda en 3 sitios.

**Vercel cron:** `vercel.json` → `30 2 * * *` → `GET /api/cron/daily-backups` (logical JSON + 3 destinos)  
**MiniPC agente:** `scripts/backup-agent.mjs --once` vía `systemd` `OnCalendar=02:00` (logical + physical)

---

## 2. Pre-requisitos Exactos <a id="2-pre-requisitos"></a>

Marca antes de tocar teclado. Si falta uno, para.

- [ ] **GitHub:** cuenta del cliente con permiso para crear repo privado (o tu org)
- [ ] **Vercel:** acceso al Team del cliente (o crea proyecto en tu Team y transfiere)
- [ ] **Supabase:** proyecto nuevo (elige `eu-central-1` si cliente en España, pooler `6543`)
- [ ] **Cloudflare R2 (cliente):** Account ID + bucket `cliente-backups` + Access Key (para destino B)
- [ ] **Cloudflare R2 (PalmerP):** Account ID + bucket `palmerp-vault` (para destino C, tu cuenta)
- [ ] **MiniPC:** Ubuntu 22.04/24.04, 2GB RAM mínimo, disco 50GB+, siempre enchufado, acceso SSH
- [ ] **Dominio:** `cliente.es` o `cliente.palmerp.es` (para `NEXTAUTH_URL` y Vercel Domain)
- [ ] **Datos cliente:** `slug` (ej. `bodega-lopez`), `name` (`Bodega López S.L.`), `adminName`, `adminEmail`

**Herramientas en tu portátil:** `node >=20.9`, `npm`, `git`, `openssl`, `psql` (opcional), `curl`, `jq`

Verifica:

```bash
node -v   # >=20.9.0
npm -v
git --version
openssl version
```

---

## 3. Crear el Fork/Template (GitHub) <a id="3-github"></a>

### 3.1 Si este repo ya está marcado como Template (recomendado)

1. Ve a `https://github.com/tu/palmerp` → botón verde **`Use this template` → Create a new repository**
2. Owner: cliente (o tu org), Name: `cliente-x`, Private: ✅
3. **No marques** "Include all branches" (solo `main`)

### 3.2 Si no está marcado como Template

```bash
git clone https://github.com/tu/palmerp.git cliente-x
cd cliente-x
git remote remove origin
gh repo create cliente-x --private --source=. --remote=origin --push
# o manual: crea repo vacío en GitHub y:
git remote add origin https://github.com/cliente/cliente-x.git
git push -u origin main
```

### 3.3 Configurar upstream (para recibir tus mejoras)

**En el repo del cliente, ejecuta:**

```bash
git remote add upstream https://github.com/tu/palmerp.git
git remote -v  # debe mostrar origin (cliente) y upstream (tú)
```

**Cuando tú publiques una mejora en `palmerp/main`:**

```bash
# En el repo del cliente:
git fetch upstream
git merge upstream/main --no-edit
git push origin main  # Vercel del cliente despliega auto
```

> **Agente:** deja este `upstream` configurado siempre. Documenta en README del cliente.

---

## 4. Crear Supabase (DB) <a id="4-supabase"></a>

1. `https://supabase.com` → New Project → Name `cliente-x`, Region `eu-central-1`, Password fuerte
2. Espera 2 min → `Project Settings → Database → Connection string → URI` (pulsa **Pooler**, puerto **6543**, `?pgbouncer=true`)
3. Copia algo así:

```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

4. **Guárdala** como `DATABASE_URL`. Es la única DB (Fleet: una DB por cliente, no Single-DB compartida).

**No uses** `PALMERA_PLATFORM_DATABASE_URL` (legacy Single-DB). En Fleet cada cliente tiene su `DATABASE_URL` directa.

Verifica conectividad:

```bash
psql "postgresql://..." -c "select 1"
# debe devolver 1
```

---

## 4b. Crear Cloudflare R2 (10 GB Gratis, 0 € Egress) — Para Backups B y C <a id="4b-cloudflare"></a>

> **Por qué Cloudflare R2:** usamos R2 (`src/lib/storage.ts:3`, `src/lib/backup/storage-provider.ts:11` con `S3Client` endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`) porque da **10 GB gratis + 0 € por descarga** (`hosting_and_business_strategy.md:113`). Ideal para backups `*.enc` 2-10 MB/noche → 90 días son céntimos. Destino **B** = R2 del cliente (30d), **C** = tu R2 vault `palmerp-vault` (90d inmutable). Sin R2, el backup marca `not configured`.

### Paso 1 — Crear cuenta Cloudflare (2 min, gratis)

1. Ve a `https://dash.cloudflare.com/sign-up` → email + password → verifica email
2. Plan: elige **Free** (0 €). No pide tarjeta para empezar, pero para R2 pedirá añadir método de pago (no cobra los 10 GB gratis).
3. Entra a `https://dash.cloudflare.com` → arriba a la derecha copia tu **Account ID** (32 hex, visible en URL `.../accounts/<ACCOUNT_ID>` o en Overview → Account ID)

### Paso 2 — Activar R2 y crear buckets (2 min)

1. Menú izquierdo → **R2 Object Storage** → **Enable R2** (si pide tarjeta, añádela; sigue en Free, 10 GB no se cobran)
2. **Create bucket** (dos veces):
   - **Cliente (B):** Name `cliente-backups` (o `cliente-x-backups`), Location `Automatic`, **Create bucket**
   - **Vault PalmerP (C) — en tu cuenta PalmerP:** Name `palmerp-vault`, Location `Automatic`, **Create bucket**
   > Si creas ambos en la misma cuenta cliente, vale, pero recomendado separar: **B en cuenta del cliente** (él paga su R2) y **C en tu cuenta PalmerP** (tú pagas vault).
3. Entra a cada bucket → **Settings** → confirma `Public access: Not public` (backups nunca públicos)

### Paso 3 — Crear API Tokens R2 (Access Key + Secret) (2 min por cuenta)

Por cada cuenta (cliente y vault):

1. R2 → **Manage R2 API Tokens** (arriba derecha) → **Create API Token**
2. **Token name:** `palmerp-backup-cliente-x` (o `palmerp-vault`)
3. **Permissions:** `Admin` (o al menos `Object Read & Write` sobre el bucket) + **TTL: Forever**
4. **Create** → copia **Access Key ID** (32 chars) y **Secret Access Key** (64 hex) → **no se vuelven a mostrar**
5. Guarda:
   - `R2_ACCOUNT_ID` = Account ID del dashboard
   - `R2_ACCESS_KEY_ID` = Access Key ID del token
   - `R2_SECRET_ACCESS_KEY` = Secret Access Key del token
   - `R2_BUCKET_NAME` = `cliente-backups` (B) o `palmerp-vault` (C)

### Paso 4 — Verificar 10 GB Gratis

- R2 → **Overview** → ves `Storage: 10 GB / 10 GB Free` + `Class A operations 1M/mes gratis` → tus backups 2-10 MB/noche × 90 días = 0.2-0.9 GB → **gratis**.
- Egress (descarga) en R2 es **0 €** (vs AWS S3 que cobra). Por eso hosting_and_business_strategy dice 0 € aunque 1M descarguen.

### Paso 5 — Rellena .env (ver §6)

En **Vercel Env + MiniPC `.env`** (ver §6.1) pondrás dos bloques:

```ini
# B — R2 del cliente (su cuenta)
CLIENT_BACKUP_S3_ENDPOINT="https://<ACCOUNT_ID_CLIENTE>.r2.cloudflarestorage.com"
CLIENT_BACKUP_S3_BUCKET="cliente-backups"
CLIENT_BACKUP_S3_ACCESS_KEY="<Access Key cliente>"
CLIENT_BACKUP_S3_SECRET_KEY="<Secret cliente>"

# C — Vault PalmerP (tu cuenta)
PALMERP_VAULT_R2_ACCOUNT_ID="<ACCOUNT_ID_PALMERP>"
PALMERP_VAULT_R2_ACCESS_KEY_ID="<Access Key vault>"
PALMERP_VAULT_R2_SECRET_ACCESS_KEY="<Secret vault>"
PALMERP_VAULT_R2_BUCKET_NAME="palmerp-vault"
```

Prueba sin esperar a las 02:00: `npm run backup:agent` → debe decir `[CLIENT_STORAGE] uploaded` y `[VAULT] uploaded` (no `not configured`). Si sale `not configured`, revisa Account ID y keys.

---

## 5. Generar Claves (una vez) <a id="5-claves"></a>

**Ejecuta una vez, copia y guarda en 4 sitios** (Vercel Env + MiniPC .env + papel QR caja fuerte + NAS cifrado). Si pierdes `BACKUP_ENCRYPTION_KEY`, el `.enc` es basura.

```bash
# BACKUP_ENCRYPTION_KEY (32 bytes → 44 chars base64) — SOLO cliente, PalmerP no la guarda en claro
openssl rand -base64 32 | tr -d '\n' ; echo
# ejemplo: q7V9...44chars...

# NEXTAUTH_SECRET
openssl rand -base64 32 | tr -d '\n' ; echo

# CRON_SECRET (Vercel cron auth)
openssl rand -base64 32 | tr -d '\n' ; echo

# FLEET_API_KEY (agente → control)
openssl rand -base64 32 | tr -d '\n' ; echo
```

**NO** pongas estas claves en Git. `.gitignore` ya ignora `.env*`.

---

## 6. Configurar .env (todas las vars explicadas) <a id="6-env"></a>

### 6.1 En tu portátil (proyecto cliente)

```bash
cd cliente-x
cp .env.example .env.local
nano .env.local
```

**Rellena mínimo:**

```ini
# — Obligatorias —
NEXTAUTH_URL="https://cliente-x.vercel.app"  # o https://cliente.es cuando tengas dominio
NEXTAUTH_SECRET="...de openssl..."
DATABASE_URL="postgresql://postgres...@pooler.supabase.com:6543/postgres?pgbouncer=true"
PALMERA_PLATFORM_URL="https://cliente-x.vercel.app"

# — Instancia —
PALMERA_INSTANCE_SLUG="cliente-x"
PALMERA_INSTANCE_NAME="Cliente X S.L."
PALMERA_INSTANCE_DOMAIN="cliente-x.palmerp.es"
PALMERA_INSTANCE_ADMIN_NAME="Ana López"
PALMERA_INSTANCE_ADMIN_EMAIL="ana@cliente.es"
PALMERA_INSTANCE_ADMIN_PASSWORD="cambia-esta-clave"
PALMERA_INSTANCE_TIMEZONE="Europe/Madrid"
PALMERA_INSTANCE_MODES="VENTAS,RESTAURANTE"

# — Triple Backup 3-2-1 —
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

# — AI opcional —
# OLLAMA_BASE_URL="http://mini:11434"
```

**Tabla de cada var (para el agente):**

| Variable | Qué es | Dónde va | Si falta |
|---|---|---|---|
| `DATABASE_URL` | Pooler Supabase 6543 | Vercel + MiniPC | `prisma generate` OK pero `migrate` falla, backup no guarda |
| `NEXTAUTH_URL` | URL pública Vercel | Vercel | login redirige mal |
| `NEXTAUTH_SECRET` | Firma JWT | Vercel + local | `getToken` falla, `/admin` loop |
| `BACKUP_ENCRYPTION_KEY` | Clave AES-GCM 32B solo cliente | Vercel + MiniPC | backup guarda `gz` sin cifrar (dev), restore falla `auth failed` |
| `BACKUP_LOCAL_DIR` | Ruta MiniPC | MiniPC | usa `/data/backups/palmerp` por defecto |
| `CLIENT_BACKUP_S3_*` | R2 cliente (B) | Vercel + MiniPC | destino B `not configured`, backup `PARTIAL` |
| `PALMERP_VAULT_R2_*` | R2 PalmerP (C) | Vercel + MiniPC | destino C `not configured`, sin vault |
| `CRON_SECRET` | `Authorization: Bearer` Vercel cron | Vercel | `401 Unauthorized` en `/api/cron/daily-backups` |
| `FLEET_API_KEY` | `Authorization: Bearer` heartbeat | MiniPC + Vercel | heartbeat no envía, semáforo no actualiza |
| `PALMERA_PLATFORM_URL` | URL control | Vercel + MiniPC | heartbeat URL mal |

### 6.2 En Vercel (replica exacta)

Vercel → tu proyecto → **Settings → Environment Variables → Add** (Environment: **Production**):

Pega las mismas 10+ vars de arriba. **No subas `.env.local` a Git.**

---

## 7. Instalar y Provisionar (comandos literales) <a id="7-provisionar"></a>

```bash
cd cliente-x

# 1) Dependencias
npm ci --legacy-peer-deps
# esperado: added 300+ packages, no errors

# 2) Prisma (genera cliente + aplica esquema)
npx prisma generate
# esperado: ✔ Generated Prisma Client (v7.8.0)

npx prisma migrate deploy
# esperado: 3 migrations applied (si DB vacía) o "No pending migrations"

# Alternativa si es primera vez sin migrations: npx prisma db push
npx prisma db push
# esperado: ✔ Your database is now in sync

# 3) Provisionar tenant + admin (crea Tenant, User ADMIN, Setting)
npm run instance:provision -- \
  --slug cliente-x \
  --name "Cliente X S.L." \
  --domain cliente-x.palmerp.es \
  --admin-name "Ana López" \
  --admin-email ana@cliente.es \
  --admin-password "Cambia123!"
# esperado: Tenant seeded in single shared DB ... Slug: cliente-x ... Domain: ...

# 4) Verificación local
npx tsc --noEmit --skipLibCheck
# esperado: (sin output) = OK

npm run build
# esperado: ✓ Compiled successfully, 66 rutas, sin errores

./init.sh
# esperado: [OK] Entorno listo (feature_list.json válido, tsc OK, prisma generate OK)

npm run dev
# abre http://localhost:3000 → debe cargar
# login con ana@cliente.es / Cambia123! en http://cliente-x.localhost:3000/login (usa /etc/hosts o subdominio)
```

**Si usas el bootstrap automático:**

```bash
node scripts/template-bootstrap.mjs
# interactivo: te pide slug, name, email, dominio, modos, genera claves, crea .env.local,
# ejecuta npx prisma generate + migrate deploy + instance:provision, e imprime checklist Vercel/MiniPC
```

---

## 8. Conectar Vercel (auto-deploy) <a id="8-vercel"></a>

1. `https://vercel.com` → **Add New Project → Import Git Repository** → selecciona `cliente/cliente-x` → **Import**
2. Framework: Next.js, Build Command: `prisma generate && next build` (ya en `vercel.json`), Install: `npm ci --legacy-peer-deps`
3. **Environment Variables:** pega las del §6.2 (Production)
4. **Build & Deploy** → espera 2 min → **Visit** → debe abrir la landing
5. **Domain:** Settings → Domains → Add `cliente.es` o `cliente-x.palmerp.es` → sigue DNS
6. **Cron:** `vercel.json` ya tiene `"path": "/api/cron/daily-backups", "schedule": "30 2 * * *"`. Verifica en **Settings → Cron Jobs** que aparece a las 02:30. No cambies hora sin cambiar systemd.

**Probar auto-deploy:**

```bash
git commit --allow-empty -m "test deploy"
git push origin main
# en Vercel → Deployments debe aparecer nuevo deployment verde en 1-2 min
```

**Upstream (para recibir tus mejoras):** ya configurado en §3.3. Documenta en el README del cliente.

---

## 9. Instalar MiniPC Agente 02:00 <a id="9-minipc"></a>

### 9.1 Preparar OS

```bash
ssh mini@192.168.1.50
sudo apt update && sudo apt install -y nodejs npm postgresql-client git curl jq
node -v  # >=20.9
pg_dump --version  # debe existir
sudo mkdir -p /data/backups/palmerp && sudo chown $USER:$USER /data/backups/palmerp
```

### 9.2 Clonar y configurar

```bash
git clone https://github.com/cliente/cliente-x.git /opt/palmerp
cd /opt/palmerp
npm ci --legacy-peer-deps
cp .env.example .env
nano .env  # pega LAS MISMAS vars que en Vercel (§6.1) — incluida BACKUP_ENCRYPTION_KEY

# verifica que DATABASE_URL y BACKUP_* están
grep -E "DATABASE_URL|BACKUP_|CLIENT_BACKUP|PALMERP_VAULT" .env
```

### 9.3 Probar manual (debe crear 3 destinos + 2 artefactos)

```bash
npm run backup:agent
# o
node scripts/backup-agent.mjs --once

# esperado:
# [agent] 1 tenants @ 2026-09-15T...
# [agent][LOCAL] wrote /data/backups/palmerp/tenants/.../daily/2026-09-15.logical.json.gz.enc  4.2KB
# [agent][CLIENT_STORAGE] uploaded tenants/.../daily/...logical.json.gz.enc
# [agent][VAULT] uploaded vault/tenants/.../daily/...logical.json.gz.enc
# [agent][LOCAL] wrote ...physical.sql.gz.enc
# [agent] done cliente-x logical 4200B phys yes
# [agent] all done

ls -lh /data/backups/palmerp/tenants/*/daily/
# debe mostrar .logical.json.gz.enc y .physical.sql.gz.enc de hoy

# verifica que subió a R2 cliente y vault (si credenciales OK, sin "not configured")
```

### 9.4 Automatizar 02:00 (systemd — más fiable que cron)

Crea dos archivos (si no existen en `scripts/systemd/`):

**`/etc/systemd/system/palmerp-backup.service`:**

```ini
[Unit]
Description=PalmerP Triple Backup 02:00
After=network.target

[Service]
Type=oneshot
User=mini
WorkingDirectory=/opt/palmerp
EnvironmentFile=/opt/palmerp/.env
ExecStart=/usr/bin/node /opt/palmerp/scripts/backup-agent.mjs --once
```

**`/etc/systemd/system/palmerp-backup.timer`:**

```ini
[Unit]
Description=Run PalmerP backup daily 02:00
Requires=palmerp-backup.service

[Timer]
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Activa:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now palmerp-backup.timer
systemctl list-timers | grep palmerp
# debe mostrar palmerp-backup.timer n/a n/a ... 02:00

# probar timer sin esperar:
sudo systemctl start palmerp-backup.service
journalctl -u palmerp-backup.service -n 50 --no-pager
# debe mostrar [agent] all done sin errores
```

> **Si no quieres systemd:** usa `crontab -e` → `0 2 * * * /usr/bin/node /opt/palmerp/scripts/backup-agent.mjs --once >> /var/log/palmerp-backup.log 2>&1`

---

## 10. Verificación Obligatoria (no entregues sin esto) <a id="10-verificacion"></a>

Ejecuta **en este orden**, todo debe ser verde:

```bash
# En tu portátil (proyecto cliente):
npx prisma generate
# ✔ Generated Prisma Client

npx tsc --noEmit --skipLibCheck
# (sin output)

npm run build
# ✓ Compiled successfully — 66 rutas

./init.sh
# [OK] Entorno listo

# En Vercel (backup vía cron):
curl -H "Authorization: Bearer $CRON_SECRET" https://cliente-x.vercel.app/api/cron/daily-backups | jq
# esperado: { success: true, count: 1, summary: {success:1, partial:0, failed:0},
#   results: [{ tenantSlug:"cliente-x", overallStatus:"success",
#     artifacts:[{kind:"LOGICAL_JSON", destinations:[{dest:"LOCAL",status:"success"},...]}]}] }
# Si ves "not configured" en CLIENT_STORAGE/PALMERP_VAULT → revisa vars R2
# Si solo ves LOGICAL_JSON y no PHYSICAL_DUMP → es normal en Vercel (physical solo MiniPC)

# En MiniPC:
npm run backup:agent && ls -lh /data/backups/palmerp/tenants/*/daily/ && echo "LOCAL OK"
# debe mostrar 2 .enc de hoy

# Fleet heartbeat:
curl -H "Authorization: Bearer $FLEET_API_KEY" https://control.palmerp.es/api/fleet/backup-heartbeat | jq .status
# esperado: [{slug:"cliente-x", color:"green", ageHours: <24 }]

# Login:
open https://cliente-x.vercel.app/login
# entra con ana@cliente.es / Cambia123! → debe llevar a /admin
```

**Si algo falla, no entregues.** Ve a §14.

---

## 11. Restaurar (dryRun) <a id="11-restaurar"></a>

**Nunca restaures sin `dryRun:true` primero.**

### Lógico (usuario/contacto borrado)

```bash
# 1) lista
curl "https://cliente-x.vercel.app/api/admin/restore?tenantId=xxx" | jq .logs[0].fileKey
# → "tenants/xxx/daily/2026-09-14.logical.json.gz.enc"

# 2) descarga el .enc (elige el que prefieras)
scp mini:/data/backups/palmerp/tenants/xxx/daily/2026-09-14.logical.json.gz.enc ./
# o desde R2 cliente / Vault

# 3) dryRun (valida sin tocar DB)
ENC=$(base64 -w0 2026-09-14.logical.json.gz.enc)
curl -X POST https://cliente-x.vercel.app/api/admin/restore \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"xxx\",\"fileKey\":\"tenants/xxx/daily/2026-09-14.logical.json.gz.enc\",\"encBase64\":\"$ENC\",\"dryRun\":true}" | jq .preview
# → {users:3, contacts:120, ...} si clave OK; si "auth failed" → clave mal

# 4) restaura (solo añade lo que falta, no borra)
curl -X POST https://cliente-x.vercel.app/api/admin/restore \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"xxx\",\"fileKey\":\"...\",\"encBase64\":\"$ENC\",\"dryRun\":false}" | jq .restoredUsers
```

### Físico (reconstruir DB)

```bash
# Solo con .physical.sql.gz.enc del MiniPC/Vault
# 1) descifra con src/lib/backup/crypto.ts:decryptBuffer (o script) → 2) gunzip → 3) psql
node -e "import('./src/lib/backup/crypto.js').then(m=>{...})"  # usa helper decryptBuffer
gunzip < dump.sql.gz > dump.sql
psql "$DATABASE_URL" < dump.sql
# Hazlo primero en staging, avisa al cliente, para la app
```

---

## 12. Fleet: Upstream, Updates 1-click y Modos <a id="12-fleet"></a>

### Upstream (tú publicas mejora → cliente la recibe)

```bash
# En palmerp base (tú):
git add . && git commit -m "feat: nuevo modo X" && git push origin main
# sube también version: edita package.json "version": "0.2.0"

# En cliente-x (él o tú con acceso) — manual clásico:
git fetch upstream
git merge upstream/main --no-edit
# resuelve conflictos si hay (normalmente no, Core no toca módulos cliente)
git push origin main  # Vercel despliega auto
```

### Updates 1-click como tú (recomendado)

El cliente **no necesita saber git**. Tiene semáforo y botón:

- **UI:** `/admin/settings/updates` → muestra `v0.1.0 @ abc123` vs `Palm-ERP/palmerp@main @ def456`, `N commits por detrás`, último backup, últimos updates. Botón copia comandos.
- **API:** `GET /api/admin/updates` (check) + `GET /api/fleet/check-update` (público ligero)
- **Vars:** `.env` → `PALMERP_UPSTREAM_REPO=Palm-ERP/palmerp`, `PALMERP_UPSTREAM_BRANCH=main`, `GITHUB_TOKEN=ghp_...` (solo si repo base privado)
- **Vercel (GitHub):** en su portátil dentro del repo cliente:

```bash
git fetch upstream && git merge upstream/main --no-edit --no-ff
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy   # o npx prisma db push si no hay migrations
npm run build               # si falla, no push
git push origin main        # Vercel despliega 1-2 min
```

- **MiniPC (on-premise):** un comando hace todo con backup previo y verificación:

```bash
node scripts/fleet-update.mjs --check          # ¿hay update?
node scripts/fleet-update.mjs --dry-run        # simula
node scripts/fleet-update.mjs --apply          # backup → fetch → merge → npm ci → migrate → build → push + pm2 restart
# npm run fleet:update  # alias de --apply
# npm run fleet:check   # alias de --check
```

El script hace `npx tsc` + `build` antes de push; si falla, **no despliega**. Si hay merge conflictos hace `git merge --abort` y stash pop. Lee `docs/TEMPLATE-INSTALADOR.md §13`.

### Modos (instalar desde repo base)

```bash
# Cliente ya tiene el Core + todos los modos en src/modules/ (pre-bundled)
# Activar es solo Setting: palmera_active_modes = ["VENTAS","RESTAURANTE"]
# Vía API:
curl -X POST https://cliente-x.vercel.app/api/admin/modes \
  -H "Content-Type: application/json" \
  -d '{"modes":["VENTAS","RESTAURANTE","EDUCACION"]}'
# O vía UI: /admin/settings/modules

# Futuro marketplace remoto (cuando exista registry.json):
# POST /api/admin/modes/install {modeId:"EDUCACION"} → fetch https://raw.githubusercontent.com/tu/palmerp/main/src/modules/education/...
```

---

## 13. Actualizar como tú (cliente 1-click) <a id="13-updates"></a>

**El cliente actualiza exactamente como tú lo haces ahora.** No hay canal separado.

1. **UI 1-click:** Cliente entra a **`/admin/settings/updates`** → ve semáforo (verde al día / amarillo N commits / rojo sin conexión), versión `v0.1.0` vs upstream, último backup, y dos cajas de comandos copiables: **Vercel** y **MiniPC**. No escribe git a mano: copia/pega.

2. **Vercel (recomendado si su ERP está en Vercel):** copia los 7 comandos de la caja Vercel en su portátil y `git push` despliega. Vercel usa `buildCommand: prisma generate && next build` así que migrations corren solas.

3. **MiniPC (si on-premise):** `node scripts/fleet-update.mjs --apply` hace: backup previo (logical → LOCAL/CLIENT_STORAGE/VAULT) → `git fetch upstream` → `merge` → `npm ci` → `prisma generate/migrate deploy` → `tsc` + `build` → `git push` → `pm2 restart` si existe. Con `--dry-run` no toca nada. Con `--check` solo informa.

4. **Tú publicas:** sube `package.json version` y `git push origin main` en `Palm-ERP/palmerp`. Cada cliente verá `N commits por detrás` en su `/admin/settings/updates`.

5. **Seguridad:** el script **no hace push si `build` falla** y aborta merge si hay conflictos. Siempre hay backup previo en 3 destinos + vault 90d para rollback (`/api/admin/restore` dryRun).

**Vars necesarias en cliente `.env` para check:** `PALMERP_UPSTREAM_REPO=Palm-ERP/palmerp`, `PALMERP_UPSTREAM_BRANCH=main`, opcional `GITHUB_TOKEN` si tu repo base es privado.

---

## 14. Handover al Cliente (qué entregas) <a id="14-handover"></a>

Entrega **física + digital**:

- [ ] **PDF** `docs/Manual-PalmerP-Triple-Backup-Fleet.pdf` (para dueño, sin tecnicismos)
- [ ] **Clave impresa QR** de `BACKUP_ENCRYPTION_KEY` + `NEXTAUTH_SECRET` en sobre cerrado (si la pierde, no hay restore)
- [ ] **Accesos:** invite a su email como `ADMIN` en su Vercel Team + Supabase Org + GitHub repo
- [ ] **URLs:** `https://cliente-x.vercel.app` (prod), `https://cliente-x.vercel.app/admin`, `https://control.palmerp.es` (tu fleet)
- [ ] **Semáforo:** enséñale `GET /api/fleet/backup-heartbeat` verde = tranquilo (1 min/día)
- [ ] **Regla:** `git push origin main` despliega; para pedir soporte, que te dé su `tenantId` y un `.enc` (sin clave no puedes abrir)

**Frase para cliente:** *"Si ves verde cada mañana y guardas la clave en caja fuerte, estás cubierto aunque falle Vercel o Supabase. Yo veo el vault pero no puedo abrirlo sin ti."*

---

## 15. Troubleshooting (error → causa → fix) <a id="15-troubleshooting"></a>

| Error | Causa | Fix |
|---|---|---|
| `npx prisma generate` → `Can't find DATABASE_URL` | `.env` no cargado | `cp .env.example .env.local` y rellena, o `export DATABASE_URL=...` |
| `prisma migrate deploy` → `P1001 Can't reach` | pooler mal (puerto 5432 sin `?pgbouncer=true`) | usa URI pooler `6543 ?pgbouncer=true` de Supabase Settings → Database |
| `instance:provision` → `Ya existe slug` | Tenant ya creado | `npx prisma studio` → borra Tenant o usa otro slug |
| `npm run build` → `Type error` | `tsc` falla | `npx tsc --noEmit --skipLibCheck` y corrige archivo indicado (`src/lib/backup/...`) |
| `GET /api/cron/daily-backups` → `401` | `CRON_SECRET` mal | Vercel Env `CRON_SECRET` debe igualar header `Bearer` |
| `overallStatus: "partial"` + `not configured` en `CLIENT_STORAGE` | `CLIENT_BACKUP_S3_*` vacías | rellena `CLIENT_BACKUP_S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET` en Vercel + MiniPC `.env` y redeploy |
| `overallStatus: "partial"` + `not configured` en `PALMERP_VAULT` | `PALMERP_VAULT_R2_*` vacías | igual, pero con tu vault R2 |
| Solo `LOGICAL_JSON`, no `PHYSICAL_DUMP` en Vercel | normal | Vercel no tiene `pg_dump`; el físico solo lo crea MiniPC (`backup:agent`) |
| `backup:agent` → `BACKUP_ENCRYPTION_KEY no configurada` | `.env` MiniPC sin clave | copia la misma clave de Vercel al `/opt/palmerp/.env` |
| `backup:agent` → `pg_dump not available` | `postgresql-client` no instalado | `sudo apt install postgresql-client && pg_dump --version` |
| `POST /api/admin/restore` → `auth failed` | clave mal | usa la `BACKUP_ENCRYPTION_KEY` exacta con la que se cifró (base64 44 chars, sin salto) |
| `systemctl` → `Failed to enable` | archivos no copiados | `sudo cp scripts/systemd/* /etc/systemd/system/` + `daemon-reload` |
| `git push` no despliega | Vercel no conectado | Vercel → Import Git Repository debe apuntar al fork del cliente, Production Branch `main` |
| `TenantMismatch` en `/admin` | `tenantSlug` token ≠ subdominio | `middleware.ts` usa `x-tenant-slug`; en localhost usa `cliente-x.localhost:3000`, en prod `cliente-x.vercel.app` |

**Logs útiles:**

```bash
# Vercel
vercel logs cliente-x.vercel.app --follow

# MiniPC
journalctl -u palmerp-backup.service -n 100 --no-pager
ls -lh /data/backups/palmerp/tenants/*/daily/
cat /opt/palmerp/.env | grep -E "BACKUP|DATABASE"

# DB
npx prisma studio  # abre http://localhost:5555 → tablas Tenant, BackupLog, AuditLog
```

---

## 16. Checklist Final Firmable <a id="16-checklist"></a>

Copia y firma con cliente:

```
☐ Clave BACKUP_ENCRYPTION_KEY generada y guardada en 4 sitios (Vercel, MiniPC, papel QR, NAS)
☐ DATABASE_URL pooler 6543 verificada con psql select 1
☐ npx prisma generate + migrate deploy OK
☐ npm run build (66 rutas) + ./init.sh [OK] + npx tsc OK
☐ Vercel proyecto importado, Production Branch main, auto-deploy probado (git push)
☐ Vercel cron 02:30 visible en Settings → Cron Jobs
☐ MiniPC: /data/backups/palmerp existe, pg_dump OK, backup:agent manual crea 2 .enc y sube a B y C
☐ systemd timer 02:00 enable --now OK, list-timers muestra palmerp-backup.timer
☐ curl /api/cron/daily-backups → success 3 destinos, 2 artefactos (physical solo MiniPC)
☐ GET /api/fleet/backup-heartbeat → verde <24h
☐ POST /api/admin/restore dryRun:true probado con .enc real
☐ Upstream configurado (git remote -v muestra origin + upstream)
☐ Updates: /admin/settings/updates muestra versión y upstream, PALMERP_UPSTREAM_REPO configurado
☐ Cliente probó fleet:check (verde o N commits) y sabe hacer fleet:update --apply (MiniPC) o git merge+push (Vercel)
☐ Handover: PDF + QR clave + accesos Vercel/Supabase/GitHub entregados
☐ Cliente sabe: git push despliega, fetch upstream recibe mejoras, semáforo 1 min/día, updates 1-click como tú

Instalador: ______________________  Fecha: __________  Firma: __________
Cliente:    ______________________  Fecha: __________  Firma: __________
```

**Si todas las casillas están marcadas, la instalación es 100% y puedes irte tranquilo. 🌙**

*PalmerP — Hecho con mimo en Europa — 2026*
