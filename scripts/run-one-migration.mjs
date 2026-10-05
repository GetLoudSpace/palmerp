// scripts/run-one-migration.mjs — uso puntual: aplica un migration.sql idempotente
// statement a statement (sin transacción global: ADD VALUE no la permite).
// node scripts/run-one-migration.mjs prisma/migrations/XXXX/migration.sql
import { readFileSync } from "node:fs";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env" });

const file = process.argv[2];
if (!file) throw new Error("falta ruta del migration.sql");
const sql = readFileSync(file, "utf8");

const stmts = [];
let cur = "";
let inDo = false;
for (const line of sql.split("\n")) {
  if (/^\s*--/.test(line) && !inDo) continue;
  cur += line + "\n";
  const opens = (line.match(/\$\$/g) || []).length;
  if (opens % 2 === 1) inDo = !inDo;
  if (!inDo && /;\s*$/.test(line)) {
    const s = cur.trim();
    if (s) stmts.push(s);
    cur = "";
  }
}
if (cur.trim()) throw new Error("bloque sin cerrar: " + cur.slice(0, 120));

console.log("STATEMENTS:", stmts.length);
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await client.connect();
for (let i = 0; i < stmts.length; i++) {
  await client.query(stmts[i]);
  console.log("OK", i + 1);
}
await client.end();
console.log("DONE");
