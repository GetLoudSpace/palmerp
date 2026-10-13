# Notion → Palmerp: sincronización de contactos (borrador de preparación)

> Tarea asociada: `feature_list.json` #10 (`notion_contacts_sync`) y #11 (`contacts_shared_db`, hecha 2026-10-13).
> Estado: **EN CURSO — BD localizada y mapeada 2026-10-13**. `NOTION_TOKEN` guardado solo en `.env.local` (gitignored).

## Base de datos objetivo (verificado vía API 2026-10-13)

- **BD: "Alumnos (Administrativa)"** — `NOTION_CONTACTS_DB_ID=26a1fcee-f7db-8034-896f-cdfde03a55d6` (guardado en `.env.local`, nunca en docs/código).
- Volumen: **100 activos** (`Fecha baja` vacía) + 5 bajas. La sync importa activos; las bajas van a `skipped[]` (nunca borra Contactos locales huérfanos).

## Esquema real → mapeo Palmerp

| Propiedad Notion (nombre exacto) | Tipo Notion | → Campo Palmerp | Notas |
| :--- | :--- | :--- | :--- |
| `Alumno` | title | `Contact.name` | nombre del alumno |
| `Phone` | phone_number | `Contact.phone` + `phoneNormalized` | formato con prefijo (verificado presente); dedupe por normalizado |
| `Email` | email | `Contact.email` | opcional, a veces vacío |
| `Padre/Madre/Tutor` | rich_text | tutor: nuevo `Contact` (`TUTOR`, solo nombre, sin teléfono) + `ContactTutorStudent` | es SOLO nombre (sin dígitos verificado): el tutor queda sin teléfono → recipients degradan al alumno (ver fix abajo) |
| `Edad` | number | menor = `<18` (sin `birthDate` en Notion) | `null` = se trata como adulto; define tutor/comms por defecto |
| `Instrumento` | multi_select | `Contact.instrument` (primero = principal) | `Batería→BATERIA, Canto→VOZ, Piano→PIANO, Bajo→BAJO, Guitarra Ac.→GUITARRA_ACUSTICA, Guitarra E.→GUITARRA_ELECTRICA` |
| `Ciudad` | select | `Contact.billingCity` | valores Vallès/Barcelona; a veces vacío |
| `Dirección` | rich_text | `Contact.billingStreet` | a veces vacío |
| `Fecha inicio` | date | `Contact.enrollmentDate` (NUEVO 2026-10-13: no existía en Palmerp, añadido al schema) | fecha de inscripción del alumno |
| `Día` / `Hora (individual)` | multi_select / rich_text | NO se sincronizan (decidido con el usuario 2026-10-13: solo los 7 campos) | |
| `Fecha baja` | date | filtro activo (vacía) / `skipped("baja")` | + `Estado de pagos` en Baja definitiva/julio/Congelado → también `skipped("baja")` |
| `Profe` | people | NO se sincroniza en #10 (decidido: visibilidad profe va por `EduLesson.teacherId`, feature #11) | se reevalúa si piden asignar clases |
| `Cuota mensual`, `Estado de pagos`, `Ficha`, `Fuente`, `Riesgo`, `Renovación`, `Reseña Google`, `WhatsApp`, `Instrumento gratuito`, `Banda`, `Diario de clases`, `Lead de origen`, `Fecha inicio` | varios | NO se sincronizan (finanzas/operativa fuera de alcance) | |

## Contexto (2026-10-13)

- **Fuente de verdad de contactos: la base de datos de Notion** (allí vive todo: alumnos, tutores, teléfonos). GHL está conectado a Notion, pero **no** será la fuente para Palmerp: el add-on de WhatsApp de GHL cuesta (~$10/mes + uso) y ya cubrimos el envío con click-to-chat `wa.me`.
- Palmerp solo necesita **Alumnos y Tutores** (no todos los contactos).
- Para que varios usuarios compartan los datos, la sync escribe en **Prisma (`Contact`)**, no en localStorage. Esto obliga antes o después a la tarea #11 (contactos en DB compartida), porque hoy `/admin/contacts` vive en `palmera_contacts_<slug>`.

