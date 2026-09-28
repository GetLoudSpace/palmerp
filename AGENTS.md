<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Mapa de navegación para agentes de IA (Palm ERP Core)

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en este repositorio. NO es una biblia de reglas: es un **mapa**. Lee solo lo que necesites cuando lo necesites (divulgación progresiva).

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta `./init.sh` y verifica que termine sin errores. Si falla, **para** y resuelve el entorno antes de tocar código de la aplicación.
2. Lee `progress/current.md` para entender en qué estado quedó la última sesión de desarrollo. Si existe `progress/.checkpoint.json`, léelo también: es la huella automática más reciente y manda sobre recuerdos vagos.
3. Lee `feature_list.json` y elige **una** tarea con estado `pending`. No trabajes en más de una a la vez para evitar colisiones de contexto.

## 2. Mapa del repositorio

| Archivo / carpeta | Qué contiene | Cuándo leerlo |
| :--- | :--- | :--- |
| `feature_list.json` | Lista de tareas del Core con estado (`pending` / `in_progress` / `done`) | Siempre, al empezar la sesión |
| `progress/current.md` | Estado de la sesión actual y plan activo | Siempre, al empezar la sesión |
| `progress/.checkpoint.json` | Huella automática (fecha, trigger, estados) escrita por el plugin tras cada tarea/cambio | Siempre, al empezar la sesión (si existe, manda sobre la memoria) |
| `progress/history.md` | Bitácora append-only de sesiones anteriores | Para contexto histórico y ver qué se hizo antes |
| `docs/architecture.md` | Estructura del Core, base de datos agnóstica y módulos | Antes de implementar un cambio |
| `docs/conventions.md` | Convenciones de TypeScript, Next.js App Router y Prisma | Antes de escribir código |
| `docs/verification.md` | Cómo verificar que tus páginas y APIs funcionan | Antes de declarar una tarea como `done` |
| `CHECKPOINTS.md` | Criterios objetivos de "estado final correcto" | Para auto-evaluación del implementador y revisor |
| `.claude/agents/` | Definición de los subagentes (líder, implementador, revisor) | Si estás orquestando el trabajo |
| `src/app/` | Rutas y layouts del Next.js App Router (Core + Módulos) | Para codificar vistas o endpoints |
| `src/components/` | Componentes de la interfaz de usuario (Layouts, UI, CRM) | Para diseñar el Shell o widgets de UI |
| `prisma/` | Esquema de base de datos relacional | Para modificar o revisar modelos |

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de múltiples tareas en una sola sesión de git/progreso.
- **No declares una tarea `done` sin pruebas y compilación correctas.** Ejecuta `./init.sh` y asegúrate de que el compilador de TypeScript (`npx tsc --noEmit`) y la compilación de Next.js pasen sin errores.
- **Documenta lo que haces** en `progress/current.md` en tiempo real mientras programas, no al final.
- **Autoguardado automático (no depende de recordar):** el plugin `.opencode/plugin/session-checkpoint.js` escribe `progress/.checkpoint.json` tras cada tarea (`todowrite`) o cambio (`edit`/`write`). Si la conversación se cierra sin querer, la siguiente sesión retoma desde esa huella + `current.md` + `feature_list.json`. El comando `/cierre` ejecuta el lifecycle completo.
- **Deja el repositorio limpio** antes de cerrar la sesión (sin logs de pruebas basura o debuggers colgados).
- **Si no sabes algo, busca en `docs/` o pregunta.** No inventes workarounds que violen la arquitectura modular.

## 4. Cómo elegir una tarea

```text
1. Abre feature_list.json
2. Filtra por status == "pending"
3. Coge la de menor "id" (orden secuencial lógico del core)
4. Cambia su status a "in_progress" y guarda
5. Anota en progress/current.md: feature, hora de inicio, plan breve
```

## 5. Cierre de sesión (lifecycle)

Antes de terminar:

1. Ejecuta `./init.sh` — asegúrate de que todo compile y esté en verde.
2. Si la tarea está acabada: cambia su estado a `done` en `feature_list.json`.
3. Mueve el resumen de cambios del día de `progress/current.md` al final de `progress/history.md`.
4. Vacía `progress/current.md` dejando solo la plantilla inicial.
5. No dejes comentarios de prueba o archivos temporales no deseados.
