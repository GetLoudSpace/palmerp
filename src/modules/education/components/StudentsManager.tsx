"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { EDUCATION_INSTRUMENTS, getInstrumentDef } from "../lib/instruments";
import { getTenantStorageKey, getTenantSlugClient } from "@/lib/clientStorage";

type Student = {
  id:string; contactName:string; contactPhone:string; instruments:string[]; primaryInstrument?:string;
  tier:"ALUMNO"|"ARTISTA"; musicalTastes:string[]; favArtists:string[]; levelByInstrument?: Record<string,string>;
  tutorName?:string; tutorPhone?:string; portalToken:string; createdAt:string;
};

function uuid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36); }

const LEVELS = ["INICIACION","BASICO","INTERMEDIO","AVANZADO"] as const;

export default function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [contacts, setContacts] = useState<{id:string;name:string;phone:string}[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Student|null>(null);
  const [form, setForm] = useState<{contactId:string; instruments:string[]; primary:string; tier:"ALUMNO"|"ARTISTA"; tastes:string; artists:string; level:string; tutorId:string}>({contactId:"", instruments:[], primary:"GUITARRA", tier:"ALUMNO", tastes:"", artists:"", level:"BASICO", tutorId:""});
  const [toast, setToast] = useState<string|null>(null);

  // load contacts from CRM storage + students from own storage
  useEffect(()=>{
    const slug = getTenantSlugClient();
    const ck = `palmera_contacts_${slug}`;
    const raw = localStorage.getItem(ck);
    if (raw) try{ const parsed = JSON.parse(raw); setContacts(parsed.map((c:any)=>({id:c.id,name:c.name,phone:c.phone||""}))); } catch{}
    const sk = getTenantStorageKey("edu_students");
    const sraw = localStorage.getItem(sk);
    if (sraw) try{ setStudents(JSON.parse(sraw)); } catch{}
    else { // seed
      const seed: Student[] = [
        { id:"s1", contactName:"Lucía Martín", contactPhone:"+34 600 111 222", instruments:["GUITARRA","VOZ"], primaryInstrument:"GUITARRA", tier:"ARTISTA", musicalTastes:["indie","pop"], favArtists:["Rosalía"], levelByInstrument:{GUITARRA:"BASICO"}, portalToken:uuid(), createdAt: new Date().toISOString() },
        { id:"s2", contactName:"Marco Ruiz", contactPhone:"+34 600 333 444", instruments:["BAJO"], primaryInstrument:"BAJO", tier:"ALUMNO", musicalTastes:["rock"], favArtists:["Flea"], levelByInstrument:{BAJO:"INICIACION"}, portalToken:uuid(), createdAt: new Date().toISOString() },
      ];
      setStudents(seed); localStorage.setItem(sk, JSON.stringify(seed));
    }
  }, []);

  const persist = (next: Student[])=>{ setStudents(next); localStorage.setItem(getTenantStorageKey("edu_students"), JSON.stringify(next)); };

  const create = (e: React.FormEvent)=>{
    e.preventDefault();
    if (!form.contactId) return alert("Selecciona contacto alumno (Contact manda)");
    const contact = contacts.find(c=>c.id===form.contactId);
    if (!contact) return;
    const tutor = contacts.find(c=>c.id===form.tutorId);
    if (selected) {
      const next = students.map(s=> s.id===selected.id ? { ...s, instruments: form.instruments, primaryInstrument:form.primary, tier:form.tier, musicalTastes: form.tastes.split(",").map(v=>v.trim()).filter(Boolean), favArtists: form.artists.split(",").map(v=>v.trim()).filter(Boolean), levelByInstrument:{ ...(s.levelByInstrument||{}), [form.primary]: form.level }, tutorName: tutor?.name, tutorPhone: tutor?.phone } as Student : s);
      persist(next); setSelected(null);
    } else if (students.find(s=>s.contactName===contact.name)) {
      alert("Alumno ya existe para ese contacto (1:1).");
      return;
    } else {
      const ns: Student = { id: uuid(), contactName: contact.name, contactPhone: contact.phone, instruments: form.instruments.length?form.instruments:[form.primary], primaryInstrument:form.primary, tier: form.tier, musicalTastes: form.tastes.split(",").map(v=>v.trim()).filter(Boolean), favArtists: form.artists.split(",").map(v=>v.trim()).filter(Boolean), levelByInstrument:{[form.primary]: form.level}, tutorName: tutor?.name, tutorPhone: tutor?.phone, portalToken: uuid(), createdAt: new Date().toISOString() };
      persist([...students, ns]);
    }
    setShowForm(false); setForm({contactId:"", instruments:[], primary:"GUITARRA", tier:"ALUMNO", tastes:"", artists:"", level:"BASICO", tutorId:""}); setToast("Alumno guardado (Contact 1:1 + tutor Restrict)"); setTimeout(()=>setToast(null),2500);
  };

  const del = (id:string)=>{
    if (!confirm("¿Archivar alumno? Se verifica doblemente. Se moverá a papelera 30d (no borrado físico). Continuar?")) return;
    if (!confirm("Confirma de nuevo: escribe OK para archivar.")) return;
    const target = students.find(s=>s.id===id);
    if (!target) return;
    // soft delete: move to trash key
    const trashKey = getTenantStorageKey("edu_trash");
    const trash = JSON.parse(localStorage.getItem(trashKey)||"[]");
    trash.unshift({ id: uuid(), entityType:"EduStudent", entityId:id, payload: target, deletedAt: new Date().toISOString(), expiresAt: new Date(Date.now()+30*24*3600*1000).toISOString() });
    localStorage.setItem(trashKey, JSON.stringify(trash.slice(0,50)));
    persist(students.filter(s=>s.id!==id));
    setToast("Alumno archivado — papelera 30d. Restaurable."); setTimeout(()=>setToast(null),3000);
  };

  const filtered = students.filter(s=> filter==="ALL" || s.instruments.includes(filter));

  const openEdit = (s: Student)=>{
    setSelected(s);
    setForm({ contactId: contacts.find(c=>c.name===s.contactName)?.id || "", instruments: s.instruments, primary: s.primaryInstrument||s.instruments[0]||"GUITARRA", tier: s.tier, tastes: s.musicalTastes.join(", "), artists: s.favArtists.join(", "), level: (s.levelByInstrument?.[s.primaryInstrument||""]||"BASICO"), tutorId: contacts.find(c=>c.name===s.tutorName)?.id || "" });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold">{toast}</div>}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Alumnos ({filtered.length})</h2>
        <button onClick={()=>{ setSelected(null); setShowForm(true); }} className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background flex items-center gap-1"><Icons.Plus className="h-4 w-4" /> Nuevo</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={()=>setFilter("ALL")} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter==="ALL"?"bg-foreground text-background":"bg-background"}`}>Todos</button>
        {Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=>(
          <button key={ins.key} onClick={()=>setFilter(ins.key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter===ins.key?"bg-amber-500 text-white border-amber-500":"bg-background"}`}>{ins.label}</button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((s)=>{
          const def = getInstrumentDef(s.primaryInstrument||s.instruments[0]);
          return (
            <div key={s.id} className="rounded-2xl border border-border/40 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-bold">{s.contactName}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold`}>{s.tier}</span>{s.tier==="ARTISTA"&&<Icons.Star className="h-4 w-4 text-amber-500" />}</div>
                  <div className="mt-1 flex flex-wrap gap-1">{s.instruments.map((k)=>{ const d=getInstrumentDef(k); return <span key={k} className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-bold">{d.label} · {s.levelByInstrument?.[k]||"—"}</span>; })}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Contacto manda: {s.contactPhone || "sin teléfono"} · Tutor: {s.tutorName || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">Gustos: {s.musicalTastes.join(", ")||"—"} · Artistas: {s.favArtists.join(", ")||"—"}</div>
                  <div className="text-[11px] text-muted-foreground">Portal token: <span className="font-mono">{s.portalToken.slice(0,8)}…</span> · r/batch/{s.portalToken.slice(0,6)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={()=>openEdit(s)} className="rounded-lg border border-border/40 p-2"><Icons.Pencil className="h-4 w-4" /></button>
                  <button onClick={()=>del(s.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-600"><Icons.Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {/* Skills 1-5 mock */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  {label:"Acordes", v:3}, {label:"Ritmo", v:2}, {label:"Oído", v:4},
                ].map((sk)=>(
                  <div key={sk.label} className="rounded-xl bg-muted/40 p-2 text-center"><div className="text-[10px] font-bold uppercase text-muted-foreground">{sk.label}</div><div className="text-sm font-black">{sk.v}/5</div><div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-amber-500" style={{width:`${sk.v/5*100}%`}} /></div></div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">Objetivos: Curso + Trimestres (fijos+config) · Próximo: T2 — cejilla fluida</div>
            </div>
          );
        })}
        {filtered.length===0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin alumnos. Crea desde Contact.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <form onSubmit={create} className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between"><h3 className="font-bold">{selected?"Editar alumno":"Nuevo alumno (Contact 1:1)"}</h3><button type="button" onClick={()=>setShowForm(false)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <p className="text-xs text-muted-foreground">El contacto manda. Cualquier alumno/empleado/cliente se alimenta de Contact. Se valida doble borrado.</p>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold">Contacto alumno *<select value={form.contactId} onChange={(e)=>setForm({...form, contactId:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm"><option value="">— Selecciona Contact —</option>{contacts.map((c)=> <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></label>
              <label className="block text-xs font-bold">Tutor (padre/madre) — Contact opcional<select value={form.tutorId} onChange={(e)=>setForm({...form, tutorId:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm"><option value="">— Sin tutor —</option>{contacts.map((c)=> <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">Instrumentos<div className="mt-1 flex flex-wrap gap-1">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=>{ const active=form.instruments.includes(ins.key); return <button type="button" key={ins.key} onClick={()=>setForm({...form, instruments: active? form.instruments.filter(k=>k!==ins.key): [...form.instruments, ins.key]})} className={`rounded-full border px-3 py-1 text-xs ${active?"bg-amber-500 text-white":"bg-background"}`}>{ins.label}</button>; })}</div></label>
                <label className="text-xs font-bold">Principal<select value={form.primary} onChange={(e)=>setForm({...form, primary:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=><option key={ins.key} value={ins.key}>{ins.label}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">Nivel<select value={form.level} onChange={(e)=>setForm({...form, level:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs">{LEVELS.map(l=><option key={l} value={l}>{l}</option>)}</select></label>
                <label className="text-xs font-bold">Tier<select value={form.tier} onChange={(e)=>setForm({...form, tier:e.target.value as any})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs"><option value="ALUMNO">ALUMNO</option><option value="ARTISTA">ARTISTA (premium upsell manual)</option></select></label>
              </div>
              <label className="text-xs font-bold">Gustos musicales (coma)<input value={form.tastes} onChange={(e)=>setForm({...form, tastes:e.target.value})} placeholder="rock, flamenco, indie" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
              <label className="text-xs font-bold">Artistas favoritos<input value={form.artists} onChange={(e)=>setForm({...form, artists:e.target.value})} placeholder="Rosalía, Flea" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
            </div>
            <button type="submit" className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">Guardar alumno</button>
          </form>
        </div>
      )}
    </div>
  );
}
