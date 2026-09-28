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

**Pendiente:**
- Configurar `GOOGLE_SERVICE_ACCOUNT_JSON` y `GOOGLE_CALENDAR_ID` en `.env` para activar sincronización real con Google Calendar
- Configurar `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` (= `WHATSAPP_PHONE_ID` legacy) para envío real por WhatsApp Cloud API
- `prisma db push` / migrate para aplicar los nuevos campos en la DB del tenant cuando toque
