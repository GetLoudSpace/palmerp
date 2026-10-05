---
description: Cierre de sesión del harness (verifica, rota historial, resetea current).
---

Ejecuta el cierre de sesión del lifecycle de AGENTS.md, en este orden:

1. `./init.sh` — debe terminar en verde. Si falla, para y resuelve antes de seguir.
2. Lee `feature_list.json`: verifica que no quede ninguna feature en `in_progress` a medias (pásala a `pending` con nota, o a `done` solo si cumple "require_tests_to_close").
3. Lee `progress/current.md` y `progress/history.md`: mueve el resumen de la sesión (lo posterior a la plantilla inicial) al final de `history.md` con fecha `YYYY-MM-DD` y commits implicados.
4. Resetea `progress/current.md` a la plantilla inicial (título + Estado en espera + checklist del plan).
5. `git status`: el árbol debe quedar limpio de basura (logs, .tmp, debuggers). No borres trabajo sin commitear salvo temporales evidentes.
6. Si hay cambios pendientes de `progress/` (o de código ya verificado que el usuario pidió commitear), haz commit con mensaje `docs:` o `feat:` según corresponda. Solo haz push si el usuario lo pidió explícitamente en esta sesión.
7. Confirma al usuario: init en verde, dónde quedó el historial y qué queda pendiente (si algo).

No inventes contenido para el historial: resume solo lo que consta en `current.md`, el diff y el log de git.
