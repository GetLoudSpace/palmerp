// scripts/apply-schema-diff.mjs — uso puntual cuando el motor Prisma no alcanza la DB
// (p. ej. pooler Supabase). Aplica el DDL de `prisma migrate diff --from-empty`
// SOLO para lo que falte: CREATE TYPE/TABLE/INDEX/CONSTRAINT por nombre y
// columnas ausentes en tablas existentes. Idempotente: re-ejecutable sin daño.
//
//   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > /tmp/full_schema.sql
//   node scripts/apply-schema-diff.mjs /tmp/full_schema.sql
import { readFileSync } from "node:fs";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env" });

const file = process.argv[2];
if (!file) throw new Error("falta ruta del .sql");
const sql = readFileSync(file, "utf8");

// Split en statements (el DDL de migrate diff no trae bloques DO, pero se respeta $$).
const stmts = [];
{
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
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await client.connect();

const tables = new Set((await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`)).rows.map((r) => r.tablename));
const colMap = new Map();
for (const t of tables) {
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1`, [t]);
  colMap.set(t, new Set(cols.rows.map((r) => r.column_name)));
}
const indexes = new Set((await client.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public'`)).rows.map((r) => r.indexname));
const constraints = new Set((await client.query(`SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace`)).rows.map((r) => r.conname));
const types = new Set((await client.query(`SELECT typname FROM pg_type WHERE typnamespace='public'::regnamespace`)).rows.map((r) => r.typname));

let applied = 0;
let skipped = 0;
const apply = async (label, stmt) => {
  await client.query(stmt);
  applied++;
  console.log("APPLY", label);
};

for (const s of stmts) {
  let m;
  if ((m = s.match(/^CREATE TYPE "([^"]+)"/))) {
    if (types.has(m[1])) skipped++;
    else await apply(`TYPE ${m[1]}`, s);
  } else if ((m = s.match(/^CREATE TABLE "([^"]+)"/))) {
    const table = m[1];
    if (!tables.has(table)) {
      await apply(`TABLE ${table}`, s);
    } else {
      // Tabla existente: rellenar columnas ausentes.
      const body = s.slice(s.indexOf("("), s.lastIndexOf(")"));
      for (const line of body.split("\n")) {
        const cm = line.match(/^\s*"([^"]+)"\s+(.+?)\s*,?\s*$/);
        if (!cm) continue;
        const [, col, def] = cm;
        if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)/i.test(col)) continue;
        if (colMap.get(table)?.has(col)) continue;
        let colDef = def.replace(/,$/, "");
        const hasDefault = /DEFAULT/i.test(colDef);
        if (/NOT NULL/i.test(colDef) && !hasDefault) {
          colDef = colDef.replace(/NOT NULL/i, "").trim();
          console.log(`  (nullable por tabla poblada: ${table}.${col})`);
        }
        await apply(`COLUMN ${table}.${col}`, `ALTER TABLE "${table}" ADD COLUMN "${col}" ${colDef}`);
        colMap.get(table)?.add(col);
      }
      skipped++;
    }
  } else if ((m = s.match(/^CREATE (?:UNIQUE )?INDEX "([^"]+)" ON/))) {
    if (indexes.has(m[1])) skipped++;
    else await apply(`INDEX ${m[1]}`, s);
  } else if ((m = s.match(/^ALTER TABLE "[^"]+" ADD CONSTRAINT "([^"]+)"/))) {
    if (constraints.has(m[1])) skipped++;
    else await apply(`FK ${m[1]}`, s);
  } else {
    console.log("SKIP (no reconocido):", s.slice(0, 80).replace(/\n/g, " "));
    skipped++;
  }
}

await client.end();
console.log(`DONE applied=${applied} skipped=${skipped}`);
