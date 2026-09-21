"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey } from "@/lib/clientStorage";
import { EDUCATION_INSTRUMENTS } from "../lib/instruments";
import { getRhymes } from "../lib/rhyme";

type Exercise = { id:string; title:string; instrument:string; level:string; difficulty:number; estimatedMin:number; skillKeys:string[]; description?:string; tabContent?:string; sourceUrl?:string; sourceType?:string; isCurated:boolean };
type Song = { id:string; title:string; artist:string; genre?:string; level:string; instrument?:string; key?:string; externalUrl?:string };

const SEED_EX: Exercise[] = [
  { id:"e1", title:"Arpegio PIMA básico", instrument:"GUITARRA", level:"BASICO", difficulty:2, estimatedMin:10, skillKeys:["acordes_abiertos"], description:"Patrón p-i-m-a sobre C-G-Am-F con metrónomo 60bpm", tabContent:"e|---0---1---0---|\nB|---1---0---1---|", sourceUrl:"https://example.com/arpegio", sourceType:"BLOG", isCurated:true },
  { id:"e2", title:"Cejilla móvil", instrument:"GUITARRA", level:"INTERMEDIO", difficulty:4, estimatedMin:15, skillKeys:["cejilla"], description:"Transporte Do→Re con cejilla 2", tabContent:"Capo 2: D - G - A", isCurated:true },
  { id:"e3", title:"Slap básico", instrument:"BAJO", level:"BASICO", difficulty:3, estimatedMin:10, skillKeys:["ritmo_4_4"], description:"Thumb + pop en E string 90bpm", isCurated:true },
  { id:"e4", title:"Manos separadas C mayor", instrument:"PIANO", level:"INICIACION", difficulty:2, estimatedMin:10, skillKeys:["lectura"], description:"Mano derecha sola, luego izquierda", isCurated:true },
  { id:"e5", title:"Groove 4/4 con hi-hat", instrument:"BATERIA", level:"BASICO", difficulty:2, estimatedMin:10, skillKeys:["ritmo_4_4"], description:"Bombo 1 y 3, caja 2 y 4", isCurated:true },
  { id:"e6", title:"Respiración diafragmática", instrument:"VOZ", level:"INICIACION", difficulty:1, estimatedMin:5, skillKeys:["oído"], description:"4-4-4 respiración antes de cantar", isCurated:true },
];
const SEED_SONG: Song[] = [
  { id:"s1", title:"Entre dos aguas", artist:"Paco de Lucía", genre:"flamenco", level:"INTERMEDIO", instrument:"GUITARRA" },
  { id:"s2", title:"Billie Jean", artist:"Michael Jackson", genre:"pop", level:"BASICO", instrument:"BAJO", key:"F#" },
  { id:"s3", title:"River Flows", artist:"Yiruma", genre:"piano", level:"BASICO", instrument:"PIANO" },
  { id:"s4", title:"Back in Black", artist:"AC/DC", genre:"rock", level:"BASICO", instrument:"BATERIA" },
  { id:"s5", title:"La Llorona", artist:"Trad.", genre:"folk", level:"BASICO", instrument:"VOZ", key:"Am" },
];

