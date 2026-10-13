# Sesión Actual — Palmera Core

**Estado:** En progreso.

**Feature:** Módulo Educación — Integración Google Calendar + Panel rápido + WhatsApp

**Plan ejecutado 2026-09-21:**
- `src/modules/education/components/ClassReportPanel.tsx:1` [NUEVO] Panel rápido del profesor:
  - Carga eventos del día de Google Calendar vía `GET /api/education/calendar?email=...`
  - Carga clases del día de la agenda interna (localStorage `edu_lessons`)
  - Botón "Finalizar" abre modal con campos "Qué se hizo" + "Tarea próxima clase" + toggle asistencia
  - Al enviar: llama `POST /api/education/report` (WhatsApp Cloud API) y fallback `wa.me` si no hay credenciales
  - Marca la clase como `COMPLETED` y registra `whatsappSentAt` en localStorage
  - Toast de feedback, spinner durante el envío, empty state descriptivo
- `src/modules/education/components/EducationDashboard.tsx` integra `<ClassReportPanel />` como sección principal, reemplazando la lista básica + botón de alerta
- `src/modules/education/components/ProfessorsManager.tsx` eliminado banner "Arquitectura por revisar" (era solo nota de desarrollo, ya implementado)
- `src/lib/auth.ts` corregido bug estructural preexistente: funciones `hasRole`/`requireRole` estaban dentro del objeto `authOptions` — movidas al exterior
- `src/app/api/education/calendar/route.ts` corregido error de tipo implícito `any` en el filtro
- `googleapis` instalado como dependencia (npm install googleapis)
- `npx tsc --noEmit` → 0 errores ✅

**Plan ejecutado 2026-09-21 (entidades alumno/tutor único + birthDate):**
- `prisma/schema.prisma`: `Contact.birthDate/preferredChannel/commsOptOut`, `EduStudent.commsMode/guardianRelation/billingMode` (+ enums `EduCommsMode`, `EduBillingMode`), `EduOutboxMessage.recipientContactId/recipientRole` + índice. `prisma validate` ✅ + `prisma generate` ✅
- `src/modules/education/lib/recipients.ts` [NUEVO]: `isMinor`, `defaultCommsMode/defaultBillingMode`, `getReportRecipients` (TUTOR_ONLY/STUDENT_ONLY/BOTH, dedupe por `phoneNormalized`, respeta `commsOptOut`, warning sin teléfono), `sendableRecipients`
- `src/app/api/education/report/route.ts`: fix bug `to: '+34'+studentId` — ahora resuelve `EduStudent include contact + tutorContact`, calcula destinatarios reales, 1 `eduOutboxMessage` por destinatario (mismo batchToken/link), 1 `auditLog` resumen. Acepta override puntual `recipients` desde el panel. 404 sin Prisma → el cliente sigue con fallback `wa.me`
- `src/modules/education/components/StudentsManager.tsx`: wizard 3 pasos (1 alumno+birthDate+instrumentos, 2 tutor único+parentesco, 3 commsMode+billingMode+preview). Migración `tutorName/tutorPhone` sueltos → `tutorId` FK por match nombre/teléfono. Valida tutor ≠ alumno. Badges WhatsApp/pago/nacimiento en tarjeta
- `src/modules/education/components/ClassReportPanel.tsx`: chips destinatario (Tutor/Alumno según ficha, override puntual, badge sin teléfono), envío multi-destinatario (Cloud API + `wa.me` por chat con retardo 600ms), 404 tratado como solo-local
- `src/app/admin/contacts/page.tsx`: campo `birthDate` en interfaz + formulario + persistencia; badges 🎸 Alumno / 👨‍👩‍👧 Tutor (leídos de `edu_students` local) en cada fila
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `npm test` → 8/8 ✅

