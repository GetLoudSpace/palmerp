// Plugin opencode (auto-descubierto en .opencode/plugin/): autoguardado del harness.
// Después de cada tarea (todowrite) o cambio de código (edit/write), deja una
// huella mínima en progress/.checkpoint.json para poder retomar la sesión
// aunque se cierre sin querer. Nunca commitea ni toca feature_list.json.
// Seguro por diseño: todo va en try/catch, throttling 30s, y solo actúa en
// repos con feature_list.json (harness Palm ERP).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TRIGGERS = new Set(["todowrite", "edit", "write"]);
const THROTTLE_MS = 30 * 1000;

export default async (ctx) => {
  const root = (ctx && ctx.directory) || process.cwd();
  let lastWrite = 0;

  return {
    "tool.execute.after": async (input) => {
      try {
        const tool =
          (input && (input.tool || input.name || input.toolName)) || "";
        if (!TRIGGERS.has(tool)) return;
        const now = Date.now();
        if (now - lastWrite < THROTTLE_MS) return;
        lastWrite = now;

        const featureList = join(root, "feature_list.json");
        if (!existsSync(featureList)) return;

        let features = "";
        try {
          const fl = JSON.parse(readFileSync(featureList, "utf8"));
          features = (fl.features || [])
            .map((f) => `${f.id}:${f.status}`)
            .join(" ");
        } catch {
          // sin estado legible: se guarda la huella igualmente
        }

        const dir = join(root, "progress");
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          join(dir, ".checkpoint.json"),
          JSON.stringify(
            { at: new Date().toISOString(), trigger: tool, features },
            null,
            1
          ) + "\n"
        );
      } catch {
        // el autoguardado nunca debe romper la sesión
      }
    },
  };
};
