"use client";
import React, { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { getLastWord, getRhymes, RhymeType } from "../lib/rhyme";

export default function Rimador({ text, onInsert }: { text: string; onInsert: (w: string) => void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<RhymeType>("ambas");
  const last = useMemo(() => getLastWord(text), [text]);
  const effective = query.trim() || last;
  const rhymes = useMemo(() => effective ? getRhymes(effective, type, 20) : [], [effective, type]);

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Icons.Search className="h-4 w-4 text-amber-500" /> Rimador</div>
      <p className="mt-1 text-[11px] text-muted-foreground">Última palabra: <span className="font-bold text-foreground">{last || "—"}</span> · Sugerencias {type}</p>
      <div className="mt-3 flex gap-2">
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Escribe palabra y busca rima" className="flex-1 rounded-xl border border-border/40 bg-background px-3 py-2 text-xs outline-none focus:border-amber-500" />
        <select value={type} onChange={(e)=>setType(e.target.value as RhymeType)} className="rounded-xl border border-border/40 bg-background px-2 py-2 text-xs">
          <option value="ambas">Ambas</option><option value="consonante">Consonante</option><option value="asonante">Asonante</option>
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {rhymes.length === 0 ? <span className="text-xs text-muted-foreground">Sin rimas — escribe otra palabra.</span> :
          rhymes.map((r)=>(
            <button key={r.word} onClick={()=>onInsert(r.word)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${r.type==="consonante"?"bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400":"bg-muted border-border/40"}`}>{r.word} <span className="text-[9px] opacity-60">{r.type==="consonante"?"C":"A"}</span></button>
          ))}
      </div>
    </div>
  );
}
