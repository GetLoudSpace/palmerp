"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import * as Icons from "lucide-react";
import { getTenantStorageKey } from "@/lib/clientStorage";

type SharedItem = { token:string; batchToken:string; lessonId:string; exerciseId?:string; songId?:string; studentName?:string };

export default function BatchPage(){
  const params = useParams<{token:string}>();
  const token = params?.token ?? "demo";
  const [items, setItems] = useState<SharedItem[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(()=>{
    const shared = JSON.parse(localStorage.getItem(getTenantStorageKey("edu_shared"))||"[]");
    const batchItems = shared.filter((s:any)=>s.batchToken===token);
    setItems(batchItems.length? batchItems : [{ token, batchToken: token, lessonId:"demo", exerciseId:"e1", studentName:"Alumno"}]);
    const ex = JSON.parse(localStorage.getItem(getTenantStorageKey("edu_exercises"))||"[]");
    const so = JSON.parse(localStorage.getItem(getTenantStorageKey("edu_songs"))||"[]");
    setExercises(ex); setSongs(so);
  }, [token]);

  const getEx = (id?:string)=> exercises.find((e:any)=>e.id===id);
  const getSong = (id?:string)=> songs.find((s:any)=>s.id===id);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[1.5rem] border border-border/40 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600"><Icons.Link2 className="h-4 w-4" /> Recurso compartido · r/batch/{token}</div>
          <h1 className="mt-2 text-2xl font-black">Tus recursos de esta clase</h1>
          <p className="text-xs text-muted-foreground">Enviado por WhatsApp Cloud API — 1 link agregador con {items.length} recursos. Si reenvías, el log queda en Historial del alumno.</p>
        </div>
        <div className="space-y-3">
          {items.map((it)=> {
            const ex = getEx(it.exerciseId);
            const so = getSong(it.songId);
            if (ex) return (
              <div key={it.token} className="rounded-2xl border border-border/40 bg-card p-4">
                <div className="text-sm font-bold">{ex.title} <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{ex.instrument} · {ex.level} · {ex.difficulty}/5 · {ex.estimatedMin}′</span></div>
                <div className="text-xs mt-1">{ex.description}</div>
                {ex.tabContent && <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">{ex.tabContent}</pre>}
                {ex.sourceUrl && <a href={ex.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-red-600 underline">{ex.sourceUrl}</a>}
                <div className="mt-2 text-[11px] font-mono">r/{it.token}</div>
              </div>
            );
            if (so) return (
              <div key={it.token} className="rounded-2xl border border-border/40 bg-card p-4">
                <div className="text-sm font-bold">{so.title} · {so.artist}</div><div className="text-xs text-muted-foreground">{so.genre} · {so.level}</div>
                <div className="text-[11px] font-mono">r/{it.token}</div>
              </div>
            );
            return <div key={it.token} className="rounded-2xl border border-border/40 bg-card p-4 text-sm">Recurso {it.token}</div>;
          })}
          {items.length===0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Link no encontrado o expirado.</div>}
        </div>
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 text-xs">
          <div className="font-bold flex items-center gap-1"><Icons.ShieldCheck className="h-4 w-4 text-emerald-500" /> Token expira según EduSharedResource.expiresAt (default 90d). No necesitas login.</div>
        </div>
      </div>
    </div>
  );
}