**Plan ejecutado 2026-09-21 (simplificar Educación > Profesor):**
- `src/app/admin/education/page.tsx`: reescrita como server component con `getServerSession` — header mínimo personalizado ("Hola, {nombre} — tus clases de hoy" + link a agenda), render directo de `<ClassReportPanel />`, `<ProfessorsManager />` solo si rol ADMIN/DEV. Eliminados `EducationDashboard` y agenda embebida (la agenda vive en `/admin/education/agenda`, ya en el sidebar del registry)
- `src/modules/education/components/ClassReportPanel.tsx`: eliminada la tarjeta "Panel de clase rápido" (repetía la cabecera de página) → fila mínima "Clases de hoy + Actualizar". Clases locales filtradas por profesor logueado (`teacherId/teacherName` vs sesión; sin asignar = visible por legado; ADMIN/DEV ven todo). Google Calendar ya filtraba por email en servidor
- `src/modules/education/components/EducationDashboard.tsx` eliminado (en desuso, solo lo usaba esa página; además sembraba demos en localStorage)
- `src/modules/education/module.ts`: menú sincronizado con registry ("Profesor" + entrada "Agenda")
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `npm test` → 8/8 ✅

**Fix 2026-09-21 (menú vacío "fresh install" en modo educación):**
- Causa: `GET /api/admin/modes` devolvía `{success:true, modes:[]}` sin tenant resuelto (localhost plano sin sesión) y el sidebar SOBRESCRIBÍA `localStorage palmera_active_modes_*` con `[]`. Además en `localhost:3000` plano el slug cae a `gastroshows` (modos `[]` en DB) mientras la escuela es el tenant `getloud` (modos `["EDUCACION"]` en DB)
- `src/app/api/admin/modes/route.ts`: sin slug → `401 {success:false}` para que el sidebar conserve su estado local en vez de borrarlo
- Verificado con curl: sin sesión → 401; `Host: getloud.localhost:3000` → `{"success":true,"modes":["EDUCACION"]}` ✅
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅

**Plan ejecutado 2026-09-22 (guion guitarra 40x30' integrado en educación):**
- `src/modules/education/data/guitar-40.ts` [NUEVO]: 40 fichas C01–C40 (14 Principiante + 13 Medio + 13 Avanzado), 30' con plantilla 5/20/5 consultable en 60s, multi-guitarra (española/acústica/eléctrica) + adaptaciones niño/adulto por ficha
- Base ciencia por ficha: Fitts & Posner (3 clases por técnica), Ericsson (criterio pasa medible BPM/limpieza), Ebbinghaus (`reviewFrom` C+1/C+4/C+8), Rohrer (interleaving), Schmidt (variabilidad), Gordon (cantar antes de tocar)
- Mapeo ERP sin migrar: `GUITAR_SKILLS` x6 (ritmo/acordes/tecnica/oido/lectura/repertorio), `GUITAR_GOALS` x3 (N1/N2/N3 con pasa), `GUITAR_TERMS` x3, helpers `getGuitarLesson*`, `buildGuitarDailyBrief` (panel/WhatsApp), `buildGuitarLibrarySeeds` (Biblioteca 2/5/15'), `GUITAR_COURSE_META`
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · conteo 40/40 verificado ✅
- No se toca Prisma ni UI en esta sesión; siguiente paso build: seed Biblioteca + selector "Guion hoy" en Clases

**Fix 2026-09-21 (calendar 500 sin Google configurado):**
- `src/app/api/education/calendar/route.ts`: `isCalendarConfigured()` + early-return `200 {events:[], configured:false}` sin creds, `JSON.parse` protegido, catch degrada config a 200 vacío; solo fallos reales Google siguen 500
- `src/modules/education/components/ClassReportPanel.tsx`: `configured===false` → modo solo-local silencioso (no `gcError`), Palmera sigue mandando
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `./init.sh` verde ✅

**Plan ejecutado 2026-09-22 (vista Curso Guitarra en modo educación):**
- `src/modules/education/components/GuitarCourseViewer.tsx` [NUEVO]: cabecera 40x30' + progreso por nivel, Guion de hoy por semana 1-40, filtros Principiante/Medio/Avanzado + buscador, 40 fichas expandibles (objetivo/ciencia/5'+20'+5'/casa/pasa/niño-adulto/española-acústica-eléctrica/repaso), marcar hecha en localStorage, copiar guion 60s para WhatsApp
- `src/app/admin/education/guitar/page.tsx` [NUEVO]: ruta del curso con metadata
- `src/modules/education/module.ts` + `src/modules/registry.ts`: entrada "Curso Guitarra" → `/admin/education/guitar` en menú EDUCACION
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅

**Plan ejecutado 2026-09-22 (tema claro por defecto para getloudspace):**
- `src/app/layout.tsx`: eliminado `dark` forzado en `<html>`, añadido script anti-flash que restaura `localStorage.theme` (claro por defecto, oscuro solo si se eligió). El toggle del Topbar sigue funcionando y ahora sí persiste.
- `src/app/globals.css` (`:root`): fondo gris casi blanco (220 20% 98%), tarjetas blancas, bordes 220 15% 88% y muted 220 15% 94% para delimitar sidebar/cards y facilitar navegación. Rojos y radios intactos; modo `.dark` intacto.
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `./init.sh` verde ✅
- Nota: usuarios con `theme=dark` guardado seguirán en oscuro; para ver el claro basta pulsar el toggle (sol/luna) una vez.

**Plan ejecutado 2026-09-28 (unificar WhatsApp Cloud API):**
- `src/modules/education/lib/whatsappConfig.ts` [NUEVO]: fuente única `resolveWhatsAppConfig(tenantId)` — Setting por tenant (`whatsapp_token`, `whatsapp_phone_number_id`+legacy `whatsapp_phone_id`, `whatsapp_template`) > env (`WHATSAPP_TOKEN|WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID|WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE`). Devuelve `configured` + `source` para debug.
- `src/modules/education/lib/whatsapp.ts`: nuevo `sendWhatsAppTextApi()` (texto libre ventana 24h); el template sigue en `sendWhatsAppCloudApi()`.
- `src/app/api/education/report/route.ts`: usa `resolveWhatsAppConfig` + `sendWhatsAppTextApi`, responde `whatsappConfigured/whatsappSource`.
- `src/app/api/education/whatsapp/send/route.ts`: usa el mismo helper (antes solo leía `WHATSAPP_ACCESS_TOKEN`), responde `whatsappConfigured/whatsappSource`.
- `.env.example`: sección WhatsApp + Google Calendar documentada (nombres canónicos, legacy aceptados, fallback wa.me, service-account solo lectura + OAuth pendiente).
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `npm test` → 8/8 ✅

**Plan ejecutado 2026-09-28 (espacio Credenciales cifrado):**
- `src/lib/secrets.ts` [NUEVO]: vault AES-256-GCM (`CREDENTIALS_ENCRYPTION_KEY`, fallback `BACKUP_ENCRYPTION_KEY`). Formato `enc:v1:...`. Falla cerrado sin llave; roundtrip verificado OK.
- `src/app/api/admin/credentials/route.ts` [NUEVO]: GET (solo estados `configured/source`, jamás valores) + PUT (cifra y guarda en `Setting`) + DELETE. Solo ADMIN/DEV. Audit `CREDENTIAL_SAVED/DELETED` con la clave, nunca el valor.
- `src/app/api/admin/credentials/test/route.ts` [NUEVO]: prueba WhatsApp a tu móvil descifrando solo en memoria, devuelve éxito/error sin revelar nada. Audit `CREDENTIAL_TESTED` con teléfono enmascarado.
- `src/app/admin/settings/credentials/page.tsx` [NUEVO]: espacio "Credenciales" (WhatsApp token/phoneId/template + Google JSON/calendarId). Badges Conectado·cifrado / Activo desde servidor / Pendiente. Inputs se limpian al guardar; ojo local solo mientras escribes. Botón "Enviar prueba".
- `src/modules/education/lib/whatsappConfig.ts`: descifra el vault en memoria (legacy en claro migra al próximo guardado).
- `src/app/api/education/calendar/route.ts`: lee vault (`google_service_account_json`, `google_calendar_id`) > env, descifrado solo servidor.
- `src/modules/registry.ts`: entrada "Credenciales" en Ajustes. `.env.example`: documentada `CREDENTIALS_ENCRYPTION_KEY`.
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `npm test` → 8/8 ✅

**Plan ejecutado 2026-09-28 (revisión seguridad + refactor senior del vault):**
- FIX A-1 `src/app/api/education/whatsapp/send/route.ts`: exigía 0 auth y leía tenant de header inexistente → ahora sesión + roles ADMIN/DEV/STAFF/PROFESSOR, tenant solo de sesión (el vault por fin aplica aquí), audit con teléfono enmascarado, `whatsappSource` genérico.
- FIX A-2 `src/app/api/education/calendar/sync/route.ts`: aceptaba `lesson.tenantId` del body → ahora sesión + tenant solo servidor; `eduLesson.update` scoped por `{id, tenantId}` (cierra IDOR por lessonId adivinado).
- A-5 `report/route.ts`: `whatsappSource` genérico `vault|env|null` (ya no revela nombres de vars a STAFF/PROFESSOR).
- `src/lib/credentials.ts` [NUEVO]: `CREDENTIAL_DEFS` única (API+UI, con `group`), `isCredentialKey`, `LEGACY_SETTING_KEYS`, `SessionUser`, `requireVaultAdmin()`.
- `src/lib/secrets.ts`: nuevo `readVault(tenantId, keys)` (lectura+descifrado+fallo suave centralizados).
- `whatsappConfig.ts`: usa `readVault`, env-reader privado (ya no exporta secretos en tipos), nuevo `vaultSourceKind()`.
- `whatsapp.ts`: `postToGraph()` común (template+texto); fix `res.json()` sin catch en template que podía lanzar throw no controlado.
- `credentials/route.ts` + `test/route.ts`: sobre `requireVaultAdmin` + `audit()` común + tipos `CredentialKey`.
- `calendar/route.ts`: `resolveGoogleConfig` vía `readVault` (-20 líneas duplicadas).
- UI split: `useCredentials.ts` (hook con cleanup de toast) + `CredentialCard.tsx` + `page.tsx` fina (grupos derivan de `CREDENTIAL_DEFS`).
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `npm test` → 8/8 ✅
- Pendiente revisión (no aplicado): rate-limit en test, check Origin/Referer anti-CSRF, alerta `decrypt failed` vs `not configured` para rotación de llave, llave dedicada obligatoria en prod (quitar fallback backup-key), ocultar "Credenciales" en sidebar a no-ADMIN.

**Plan ejecutado 2026-09-28 (fix borrado espejo Google Calendar):**
- `src/app/api/education/calendar/sync/route.ts`: el POST devuelve también `googleCalendarId` (antes solo `googleEventId`, la agenda no podía guardar con qué calendario borrar).
- `src/modules/education/components/EducationAgenda.tsx`: `trySyncGoogle` persiste `googleEventId+googleCalendarId+synced` en estado y `localStorage` (antes fire-and-forget sin guardar nada, el `if (editing.googleEventId)` nunca se cumplía); `loadAll` y `persistLessons` conservan `googleCalendarId` (antes se perdía al recargar); `deleteSlot` manda cada ID en su campo (antes `googleCalendarId: editing.googleEventId` → el servidor respondía `skipped` y el evento quedaba huérfano en Google).
- `npx tsc --noEmit --skipLibCheck` → 0 errores ✅ · `npm test` → 8/8 ✅

**Plan ejecutado 2026-09-28 (niveles DEV/ADMIN/USUARIO + roles de trabajo ES):**
- `prisma/schema.prisma`: `UserRole` → DEV/ADMIN/USUARIO; `User` += `isActive`, `workRoles[]`, `extraModules[]`. Migración idempotente `prisma/migrations/20260928_user_levels_workroles/` (STAFF→USUARIO, PROFESSOR→USUARIO+PROFESOR vía `EduTeacherProfile`). `supabase_init.sql` alineado. `validate`+`generate` ✅
- `src/lib/access.ts` [NUEVO, puro/Edge]: catálogo PROFESOR (Educación+Contactos)/COMERCIAL (Ventas+Contactos+Comunicación)/FINANZAS (Finanzas), `resolveAccess` (DEV/ADMIN=toto, USUARIO=roles+extras, base Contactos+Conversaciones, compat JWT antiguos), `pathToModule`, `describeAccess` (tarjeta "Verá").
- `src/lib/requireModule.ts` [NUEVO] + `middleware.ts`: enforcement por módulo en Edge (403 API / redirect panel) + doble check en rutas.
- `src/lib/auth.ts` + `next-auth.d.ts`: JWT/sesión llevan `workRoles/extraModules/isActive`; login bloquea archivados.
- `src/app/api/admin/users/route.ts` [NUEVO]: GET (filtro `?workRole=`), POST (temp password, crea `EduTeacherProfile` si PROFESOR), PATCH (sin auto-baja, sin auto-demote, DEV solo gestionado por DEV, ADMIN no ve DEVs). Audit sin contraseñas.
- `src/app/admin/settings/users/page.tsx` reescrita a API real: nivel ES + chips de roles + extras + instrumentos si PROFESOR + tarjeta "Verá" en vivo + `?preset=PROFESOR`.
- `ProfessorsManager`: lee/crea/archiva contra users API (adiós semillas Ana/Carlos y `edu_professors` local). `EducationAgenda`: profesores vía `/api/education/teachers` (reescrito a `workRoles has PROFESOR`); `teachers` POST crea USUARIO+PROFESOR.
- `AdminSidebar` filtra por acceso (adiós hack professor-STAFF + fetch extra); `ClassReportPanel` vista profe para USUARIO; `search` exige sesión (cierra quema anónima de cuota Brave/OpenRouter); `report/send/sync` por módulo.
- `./init.sh` verde ✅ · `tsc` 0 ✅ · `tests` 8/8 ✅
- OJO despliegue: aplicar `npx prisma migrate deploy` en la DB real + `PINNED_TENANT_SLUG=getloud` en la instancia escuela + re-login de todos (JWT viejo sin workRoles cae a base mínima; ADMIN/DEV intactos).

**Fix 2026-09-28 (build `dns` en página Credenciales):**
- Causa: `page.tsx` (cliente) importaba `lib/credentials`, que arrastraba `auth → db → pg` (nativo Node).
- `src/lib/credentials.ts` vuelve a ser PURA (defs, sin imports). Guard + `SessionUser` movidos a `src/lib/requireVaultAdmin.ts` (solo servidor). Rutas actualizadas.
- Auditoría: ningún otro `"use client"` importa `db/auth/secrets/requireModule/tenant/provisioning/storage` ni directa ni transitivamente (`phone/clientStorage/recipients/instruments` puros).
- `tsc` 0 ✅ · `npm run build` OK ✅ · `tests` 8/8 ✅

**Deploy DB 2026-09-28 (db push equivalente, motor Prisma no alcanza pooler):**
- `migrate status/deploy` y `db push` se cuelgan desde aquí (schema engine ↔ Supabase pooler; `pg` directo sí conecta). Vía alternativa: `migrate diff --from-empty` (motor local OK) + `scripts/apply-schema-diff.mjs` (idempotente: solo crea TYPE/TABLE/INDEX/FK/columnas ausentes).
- Migración niveles aplicada a mano con `scripts/run-one-migration.mjs` (3 intentos: orden ADD VALUE, DROP DEFAULT para recrear enum). Verificado: enum DEV/ADMIN/USUARIO, 3 ADMIN intactos.
- `apply-schema-diff`: 130 aplicados / 136 ya existían. Prod: 29→51 tablas, 22 Edu* creadas y legibles. `Contact` ya traía las columnas nuevas.
- Sin `_prisma_migrations` en prod (se construyó con db push): NO ejecutar `migrate deploy` completo nunca (intentaría todo el historial). Los 2 scripts quedan en `scripts/` para futuras Diff.
- Nota: tablas Edu* sin RLS (paridad con db push; la app filtra por tenantId). Pendiente: extender `20260603_rls_tenant_isolation` o política equivalente.
- Git: commit `ed180d7` local (51 ficheros). Push BLOQUEADO: 403 en ambos remotos con ambas cuentas (`belpaneobrador` y `renoplastia` tienen `push:false` vía API en los dos repos). Falta que un admin de la org dé write a una de las dos cuentas; cuenta activa restaurada a `belpaneobrador`, commit listo para `git push`.

**Plan 2026-10-13 (feature #10 notion_contacts_sync — en curso):**
- Usuario aporta `NOTION_TOKEN` (guardado SOLO en `.env.local`, gitignored; nunca en repo/docs/chat). Objetivo: BD "Alumni" (alumnos activos).
- Siguiente: localizar la BD Alumni vía API (`POST /v1/search`), fijar `NOTION_CONTACTS_DB_ID`, mapear propiedades en `docs/notion-sync.md`, implementar `src/config/notionContacts.ts` + `POST /api/contacts/notion-sync`.

**Ejecutado 2026-10-13 (feature #10, pendiente solo de deploy + sync real):**
- BD localizada: "Alumnos (Administrativa)" (`NOTION_CONTACTS_DB_ID` en `.env.local`); 100 activos + 5 bajas. Regla usuario: Notion SOLO lectura (solo `query`, verificado sin PATCH/DELETE) + garantía en `docs/notion-sync.md`.
- Alcance recortado por el usuario a 7 campos: nombre, email, teléfono, tutor (`Padre/Madre/Tutor` = solo nombre), instrumento, ciudad, dirección + `Fecha inicio` → NUEVO `Contact.enrollmentDate` (no existía; columna aplicada en prod con `apply-schema-diff`: applied=1).
- `src/config/notionContacts.ts` [NUEVO, puro] + tests 5/5; `POST/GET /api/contacts/notion-sync` (ADMIN/DEV, upsert teléfono>email, tutores por nombre, bajas a skipped, audit sin PII); botón "Sincronizar desde Notion" + última sync en `/admin/contacts`; `recipients.ts`: TUTOR_ONLY degrada al alumno si el tutor no tiene teléfono (+ tests).
- Verificado: `tsc` 0 ✅ · tests 21/21 ✅ · `next build` OK ✅ · `init.sh` verde ✅.
- Falta: commit + push (deploy Vercel con `NOTION_TOKEN`/`NOTION_CONTACTS_DB_ID` en env) y pulsar el botón para la copia real (~100 alumnos).

**Fix build 2026-10-13 (push 85ae50e):** deploy `7d126bd` falló en Vercel con `Turbopack build failed: Can't resolve '@vercel/turbopack-next/internal/font/google/font'` (3 deploys previos en success; build local OK). Fix: fuera `next/font/google` de `layout.tsx`, pilas del sistema en `globals.css` (`--font-outfit/--font-mono`). `tsc` 0 + build local OK + tests 24/24. Push a `dst/master`, Vercel en `pending`.

**Hotfix 2026-10-13 (403 /api/admin/modes para renato, USUARIO+PROFESOR):**
- Causa exacta: `src/middleware.ts:187-188` devuelve 403 porque `pathToModule("/api/admin/modes")` era `"settings"` (`access.ts`) y el sidebar la llama con TODOS los usuarios para pintar el menú. La ruta en sí no tenía auth (el POST lo podía escribir cualquiera).
- Fix: `access.ts` sin ese mapeo (el middleware ya no bloquea); `modes/route.ts` GET exige sesión (401) y POST exige ADMIN/DEV del tenant (403). `tsc` 0 + tests 24/24 + build OK + `init.sh` verde. Sin commitear (espera orden push).

**Hotfix 2026-10-13 (renato no ve contactos tras sync Notion 94/1/0/46):**
- Causa: el filtro PROFESOR-solo-asignados cruzaba `EduLesson` en DB (vacía; las clases viven en localStorage) → lista a cero. Decisión usuario: contactos visibles para TODO el tenant.
- Fix: fuera `isProfessorOnly`/`professorAllowedContactIds` de `GET` y `PATCH` en `src/app/api/contacts/route.ts` + acceptance #11 actualizada. Sin commitear (espera orden push).

**Hotfix 2026-10-13 (Seguimiento solo mostraba alumnos locales "Test..."):**
- Causa: el buscador del modal listaba solo `eduStudents` de localStorage; los 94 de Notion viven solo en servidor.
- Fix `ClassReportPanel.tsx`: `seguimientoResults` (useMemo) = locales + contactos `ALUMNO` del servidor sin duplicar por nombre; placeholder y destinatarios resuelven por nombre contra DB (tutor incluido); botón Actualizar recarga también servidor; empty-state útil.
- `tsc` 0 ✅ · tests 24/24 ✅ · build OK ✅ · `init.sh` verde ✅. Sin commitear (espera orden push).

**Hotfix 2026-10-13 (403 /api/admin/dashboard para no-ADMIN):**
- Misma clase que modes: el panel `/admin` (todos) lee el layout pero la ruta colgaba de `settings` en middleware. Fix idéntico: GET con sesión (401), POST ADMIN/DEV del tenant (403). Verificado con el resto abajo.

**Ejecutado 2026-10-13 (feature #13 team_clocking — done, sin commitear):**
- Schema: `User.clockPin` (hash bcrypt, write-only, `sanitize` lo oculta) + `TeamClockEntry` (userId nullable SetNull + userName snapshot; sin RLS como tablas Edu) — aplicado en prod (`applied=6`, todo aditivo).
- `POST /api/team/clock {pin}`: resuelve usuario activo del tenant por PIN, toggle auto IN/OUT por último registro del día + audit; `GET`: estado propio + fichajes de hoy. Sin sesión → 401.
- `PATCH/POST /api/admin/users`: acepta `clockPin` (4-8 dígitos); UI en ficha (write-only).
- `/admin/team/fichar`: PIN pad + botón FICHAR + resultado + lista de hoy + ayuda de acceso directo; accesible a todo logueado (mapeo a `contacts` base); entrada "Fichar (terminal)" en menú para gestores.
- Verificado: `tsc` 0 ✅ · tests 25/25 ✅ · build OK ✅ · `init.sh` verde ✅ · clock sin sesión → 401 ✅.
- Nota: turnos/vacaciones conservan seeds demo restaurante (fuera de alcance); fichaje usa usuarios reales.

**Ejecutado 2026-10-13 (feature #12 user_admin_delete — done, sin commitear):**
- Solo ADMIN/DEV (el profesor ni ve Ajustes: módulo `settings` no asignable). Borrado FK-seguro: clases a `SetNull`, perfil profesor en cascada, auditoría conserva histórico.
- `src/lib/userGuards.ts` [NUEVO, puro] + tests 3/3: `canEditUser` (DEV solo por DEV), `canDeleteUser` (+ nunca a sí mismo), `normalizeLoginEmail`.
- `src/app/api/admin/users/route.ts`: PATCH acepta `email` (formato + único por tenant + audit `USER_UPDATED` con cambio); DELETE `?id=` (bloquea auto-borrado, DEV y último gestor ADMIN/DEV + audit `USER_DELETED`).
- UI Usuarios: email editable al editar (avisa que cambia el login), papelera por fila con doble confirmación (oculta para uno mismo).
- Verificado: `tsc` 0 ✅ · tests 24/24 ✅ · `next build` OK ✅ · `init.sh` verde ✅ · DELETE sin sesión → 401 ✅.
- Petición usuario: mismos contactos/alumnos en PC y móvil, scoped por usuario logueado. Se elige #11 (la #10 queda pending hasta tener credenciales Notion).
- Entorno: `init.sh` fallaba por `node_modules` sin `googleapis`/`xlsx` + Prisma client desactualizado (+ `prisma` CLI sin `DATABASE_URL` en shell). Resuelto con `npm install --legacy-peer-deps` + `prisma generate` con `DATABASE_URL` de `.env.local`. `tsc --noEmit --skipLibCheck` → 0 errores.
- Alcance: `GET/POST/PATCH/DELETE /api/contacts` (tenant de sesión + AuditLog + relación tutor), `/admin/contacts` vía API + botón "Importar contactos locales" (ADMIN/DEV, dedupe `phoneNormalized`, idempotente), recipients con fallback local, PROFESOR solo asignados.

**Ejecutado 2026-10-13 (feature #11 done):**
- `src/lib/contactSync.ts` [NUEVO, puro]: `mapInstrumentToDb/FromDb` (GUITARRA UI ↔ GUITARRA_ACUSTICA DB), `validateContactPayload`, `contactDedupeKey` (teléfono>email>nombre), `splitPhone`. `src/__tests__/contactSync.test.ts` [NUEVO] 5/5 ✅
- `src/app/api/contacts/route.ts` [NUEVO]: GET paginado+búsqueda+filtros scoped tenantId; PROFESOR solo asignados (teacherId de sus EduLesson → contactos alumno+tutor); POST/PATCH con validación+409 por teléfono+enlaces tutor+AuditLog; DELETE solo ADMIN/DEV (lógico). `import/route.ts` [NUEVO]: POST bulk ADMIN/DEV idempotente + 2ª pasada tutores + audit. `access.ts`: `/api/contacts → contacts` en pathToModule.
- `/admin/contacts`: modo servidor (fetch API, CRUD API, sin seed demo, banner verde) + fallback local offline (banner ámbar + reintentar) + botón "Subir locales (N)" + import Excel vía API. `ClassReportPanel`: destinatarios prefieren ficha DB (id real+tutor) con fallback local. `StudentsManager`: desplegable de contactos desde API con fallback.
- Verificado: `tsc` 0 ✅ · `npm test` 13/13 ✅ · `next build` OK (`/api/contacts`, `/api/contacts/import`) ✅ · `init.sh` verde ✅ · rutas responden 401 sin sesión ✅ (sin escrituras en prod: `Contact` sigue con 0 filas hasta que el usuario importe)
- Sin commitear: a la espera de orden para commit+push a `dst/master` (despliegue Vercel).

**Pendiente (anterior):**
- Configurar `GOOGLE_SERVICE_ACCOUNT_JSON` y `GOOGLE_CALENDAR_ID` en `.env` para activar sincronización real con Google Calendar
- Configurar `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` (= `WHATSAPP_PHONE_ID` legacy) para envío real por WhatsApp Cloud API
- `prisma db push` / migrate para aplicar los nuevos campos en la DB del tenant cuando toque

**Plan ejecutado 2026-10-13 (reporte por click-to-chat + pestañas profesor + módulo Artista):**
- Repo sincronizado: `master` pasa a trackear `origin` (GetLoudSpace/palmerp, rápido-forward a `7706363`); autor de commits locales = `Palm-ERP <326903259+Palm-ERP@users.noreply.github.com>`
- `src/modules/education/components/ClassReportPanel.tsx`: el reporte de clase **ya no llama a Cloud API** — siempre click-to-chat `wa.me` con texto pre-rellenado por destinatario; fix destinatarios vacíos al abrir desde "Seguimiento" (ahora invoca `openRecipients`); dedupe de fichas duplicadas por `id` (clave React repetida); registro de cada envío en localStorage `edu_wa_outbox` (últ. 200) + evento `palmera_wa_outbox_updated`
- `src/modules/education/components/TeacherTabs.tsx` [NUEVO]: pestañas "Clases de hoy | Curso Guitarra | Registro de envíos" en `/admin/education` (incluye `GuitarCourseViewer` embebido)
- `src/modules/education/components/SendLogPanel.tsx` [NUEVO]: historial fusionado `edu_wa_outbox` (reportes wa.me) + `edu_outbox` (flujo Clases & Seguimiento), badges de estado y botón vaciar
- `src/app/admin/education/page.tsx`: eliminado `ProfessorsManager` (la gestión de profesores vive en Usuarios & Permisos); usa `TeacherTabs`
- Menús (`registry.ts` + `education/module.ts`): fuera "Curso Guitarra" (pestaña del profesor), "Alumnos" (se ve en Contactos filtrando categoría Alumno) y "Artista" de EDUCACION
- Artista como módulo aparte `ARTISTA` (mismo nivel que Educación): nuevo `src/app/admin/artist/page.tsx` (reusa `ArtistWorkspace`), assignable como extra, rol PROFESOR lo incluye, `pathToModule` `/admin/artist → ARTISTA`. Requiere activar el modo en Gestión de modos (o por defecto para PROFESOR vía acceso)
- `tsc` 0 ✅ · `./init.sh` verde ✅

**Preparado 2026-10-13 (sync de contactos desde Notion — tareas pendientes #10 y #11):**
- Decisiones de producto: fuente de verdad de contactos = **Notion** (GHL no: el add-on de WhatsApp de GHL cuesta y el envío ya lo cubre wa.me); Palmerp solo sincroniza **Alumnos y Tutores**; objetivo real = varios usuarios compartiendo datos → exige DB (hoy `/admin/contacts` vive en localStorage).
- `feature_list.json`: añadidas #10 `notion_contacts_sync` (pending) y #11 `contacts_shared_db` (pending) con acceptance cerrada.
- `docs/notion-sync.md`: checklist de implementación con tabla de mapeo Notion→`Contact` a rellenar (inputs pendientes: `NOTION_TOKEN`, `NOTION_CONTACTS_DB_ID`, nombres exactos de propiedades + 1 JSON de ejemplo), diseño acordado (upsert por `phoneNormalized`, 2ª pasada para `ContactTutorStudent`, 501 sin creds, botón sync en `/admin/contacts`) y orden de ejecución.
- Verificado: `feature_list.json` válido ✅ · `./init.sh` verde ✅