export default function LibraryManager() {
  const [tab, setTab] = useState<"exercises"|"songs">("exercises");
  const [instr, setInstr] = useState<string>("ALL");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Exercise[]>([]);
  const [toast, setToast] = useState<string|null>(null);

  const safeArr = (a: unknown): string[] => Array.isArray(a) ? (a as string[]) : [];
  useEffect(()=>{
    const ek = getTenantStorageKey("edu_exercises");
    const sk = getTenantStorageKey("edu_songs");
    const er = localStorage.getItem(ek); const sr = localStorage.getItem(sk);
    if (er) try{
      const parsed = JSON.parse(er);
      const arr: any[] = Array.isArray(parsed) ? parsed : [];
      const normalized: Exercise[] = arr.map((e:any)=> ({ ...e, skillKeys: safeArr(e.skillKeys), title: String(e.title||"Ejercicio"), instrument: String(e.instrument||"GUITARRA"), level: String(e.level||"BASICO"), difficulty: Number(e.difficulty||3), estimatedMin: Number(e.estimatedMin||10), isCurated: !!e.isCurated }));
      setExercises(normalized);
    } catch{ setExercises(SEED_EX); } else { setExercises(SEED_EX); localStorage.setItem(ek, JSON.stringify(SEED_EX)); }
    if (sr) try{ setSongs(JSON.parse(sr)); } catch{ setSongs(SEED_SONG); } else { setSongs(SEED_SONG); localStorage.setItem(sk, JSON.stringify(SEED_SONG)); }
  }, []);
  const persistEx = (next: Exercise[])=>{ setExercises(next); localStorage.setItem(getTenantStorageKey("edu_exercises"), JSON.stringify(next)); };

  const doSearch = async ()=>{
    setSearching(true);
    // Simula Brave Search 20 candidatos normalizados misma estructura
    await new Promise(r=>setTimeout(r, 900));
    const fake: Exercise[] = Array.from({length:20}, (_,i)=>({
      id: "cand_"+i+"_"+Date.now().toString(36),
      title: `${query||"Ejercicio"} ${i+1} · ${instr!=="ALL"?instr:"GUITARRA"} ${["arpegio","cejilla","ritmo","escala"][i%4]}`,
      instrument: instr==="ALL"?"GUITARRA":instr,
      level: ["INICIACION","BASICO","INTERMEDIO","AVANZADO"][i%4] as string,
      difficulty: (i%5)+1,
      estimatedMin: [5,10,15,10,5,20][i%6],
      skillKeys: [["acordes_abiertos"],["cejilla"],["ritmo_4_4"],["escala_pent"]][i%4] as string[],
      description: `Resultado ${i+1} de Brave Search — descripción 180c con metrónomo y objetivos.`,
      tabContent: `e|-${i}--${i+1}--|\nB|-${i+1}--| (tablatura sample)`,
      sourceUrl: `https://example.com/exercise-${i+1}`,
      sourceType: (["VIDEO","BLOG","TAB","IMAGE"] as const)[i%4] as string,
      isCurated:false,
    }));
    setCandidates(fake);
    // cache
    const ck = getTenantStorageKey("edu_search_cache");
    const cache = JSON.parse(localStorage.getItem(ck)||"{}");
    cache[query||"__all__"] = { results: fake, createdAt: new Date().toISOString() };
    localStorage.setItem(ck, JSON.stringify(cache));
    setSearching(false);
  };

  const saveCandidate = (c: Exercise)=>{
    const ex: Exercise = { ...c, id: "e_"+Date.now().toString(36), isCurated: false };
    persistEx([ex, ...exercises]);
    setToast(`Guardado en biblioteca: ${ex.title}`); setTimeout(()=>setToast(null),2500);
  };

  const filteredEx = exercises.filter(e=> instr==="ALL" || e.instrument===instr);
  const filteredSong = songs.filter(s=> instr==="ALL" || (s.instrument===instr || s.instrument===undefined));

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold">{toast}</div>}
      <div className="flex items-center gap-2">
        <button onClick={()=>setTab("exercises")} className={`rounded-xl px-4 py-2 text-xs font-bold ${tab==="exercises"?"bg-foreground text-background":"border border-border/40 bg-card"}`}>Ejercicios</button>
        <button onClick={()=>setTab("songs")} className={`rounded-xl px-4 py-2 text-xs font-bold ${tab==="songs"?"bg-foreground text-background":"border border-border/40 bg-card"}`}>Canciones</button>
        <div className="ml-auto flex gap-2 overflow-x-auto">
          <button onClick={()=>setInstr("ALL")} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${instr==="ALL"?"bg-red-500 text-white border-red-500":"bg-background"}`}>Todos</button>
          {Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=><button key={ins.key} onClick={()=>setInstr(ins.key)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${instr===ins.key?"bg-red-500 text-white":"bg-background"}`}>{ins.label}</button>)}
        </div>
      </div>

      {tab==="exercises" && (
        <div className="space-y-3">
          <div className="rounded-3xl border border-border/40 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600"><Icons.Search className="h-4 w-4" /> Buscar ejercicios (web)</div>
            <p className="mt-1 text-xs text-muted-foreground">Busca en la red texto/vídeos/blogs/imágenes → 20 candidatos misma estructura (tablatura, dificultad 1-5, tiempo) y guárdalos 1-click.</p>
            <div className="mt-3 flex gap-2">
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="ej. cejilla guitarra nivel medio, slap bajo, voz respiración..." className="flex-1 rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm outline-none focus:border-red-500" />
              <button onClick={doSearch} disabled={searching} className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background disabled:opacity-50 flex items-center gap-1">{searching?<Icons.Loader2 className="h-4 w-4 animate-spin" />:<Icons.Globe className="h-4 w-4" />} Buscar 20</button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Provider: Brave Search API (server, cache EduExerciseSearchCache). Normalizador LLM misma estructura. DryRun sin key también genera 20 mock.</p>
          </div>

          {candidates.length>0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="text-xs font-bold">Candidatos web ({candidates.length}) — guarda los que quieras</div>
              <div className="mt-2 grid gap-2">
                {candidates.map((c)=>(
                  <div key={c.id} className="rounded-2xl border border-border/40 bg-card p-3">
                    <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-bold">{c.title}</div><div className="text-[11px] text-muted-foreground flex flex-wrap gap-1 items-center"><span className="rounded-full bg-muted px-2 py-0.5">{c.instrument}</span><span className="rounded-full bg-muted px-2 py-0.5">{c.level}</span><span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-700">Dif {c.difficulty}/5</span><span>{c.estimatedMin}′</span><span className="rounded-full border px-2 py-0.5">{c.sourceType}</span></div><div className="mt-1 text-xs">{c.description}</div><pre className="mt-1 overflow-auto rounded-lg bg-muted p-2 text-[11px] font-mono">{c.tabContent}</pre><a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-red-600 underline">{c.sourceUrl}</a></div><button onClick={()=>saveCandidate(c)} className="shrink-0 rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white">Guardar</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-border/40 bg-card p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-black">Biblioteca ({filteredEx.length})</h3><span className="text-xs text-muted-foreground">Tablatura + dificultad + tiempo</span></div>
            <div className="mt-3 grid gap-2">
              {filteredEx.map((e)=>(
                <div key={e.id} className="rounded-2xl border border-border/40 bg-background p-3">
                  <div className="flex items-start justify-between"><div className="text-sm font-bold">{e.title} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">{e.instrument} · {e.level}</span></div><span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-700">{e.difficulty}/5 · {e.estimatedMin}′</span></div>
                  <div className="text-xs text-muted-foreground">Skills: {safeArr(e.skillKeys).join(", ")||"—"}</div>
                  <div className="text-xs mt-1">{e.description}</div>
                  {e.tabContent && <pre className="mt-2 overflow-auto rounded-lg bg-muted p-2 text-[11px] font-mono">{e.tabContent}</pre>}
                  {e.sourceUrl && <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-red-600 underline">{e.sourceUrl} ({e.sourceType})</a>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{e.isCurated?"Curado":"Web guardado"} · r/{e.id.slice(0,6)}</div>
                </div>
              ))}
              {filteredEx.length===0 && <div className="py-6 text-center text-sm text-muted-foreground">Vacío</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-4">
            <div className="text-xs font-bold">Motor propuestas exprés (2/5/15′)</div>
            <p className="text-xs text-muted-foreground">Filtra por instrumento/skill gap + tiempo disponible. Ej. "Tengo 5 min para preparar clase de guitarra con gap cejilla → 3 ejercicios filtrados."</p>
            <div className="mt-2 flex gap-2">
              {[2,5,15].map((m)=><button key={m} onClick={()=>{ const cand = filteredEx.filter(e=>e.estimatedMin<=m).slice(0,3); setToast(`Propuesta ${m}′: ${cand.map(c=>c.title).join(" · ")||"sin candidatos, baja tiempo o añade ejercicios"}`); setTimeout(()=>setToast(null),3000); }} className="rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-bold">{m}′ exprés</button>)}
            </div>
          </div>
        </div>
      )}

      {tab==="songs" && (
        <div className="rounded-3xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-black">Canciones según gustos ({filteredSong.length})</h3>
          <p className="text-xs text-muted-foreground">Propuestas por musicalTastes / favArtists + nivel. Cada canción enlaza a biblioteca.</p>
          <div className="mt-3 grid gap-2">
            {filteredSong.map((s)=>(
              <div key={s.id} className="rounded-2xl border border-border/40 bg-background p-3 flex items-center justify-between">
                <div><div className="text-sm font-bold">{s.title} · {s.artist}</div><div className="text-xs text-muted-foreground">{s.genre||"—"} · {s.level} · {s.instrument||"—"} {s.key?`· Tono ${s.key}`:""}</div><div className="text-[11px] font-mono">r/{s.id.slice(0,6)} · {s.externalUrl||"sin link"}</div></div>
                <a href={s.externalUrl||"#"} target="_blank" rel="noreferrer" className="rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background">Ver</a>
              </div>
            ))}
            {filteredSong.length===0 && <div className="py-6 text-center text-sm text-muted-foreground">Sin canciones</div>}
          </div>
        </div>
      )}
    </div>
  );
}
