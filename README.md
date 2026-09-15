# PalmerP ERP Core — Fleet Independiente (Template)

> **¿Instalando para un cliente? Empieza por [`TEMPLATE.md`](./TEMPLATE.md) y sigue [`docs/TEMPLATE-INSTALADOR.md`](./docs/TEMPLATE-INSTALADOR.md) — guía 100% para el agente instalador. Si eres dueño, lee el PDF.**

Este es el **repo base** de PalmerP. Cada cliente tiene su **fleet independiente**: su GitHub (fork de este template), su Vercel, su Supabase, su R2 y su MiniPC siempre ON. Auto-deploy al hacer `git push origin master`.

## Inicio Rápido (Agente Instalador — 15 min)

```bash
git clone https://github.com/tu/palmerp.git cliente-x && cd cliente-x
npm ci --legacy-peer-deps
node scripts/template-bootstrap.mjs
# Responde slug/nombre/email/dominio → genera .env.local + claves + provisiona DB
# Sigue el output para Vercel/Supabase/MiniPC
```

**O manual:** sigue `docs/TEMPLATE-INSTALADOR.md` paso a paso (comandos literales, todas las vars, troubleshooting).

## Documentación

| Archivo | Para quién | Qué explica |
|---|---|---|
| [`docs/GUIA-COMPLETA-PALMERP.md`](./docs/GUIA-COMPLETA-PALMERP.md) + [PDF](./docs/Guia-Completa-PalmerP-Sistema.pdf) | **Todos (dueño+técnico+tú)** | **Biblia completa visual**: visión, porqués, mapas, usuario 1-min, instalador 0-100%, backup, MiniPC, updates 1-click, troubleshooting, checklists |
| [`TEMPLATE.md`](./TEMPLATE.md) | Instalador rápido | Mapa 60s + `template-bootstrap` |
| [`docs/TEMPLATE-INSTALADOR.md`](./docs/TEMPLATE-INSTALADOR.md) | Instalador 100% | Comandos literales, todas las vars, errores y fixes |
| [`docs/Manual-PalmerP-Triple-Backup-Fleet.pdf`](./docs/Manual-PalmerP-Triple-Backup-Fleet.pdf) | Dueño (entregar) | Triple backup pedagógico sin tecnicismos |
| [`docs/architecture.md`](./docs/architecture.md) | Dev | Reglas RLS, Single-DB vs Fleet, qué NO hacer |
| [`.env.example`](./.env.example) | Dev | Todas las env vars con ejemplos |

## Stack

Next.js 16.2.6 + Prisma 7.8.0 + pg + Supabase pooler 6543 `?pgbouncer=true` + Vercel Cron 02:30 + R2/S3 + systemd agente 02:00

## Triple Backup 3-2-1

Cada noche 02:00 → 2 artefactos (`logical.json.gz.enc` + `physical.sql.gz.enc`) cifrados solo con `BACKUP_ENCRYPTION_KEY` en 3 destinos: **A** `/data/backups/palmerp` (MiniPC 7d) → **B** R2 cliente (30d) → **C** Vault PalmerP `palmerp-vault` (90d inmutable).

```bash
npm run backup:agent          # MiniPC: crea ambos artefactos y sube a A/B/C
curl -H "Authorization: Bearer $CRON_SECRET" https://cliente.vercel.app/api/cron/daily-backups | jq .summary
curl -H "Authorization: Bearer $FLEET_API_KEY" https://control.palmerp.es/api/fleet/backup-heartbeat | jq .status  # verde <24h
```

## Verificación (antes de entregar)

```bash
npx prisma generate
npx tsc --noEmit --skipLibCheck
npm run build   # 66 rutas
./init.sh       # [OK] Entorno listo
```

## Fleet

```bash
git remote add upstream https://github.com/tu/palmerp.git
git fetch upstream && git merge upstream/master && git push origin master  # recibe mejoras → Vercel auto-deploy
```

Modos: `src/modules/registry.ts` + `Setting palmera_active_modes`. Activar: `POST /api/admin/modes` o `/admin/settings/modules`.

---

*PalmerP — Hecho con mimo en Europa — 2026*
