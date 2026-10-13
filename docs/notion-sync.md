# Notion → Palmerp: sincronización de contactos (borrador de preparación)

> Tarea asociada: `feature_list.json` #10 (`notion_contacts_sync`) y #11 (`contacts_shared_db`).
> Estado: **PENDIENTE — esperando credenciales y esquema real de Notion**. Este documento es el checklist para que, cuando lleguen, implementar sea llenar huecos, no diseñar.

## Contexto (2026-10-13)

- **Fuente de verdad de contactos: la base de datos de Notion** (allí vive todo: alumnos, tutores, teléfonos). GHL está conectado a Notion, pero **no** será la fuente para Palmerp: el add-on de WhatsApp de GHL cuesta (~$10/mes + uso) y ya cubrimos el envío con click-to-chat `wa.me`.
- Palmerp solo necesita **Alumnos y Tutores** (no todos los contactos).
- Para que varios usuarios compartan los datos, la sync escribe en **Prisma (`Contact`)**, no en localStorage. Esto obliga antes o después a la tarea #11 (contactos en DB compartida), porque hoy `/admin/contacts` vive en `palmera_contacts_<slug>`.

## Inputs que faltan (rellenar cuando estén)

| Clave `.env` | Qué es | Dónde se obtiene | Valor |
| :--- | :--- | :--- | :--- |
| `NOTION_TOKEN` | Internal integration secret | notion.so → Settings → Connections & APIs → Add internal integration (se le comparte la BD en la página de Notion con "Add connections") | ⬜ |
| `NOTION_CONTACTS_DB_ID` | ID de la base de datos de contactos | URL de la BD: `notion.so/<workspace>/<32-hex>?v=...` → los 32 hex (con o sin guiones) | ⬜ |

## Esquema real de la BD de Notion (pegar aquí las propiedades exactas)

| Propiedad Notion (nombre exacto) | Tipo Notion (title/rich_text/phone_number/select/relation/date/…) | → Campo Palmerp | Notas |
| :--- | :--- | :--- | :--- |
| ⬜ Nombre | ⬜ | `Contact.name` | |
| ⬜ Teléfono | ⬜ | `Contact.phone` + `phoneNormalized` | ¿formato `+34…` o 9 dígitos sueltos? |
| ⬜ Email | ⬜ | `Contact.email` | opcional |
| ⬜ Tipo (Alumno/Tutor) | ⬜ | `Contact.category` (`ALUMNO`/`TUTOR`) | ¿select o multi-select? ¿valores exactos en español? |
| ⬜ Fecha nacimiento | ⬜ | `Contact.birthDate` | define menor → tutor recibe reportes |
| ⬜ Instrumento | ⬜ | `Contact.instrument` | enum Palmerp `Instrument` |
| ⬜ Tutor/a (relación alumno→contacto) | ⬜ | `ContactTutorStudent(studentId, tutorId, relation)` | ¿relation a la misma BD? |
| ⬜ Parentesco (madre/-padre/…) | ⬜ | `ContactTutorStudent.relation` | |
| ⬜ Profe asignado | ⬜ | vía `EduStudent`/usuario Palmerp | decidir si se sincroniza ya |

- [ ] Pegar aquí **un ejemplo JSON** de una página alumno y otra tutor (GET `https://api.notion.com/v1/databases/{id}/query` con `Notion-Version: 2022-06-28`) para fijar la forma de cada `property`.

## Diseño acordado (no re-diseñar, solo ejecutar)

1. `src/config/notionContacts.ts`: mapeo puro `NotionPage → { fields, category, tutorRef }` con los nombres exactos de arriba (único sitio que cambia si Notion cambia).
2. `POST /api/contacts/notion-sync` (ADMIN/DEV, sesión = tenant):
   - query paginada (cursor 100/100) con filter `Tipo in [Alumno, Tutor]` si el esquema lo permite; si no, filtra en código tras el mapeo;
   - upsert por `phoneNormalized` (usa `normalizePhoneES` de `src/lib/phone.ts`; `34` + 9 dígitos si procede);
   - sin teléfono válido → `skipped[]` (NUNCA crear Contact sin teléfono: `ClassReportPanel` ya lo gestiona);
   - 2ª pasada: resolver `tutorRef` (por id de página Notion guardado en un Setting `notion_page_id` del Contact, no por nombre) → `ContactTutorStudent`;
   - `AuditLog` `SYNC_NOTION_CONTACTS` con conteos `created/updated/skipped` (nunca datos personales);
   - respuesta `{ created, updated, unchanged, skipped, errors }`.
   - Sin `NOTION_TOKEN`/DB_ID → `501 { error: "Notion no configurado" }` (mismo patrón que `configured:false` de Calendar/WhatsApp).
3. UI: botón **"Sincronizar desde Notion"** en `/admin/contacts` + último resultado guardado en el AuditLog (se muestra "última sync: X creados / Y actualizados, fecha").
4. Cron opcional: reutilizar la ruta con secreto interno, patrón `src/app/api/cron/*` existente.

## Reglas que no se tocan (de `recipients.ts` / arquitectura)

- 1 alumno = 1 `Contact` + 1 tutor único; mismo teléfono en tutor y alumno = 1 solo contacto, 1 envío.
- Menor con tutor → `commsMode = TUTOR_ONLY`; adulto sin tutor → STUDENT_ONLY.
- `tenantId` SIEMPRE desde sesión (nunca del body) — ver fix A-1/A-2 de `progress/history.md`.

## Orden de ejecución cuando esté todo

1. Rellenar tabla de arriba + ejemplo JSON → commit docs.
2. Feature #10 (sync a Prisma) → prueba contra BD real de `getloud`.
3. Feature #11 (UI de contactos sobre API/DB) → entonces el Seguimiento multiusuario es real.
4. (Opcional) cron + import masivo inicial.
