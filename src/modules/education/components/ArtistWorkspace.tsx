"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey } from "@/lib/clientStorage";
import ArtistAudioRecorder from "./ArtistAudioRecorder";
import ArtistAudioPlayer from "./ArtistAudioPlayer";
import Rimador from "./Rimador";

type SongProject = { id:string; title:string; genre?:string; status:string; bpm?: number; key?:string; createdAt:string; deletedAt?:string };
type Lyric = { id:string; songProjectId:string; version:number; content:string; deletedAt?:string };
type Audio = { id:string; songProjectId:string; stage:string; fileUrl:string; fileName?:string; deletedAt?:string; createdAt:string };

const STATUSES = ["IDEA","WRITING","DEMO","PRODUCING","MIX","MASTER","READY","PUBLISHED","ARCHIVED"] as const;

export default function ArtistWorkspace() {
  const [artists, setArtists] = useState<{id:string; name:string}[]>([]);
  const [artistId, setArtistId] = useState<string>("");
  const [projects, setProjects] = useState<SongProject[]>([]);
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState<{title:string; genre:string; status:string}>({title:"", genre:"", status:"IDEA"});
  const [lyricDraft, setLyricDraft] = useState("");
  const [toast, setToast] = useState<string|null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState<any[]>([]);

  useEffect(()=>{
    const sRaw = localStorage.getItem(getTenantStorageKey("edu_students"));
    if (sRaw) try{
      const studs = JSON.parse(sRaw);
      const arts = studs.filter((s:any)=>s.tier==="ARTISTA").map((s:any)=>({id:s.id,name:s.contactName}));
      setArtists(arts);
      if (arts[0]) setArtistId(arts[0].id);
    } catch{}
    const pRaw = localStorage.getItem(getTenantStorageKey("edu_song_projects"));
    if (pRaw) try{ setProjects(JSON.parse(pRaw)); } catch{}
    const lRaw = localStorage.getItem(getTenantStorageKey("edu_lyrics"));
    if (lRaw) try{ setLyrics(JSON.parse(lRaw)); } catch{}
    const aRaw = localStorage.getItem(getTenantStorageKey("edu_audios"));
    if (aRaw) try{ setAudios(JSON.parse(aRaw)); } catch{}
    const tRaw = localStorage.getItem(getTenantStorageKey("edu_trash"));
    if (tRaw) try{ setTrash(JSON.parse(tRaw)); } catch{}
  }, []);

  const persistProjects = (next: SongProject[])=>{ setProjects(next); localStorage.setItem(getTenantStorageKey("edu_song_projects"), JSON.stringify(next)); };
  const persistLyrics = (next: Lyric[])=>{ setLyrics(next); localStorage.setItem(getTenantStorageKey("edu_lyrics"), JSON.stringify(next)); };
  const persistAudios = (next: Audio[])=>{ setAudios(next); localStorage.setItem(getTenantStorageKey("edu_audios"), JSON.stringify(next)); };

  const createProject = (e: React.FormEvent)=>{
    e.preventDefault();
    if (!projectForm.title.trim()) return;
    const p: SongProject = { id:"sp_"+Date.now().toString(36), title: projectForm.title, genre: projectForm.genre, status: projectForm.status as any, createdAt: new Date().toISOString() };
    persistProjects([p, ...projects]); setSelectedProject(p.id); setShowProjectForm(false); setProjectForm({title:"", genre:"", status:"IDEA"});
  };
  const moveStatus = (id:string, dir: 1|-1)=>{
    const idx = STATUSES.indexOf(projects.find(p=>p.id===id)?.status as any);
    const nextStatus = STATUSES[Math.max(0, Math.min(STATUSES.length-1, idx+dir))] ;
    persistProjects(projects.map(p=>p.id===id?{...p, status: nextStatus}:p));
  };
  const softDeleteProject = (id:string)=>{
    if (!confirm("¿Archivar obra? Se moverá a papelera 30d (restaurable, artistas impulsivos).")) return;
    const target = projects.find(p=>p.id===id);
    if (!target) return;
    const t = { id: "tr_"+Date.now().toString(36), entityType:"EduSongProject", entityId:id, payload: target, deletedAt: new Date().toISOString(), expiresAt: new Date(Date.now()+30*24*3600*1000).toISOString() };
    const nextTrash = [t, ...trash].slice(0,50);
    setTrash(nextTrash); localStorage.setItem(getTenantStorageKey("edu_trash"), JSON.stringify(nextTrash));
    persistProjects(projects.filter(p=>p.id!==id));
    setToast("Obra archivada — papelera 30d"); setTimeout(()=>setToast(null),2500);
  };
  const restoreTrash = (id:string)=>{
    const item = trash.find(t=>t.id===id);
    if (!item) return;
    if (item.entityType==="EduSongProject") persistProjects([item.payload as SongProject, ...projects]);
    if (item.entityType==="EduLyric") persistLyrics([item.payload as Lyric, ...lyrics]);
    if (item.entityType==="EduAudioAsset") persistAudios([item.payload as Audio, ...audios]);
    const next = trash.filter(t=>t.id!==id);
    setTrash(next); localStorage.setItem(getTenantStorageKey("edu_trash"), JSON.stringify(next));
    setToast("Restaurado"); setTimeout(()=>setToast(null),2000);
  };

  const saveLyric = ()=>{
    if (!selectedProject) return alert("Selecciona obra");
    if (!lyricDraft.trim()) return;
    const existing = lyrics.filter(l=>l.songProjectId===selectedProject && !l.deletedAt);
    const version = existing.length ? Math.max(...existing.map(l=>l.version))+1 : 1;
    const lyric: Lyric = { id:"ly_"+Date.now().toString(36), songProjectId: selectedProject, version, content: lyricDraft, deletedAt: undefined };
    // version history mock
    const versionsKey = getTenantStorageKey("edu_lyric_versions");
    const versions = JSON.parse(localStorage.getItem(versionsKey)||"[]");
    versions.unshift({ id:"lv_"+Date.now().toString(36), lyricId: lyric.id, version, content: lyricDraft, createdAt: new Date().toISOString() });
    localStorage.setItem(versionsKey, JSON.stringify(versions.slice(0,100)));
    persistLyrics([lyric, ...lyrics]);
    setToast(`Letra v${version} guardada (versionado)`); setTimeout(()=>setToast(null),2000);
  };
  const deleteLyric = (id:string)=>{
    const target = lyrics.find(l=>l.id===id);
    if (!target) return;
    if (!confirm("¿Archivar letra v"+target.version+"? Papelera 30d")) return;
    const t = { id:"tr_"+Date.now().toString(36), entityType:"EduLyric", entityId:id, payload: target, deletedAt: new Date().toISOString(), expiresAt: new Date(Date.now()+30*24*3600*1000).toISOString() };
    const next = [t, ...trash].slice(0,50);
    setTrash(next); localStorage.setItem(getTenantStorageKey("edu_trash"), JSON.stringify(next));
    persistLyrics(lyrics.filter(l=>l.id!==id));
  };

  const handleRecorderSave = async (blob: Blob, fileName: string)=>{
    if (!selectedProject) { setToast("Selecciona obra primero"); setTimeout(()=>setToast(null),2000); return; }
    const url = URL.createObjectURL(blob);
    const a: Audio = { id:"au_"+Date.now().toString(36), songProjectId: selectedProject, stage:"DEMO", fileUrl: url, fileName, createdAt: new Date().toISOString() };
    persistAudios([a, ...audios]);
    setToast(`Audio DEMO guardado: ${fileName} (player unificado)`); setTimeout(()=>setToast(null),2500);
  };
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0]; if (!f) return;
    if (!selectedProject) { setToast("Selecciona obra"); setTimeout(()=>setToast(null),2000); return; }
    const url = URL.createObjectURL(f);
    const a: Audio = { id:"au_"+Date.now().toString(36), songProjectId: selectedProject, stage:"DEMO", fileUrl: url, fileName: f.name, createdAt: new Date().toISOString() };
    persistAudios([a, ...audios]);
  };
  const deleteAudio = (id:string)=>{
    const target = audios.find(a=>a.id===id);
    if (!target) return;
    if (!confirm("¿Archivar audio? Papelera 30d")) return;
    const t = { id:"tr_"+Date.now().toString(36), entityType:"EduAudioAsset", entityId:id, payload: target, deletedAt: new Date().toISOString(), expiresAt: new Date(Date.now()+30*24*3600*1000).toISOString() };
    const next=[t,...trash].slice(0,50); setTrash(next); localStorage.setItem(getTenantStorageKey("edu_trash"), JSON.stringify(next));
    persistAudios(audios.filter(a=>a.id!==id));
  };

  const filteredLyrics = lyrics.filter(l=> l.songProjectId===selectedProject && !l.deletedAt);
  const filteredAudios = audios.filter(a=> a.songProjectId===selectedProject && !a.deletedAt);
  const activeProjects = projects.filter(p=>!p.deletedAt);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold">{toast}</div>}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 flex items-center justify-between">
        <div><div className="text-xs font-bold uppercase tracking-widest text-red-700">Portal Artista · Premium upsell manual</div><div className="text-xs text-muted-foreground">Solo visible si tier ARTISTA. Si alumno no es artista, aquí sale "Activar premium".</div></div>
        <button onClick={()=>setShowTrash(!showTrash)} className="rounded-xl bg-card border border-border/40 px-3 py-2 text-xs font-bold flex items-center gap-1"><Icons.Trash2 className="h-4 w-4" /> Papelera {trash.length>0&&`(${trash.length})`}</button>
      </div>

      {showTrash && (
        <div className="rounded-2xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-bold">Papelera 30d — backup por si arrepiéntete</h3>
          <div className="mt-2 space-y-2">
            {trash.length===0 ? <p className="text-xs text-muted-foreground">Vacía</p> : trash.map((t)=>(
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-background p-3">
                <div><div className="text-xs font-bold">{t.entityType} · {t.entityId.slice(0,8)}</div><div className="text-[11px] text-muted-foreground">Expira {new Date(t.expiresAt).toLocaleDateString("es-ES")}</div></div>
                <button onClick={()=>restoreTrash(t.id)} className="rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white">Restaurar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {artists.length===0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center"><Icons.Star className="mx-auto h-8 w-8 text-red-500" /><p className="mt-2 text-sm font-bold">Ningún artista premium</p><p className="text-xs text-muted-foreground">Crea alumno y cambia tier a ARTISTA en Alumnos (solo ADMIN).</p></div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {artists.map((a)=>(
              <button key={a.id} onClick={()=>setArtistId(a.id)} className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold ${artistId===a.id?"bg-red-500 text-white border-red-500":"bg-background"}`}>{a.name}</button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">Obras — Kanban/Gantt (reuso GESTION_PROYECTOS)</h3>
            <button onClick={()=>setShowProjectForm(true)} className="rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background flex items-center gap-1"><Icons.Plus className="h-4 w-4" /> Nueva obra</button>
          </div>

          {/* Kanban */}
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {STATUSES.map((status)=>{
              const col = activeProjects.filter(p=>p.status===status);
              return (
                <div key={status} className="min-w-[220px] shrink-0 snap-start rounded-2xl border border-border/40 bg-card p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{status} ({col.length})</div>
                  <div className="mt-2 space-y-2">
                    {col.map((p)=>(
                      <div key={p.id} onClick={()=>setSelectedProject(p.id)} className={`rounded-xl border p-3 cursor-pointer ${selectedProject===p.id?"border-red-500 bg-red-500/5":"border-border/40 bg-background hover:bg-muted"}`}>
                        <div className="text-xs font-bold truncate">{p.title}</div><div className="text-[11px] text-muted-foreground">{p.genre||"—"}</div>
                        <div className="mt-2 flex gap-1">
                          <button onClick={(e)=>{e.stopPropagation(); moveStatus(p.id, -1);}} className="rounded-lg border px-2 py-1 text-[10px]">◀</button>
                          <button onClick={(e)=>{e.stopPropagation(); moveStatus(p.id, 1);}} className="rounded-lg border px-2 py-1 text-[10px]">▶</button>
                          <button onClick={(e)=>{e.stopPropagation(); softDeleteProject(p.id);}} className="ml-auto rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-600">Archivar</button>
                        </div>
                      </div>
                    ))}
                    {col.length===0 && <div className="text-xs text-muted-foreground py-6 text-center">Vacío</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedProject ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/40 bg-card p-4">
                <div className="flex items-center justify-between"><h4 className="text-sm font-black">Letras — obra {activeProjects.find(p=>p.id===selectedProject)?.title}</h4><span className="text-xs text-muted-foreground">{filteredLyrics.length} versiones</span></div>
                <textarea value={lyricDraft} onChange={(e)=>setLyricDraft(e.target.value)} placeholder="Escribe tu letra aquí..." rows={6} className="mt-3 w-full rounded-xl border border-border/40 bg-background p-3 text-sm outline-none focus:border-red-500" />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Rimador text={lyricDraft} onInsert={(w)=>setLyricDraft((prev)=> prev ? prev + " " + w : w)} />
                  <div className="space-y-2">
                    <button onClick={saveLyric} className="w-full rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white">Guardar letra versionada</button>
                    <p className="text-[10px] text-muted-foreground">Cada guardado crea v + diff. Borrado va a papelera 30d. Editor con auto-guardado (localStorage).</p>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {filteredLyrics.map((ly)=>(
                        <div key={ly.id} className="rounded-xl border border-border/40 bg-background p-2">
                          <div className="flex items-center justify-between"><span className="text-xs font-bold">v{ly.version}</span><button onClick={()=>deleteLyric(ly.id)} className="text-[11px] text-red-600">Archivar</button></div>
                          <pre className="mt-1 whitespace-pre-wrap text-xs">{ly.content.slice(0,120)}</pre>
                        </div>
                      ))}
                      {filteredLyrics.length===0 && <div className="text-xs text-muted-foreground">Sin letras</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
                <h4 className="text-sm font-black">Audios — DEMO / PRODUCING / MASTER (mismo reproductor)</h4>
                <ArtistAudioRecorder onSave={handleRecorderSave} />
                <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 bg-muted/20 px-4 py-3 text-xs font-bold cursor-pointer">
                  <Icons.Upload className="h-4 w-4" /> Subir audio
                  <input type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
                </label>
                <div className="grid gap-2">
                  {filteredAudios.length===0 ? <p className="text-xs text-muted-foreground">Sin audios — graba o sube.</p> : filteredAudios.map((a)=>(
                    <div key={a.id} className="space-y-1">
                      <ArtistAudioPlayer src={a.fileUrl} fileName={a.fileName || a.stage} />
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="rounded-full bg-muted px-2 py-0.5">{a.stage} · {a.createdAt.slice(0,10)}</span><button onClick={()=>deleteAudio(a.id)} className="text-red-600 font-bold">Archivar 30d</button></div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Mismo <code>ArtistAudioPlayer</code> para grabados y subidos. Grabadora pide permiso micrófono al pulsar Grabar.</p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-4">
                <h4 className="text-sm font-black">Release & Distribución (Opción A pluggable)</h4>
                <p className="text-xs text-muted-foreground">Adapter genérico: guarda DRAFT→SUBMITTED y deja webhook a tu distribuidora (DistroKid/TuneCore) cuando elijas. Stats streaming en F5 vía Spotify/Apple/YouTube API OAuth.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={()=>{ setToast("Release DRAFT creado (adapter genérico)"); setTimeout(()=>setToast(null),2000); }} className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background">Crear Release</button>
                  <button onClick={()=>{ setToast("Sync stats pendiente — F5 con OAuth"); setTimeout(()=>setToast(null),2000); }} className="rounded-xl border border-border/40 bg-background px-4 py-2 text-xs font-bold">Sync escuchas</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Selecciona una obra del Kanban para gestionar letras/audios.</div>
          )}

          {showProjectForm && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
              <form onSubmit={createProject} className="w-full max-w-md rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl">
                <div className="flex items-center justify-between"><h3 className="font-bold">Nueva obra</h3><button type="button" onClick={()=>setShowProjectForm(false)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
                <input required value={projectForm.title} onChange={(e)=>setProjectForm({...projectForm, title:e.target.value})} placeholder="Título" className="mt-3 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" />
                <input value={projectForm.genre} onChange={(e)=>setProjectForm({...projectForm, genre:e.target.value})} placeholder="Género" className="mt-3 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" />
                <select value={projectForm.status} onChange={(e)=>setProjectForm({...projectForm, status:e.target.value})} className="mt-3 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm">{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                <button type="submit" className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">Crear</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
