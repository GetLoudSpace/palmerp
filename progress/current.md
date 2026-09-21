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

**Pendiente:**
- Configurar `GOOGLE_SERVICE_ACCOUNT_JSON` y `GOOGLE_CALENDAR_ID` en `.env` para activar sincronización real con Google Calendar
- Configurar `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` para envío real por WhatsApp Cloud API
- `prisma db push` / migrate para aplicar los nuevos campos en la DB del tenant cuando toque
