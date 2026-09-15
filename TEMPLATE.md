# PalmerP — Template (Fleet Independiente)

> **Si estás instalando PalmerP para un cliente, empieza aquí. Este es tu mapa 100% — sin pasos ocultos.**

Este repositorio es un **GitHub Template**. Cada cliente tiene **su propia copia**: su GitHub, su Vercel, su Supabase y su MiniPC. Tú (PalmerP) mantienes el repo base como `upstream`.

```
Tu repo base (palmerp)  ──template──►  Fork del cliente (cliente-x/palmerp)
        push master ──────────────────►  git pull upstream main → push → Vercel auto-deploy
```

**¿Qué estás instalando?**
- **Core agnóstico** (`src/lib/db.ts` singleton, `prisma/schema.prisma` Tenant/User/Contact/Setting/AuditLog/BackupLog)
- **Módulos** (`src/modules/registry.ts` + `src/modules/*`) activables por `Setting palmera_active_modes`
- **Triple Backup 3-2-1** (`src/lib/backup/*`, `vercel.json` cron 02:30, `scripts/backup-agent.mjs` agente 02:00 MiniPC)
- **Vault inmutable 90d + RLS** (`prisma/migrations/20260603_rls_tenant_isolation`)

---

## 1. Ruta Rápida Para Agentes (IA o Humano) — 15 Minutos

### Opción A — Automático (recomendado)

```bash
git clone https://github.com/tu/palmerp.git cliente-x && cd cliente-x
npm ci --legacy-peer-deps
node scripts/template-bootstrap.mjs
# Responde: slug, nombre, email admin, dominio, modos
# El script genera: .env.local, BACKUP_ENCRYPTION_KEY, NEXTAUTH_SECRET, CRON_SECRET
# Luego sigue las instrucciones que imprime para Supabase/Vercel/MiniPC
```

### Opción B — Manual

Sigue **`docs/TEMPLATE-INSTALADOR.md`** — guía exhaustiva 100% con cada comando, cada variable, cada verificación y troubleshooting. Es el contrato del instalador.

### Actualizar como tú (cliente 1-click)

El cliente lleva tu mismo flujo: `/admin/settings/updates` → semáforo + `GET /api/admin/updates` → `N commits por detrás`. En Vercel: `git fetch upstream && git merge upstream/master && npm ci && npx prisma migrate deploy && git push`. En MiniPC: `npm run fleet:update` (`scripts/fleet-update.mjs --apply`) que hace backup previo + merge + migrate + build + push + pm2 restart. Ver `TEMPLATE-INSTALADOR.md §13`.

---

## 2. Checklist de 60 Segundos (no avances si falta algo)

- [ ] **GitHub:** fork/clone creado desde este template (`Use this template` en GitHub)
- [ ] **Supabase:** proyecto creado (pooler `6543 ?pgbouncer=true` copiado)
- [ ] **Vercel:** proyecto importado desde el fork (Production Branch `master`)
- [ ] **R2 Cliente:** bucket para destino B (`CLIENT_BACKUP_S3_*`)
- [ ] **R2 Vault PalmerP:** bucket `palmerp-vault` para destino C (tu cuenta)
- [ ] **MiniPC:** Ubuntu + Node 20 + `pg_dump` siempre ON (`/data/backups/palmerp`)
- [ ] **Claves:** `BACKUP_ENCRYPTION_KEY` (44 chars base64), `NEXTAUTH_SECRET`, `CRON_SECRET`, `FLEET_API_KEY` generadas

---

## 3. Verificación Obligatoria (antes de entregar al cliente)

```bash
npx prisma generate          # debe decir "Generated Prisma Client"
npx tsc --noEmit --skipLibCheck  # sin output = OK
npm run build                # 66 rutas, sin errores
./init.sh                    # [OK] Entorno listo
curl -H "Authorization: Bearer $CRON_SECRET" https://cliente.vercel.app/api/cron/daily-backups | jq .summary
# esperado: {"success":1,"partial":0,"failed":0} con 3 destinos success y 2 artefactos
npm run backup:agent         # en MiniPC, debe crear /data/.../*.enc y subir a B y C
curl -H "Authorization: Bearer $FLEET_API_KEY" https://control.palmerp.es/api/fleet/backup-heartbeat | jq .status
# esperado: verde <24h
npm run fleet:check          # debe decir Al día o N commits (usa PALMERP_UPSTREAM_REPO)
curl https://cliente.vercel.app/api/admin/updates | jq .reason  # Al día / N commits por detrás
open https://cliente.vercel.app/admin/settings/updates  # semáforo + 1-click como tú
```

Si algo falla, ve a **`docs/TEMPLATE-INSTALADOR.md` → §9 Troubleshooting**.

---

## 4. Documentación Que Debes Leer

| Documento | Para qué |
|---|---|
| `docs/GUIA-COMPLETA-PALMERP.md` + `docs/Guia-Completa-PalmerP-Sistema.pdf` | **Guía completa visual** — porqués + pasos bien divididos, usuario + técnico, 13 capítulos |
| `docs/TEMPLATE-INSTALADOR.md` | **Biblia del instalador 100%** — cada comando, cada env, cada error esperado |
| `docs/Manual-PalmerP-Triple-Backup-Fleet.pdf` | Manual pedagógico para el dueño (sin tecnicismos, para entregar) |
| `docs/architecture.md` | Reglas de arquitectura (Single-DB vs Fleet, RLS, qué NO hacer) |
| `.env.example` | Todas las variables documentadas con ejemplos |
| `scripts/backup-agent.mjs` | Agente local 02:00 — lee el header del archivo |
| `src/app/admin/settings/updates` | Updates 1-click como tú — lee el código y la UI |

---

## 5. Entrega al Cliente (handover)

1. Entrégale el **PDF**, la **clave impresa en QR** (¡si la pierde, el backup es irrecuperable!) y el acceso a su Vercel/Supabase/R2.
2. Enséñale el semáforo: `GET /api/fleet/backup-heartbeat` verde = tranquilo.
3. Recuérdale: `git push origin master` despliega solo; para recibir tus mejoras: `git fetch upstream && git merge upstream/master`.

---

## 6. Soporte

- Fallo en `prisma generate` → revisa `DATABASE_URL` pooler 6543
- `not configured` en backup → revisa `CLIENT_BACKUP_S3_*` / `PALMERP_VAULT_R2_*`
- MiniPC no genera `physical` → instala `postgresql-client` (`pg_dump --version`)

**Regla de oro:** no declares `done` sin `npx tsc` + `npm run build` + `./init.sh` en verde (`docs/verification.md`).