## Inputs que faltan (rellenar cuando estén)

| Clave `.env` | Qué es | Dónde se obtiene | Valor |
| :--- | :--- | :--- | :--- |
| `NOTION_TOKEN` | Internal integration secret | notion.so → Settings → Connections & APIs | ✅ en `.env.local` (aportado por el usuario 2026-10-13) |
| `NOTION_CONTACTS_DB_ID` | ID de la base de datos de contactos | verificado vía `POST /v1/search` | ✅ `26a1fcee-…` en `.env.local` ("Alumnos (Administrativa)") |

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

- [x] Estructura de página verificada con 2 fichas reales (2026-10-13): solo se registran tipos/presencia, **nunca valores personales**. Ejemplo SINTÉTICO con la misma forma (los tests usan esta fixture, no datos reales):
```json
{ "object": "page", "id": "00000000-0000-0000-0000-000000000000",
  "properties": {
    "Alumno": { "type": "title", "title": [{ "plain_text": "Nombre Ejemplo" }] },
    "Phone": { "type": "phone_number", "phone_number": "+34600111222" },
    "Email": { "type": "email", "email": "ejemplo@mail.es" },
    "Padre/Madre/Tutor": { "type": "rich_text", "rich_text": [{ "plain_text": "Madre Ejemplo" }] },
    "Edad": { "type": "number", "number": 12 },
    "Instrumento": { "type": "multi_select", "multi_select": [{ "name": "Batería" }] },
    "Ciudad": { "type": "select", "select": { "name": "Ripollet" } },
    "Dirección": { "type": "rich_text", "rich_text": [{ "plain_text": "Calle Ejemplo 1" }] },
    "Día": { "type": "multi_select", "multi_select": [{ "name": "Jueves" }] },
    "Hora (individual)": { "type": "rich_text", "rich_text": [{ "plain_text": "17:30-18:30" }] },
    "Fecha baja": { "type": "date", "date": null },
    "Estado de pagos": { "type": "status", "status": { "name": "✅Al corriente" } } } }
```

## Garantía de solo-lectura sobre Notion (regla del usuario 2026-10-13)

- La sync **solo lee** Notion (`POST /v1/databases/{id}/query` = endpoint de lectura; `GET /v1/databases/{id}` para esquema). **Jamás** llama a crear/actualizar/borrar páginas (`PATCH`/`DELETE` no existen en el código — verificado por búsqueda).
- Los datos de Notion solo se copian al ERP (`Contact`/`ContactTutorStudent` del tenant de sesión). Nunca se escribe nada de vuelta.
- El token vive solo en `.env.local` (gitignored) y en Vercel env. Nunca en repo, docs ni logs.

## Diseño acordado (no re-diseñar, solo ejecutar)

1. `src/config/notionContacts.ts`: mapeo puro `NotionPage → { fields, category, tutorRef }` con los nombres exactos de arriba (único sitio que cambia si Notion cambia).
2. `POST /api/contacts/notion-sync` (ADMIN/DEV, sesión = tenant):
   - query paginada (cursor 100/100) SIN filtro Notion (no hay propiedad Tipo); filtra en código: `Fecha baja` vacía + `Estado de pagos` fuera de baja → activo, resto a `skipped[]` con motivo `baja`;
   - upsert por `phoneNormalized` (usa `normalizePhoneES`; `34` + 9 dígitos si procede); sin teléfono válido → `skipped[]` (NUNCA crear Contact sin teléfono, salvo tutores por nombre — ver punto siguiente);
   - tutores: `Padre/Madre/Tutor` es solo nombre → `Contact` categoría `TUTOR` sin teléfono (dedupe por nombre exacto) + `ContactTutorStudent`; sin tutor informado → alumno sin enlace (adulto o pendiente);
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
