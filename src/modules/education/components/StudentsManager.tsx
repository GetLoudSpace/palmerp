"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { EDUCATION_INSTRUMENTS, getInstrumentDef } from "../lib/instruments";
import { getTenantStorageKey, getTenantSlugClient } from "@/lib/clientStorage";

type Student = {
  id:string; contactId?:string; contactName:string; contactPhone:string; birthDate?:string;
  instruments:string[]; primaryInstrument?:string;
  tier:"ALUMNO"|"ARTISTA"; musicalTastes:string[]; favArtists:string[]; levelByInstrument?: Record<string,string>;
  tutorId?:string; tutorName?:string; tutorPhone?:string; guardianRelation?:string;
  commsMode:"TUTOR_ONLY"|"STUDENT_ONLY"|"BOTH"; billingMode:"TUTOR"|"PROPIO";
  portalToken:string; createdAt:string;
};

const COMMS_MODES = [
  { key:"TUTOR_ONLY", label:"Solo tutor", hint:"Menores: el WhatsApp va al padre/madre" },
  { key:"STUDENT_ONLY", label:"Solo alumno", hint:"Adultos o alumno con móvil propio" },
  { key:"BOTH", label:"Ambos", hint:"Tutor + alumno (deduplica si comparten móvil)" },
] as const;

const GUARDIAN_RELATIONS = ["MADRE","PADRE","TUTOR_LEGAL","OTRO"] as const;

function uuid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36); }

const LEVELS = ["INICIACION","BASICO","INTERMEDIO","AVANZADO"] as const;

export default function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [contacts, setContacts] = useState<{id:string;name:string;phone:string;birthDate?:string}[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [selected, setSelected] = useState<Student|null>(null);
  const [form, setForm] = useState<{contactId:string; birthDate:string; instruments:string[]; primary:string; tier:"ALUMNO"|"ARTISTA"; tastes:string; artists:string; level:string; tutorId:string; guardianRelation:string; commsMode:Student["commsMode"]; billingMode:Student["billingMode"]}>({contactId:"", birthDate:"", instruments:[], primary:"GUITARRA", tier:"ALUMNO", tastes:"", artists:"", level:"BASICO", tutorId:"", guardianRelation:"MADRE", commsMode:"TUTOR_ONLY", billingMode:"TUTOR"});
  const [toast, setToast] = useState<string|null>(null);

  const safeArray = (a: unknown): string[] => Array.isArray(a) ? (a as string[]) : [];
  // load contacts from CRM storage + students from own storage (with legacy migration: join crash fix)
  useEffect(()=>{
    const slug = getTenantSlugClient();
    const ck = `palmera_contacts_${slug}`;
    const raw = localStorage.getItem(ck);
    let contactList: {id:string;name:string;phone:string;birthDate?:string}[] = [];
    if (raw) try{ const parsed = JSON.parse(raw); contactList = parsed.map((c:any)=>({id:String(c.id),name:String(c.name||"Contacto"),phone:String(c.phone||""),birthDate:c.birthDate?String(c.birthDate):undefined})); setContacts(contactList); } catch{}
    const sk = getTenantStorageKey("edu_students");
    const sraw = localStorage.getItem(sk);
    if (sraw) try{
      const parsed = JSON.parse(sraw);
      const arr: any[] = Array.isArray(parsed) ? parsed : [];
      const normalized: Student[] = arr.map((s:any)=> {
        // Migración: tutorName/tutorPhone sueltos → tutorId FK real contra Contact
        let tutorId: string | undefined = s.tutorId ? String(s.tutorId) : undefined;
        let tutorName: string | undefined = s.tutorName ? String(s.tutorName) : undefined;
        let tutorPhone: string | undefined = s.tutorPhone ? String(s.tutorPhone) : undefined;
        if (!tutorId && (tutorName || tutorPhone)) {
          const match = contactList.find((c) =>
            (tutorName && c.name.toLowerCase() === tutorName.toLowerCase()) ||
            (tutorPhone && c.phone && tutorPhone.replace(/\D/g,"").slice(-9) === c.phone.replace(/\D/g,"").slice(-9)));
          if (match) { tutorId = match.id; tutorName = match.name; tutorPhone = match.phone; }
        }
        const contactMatch = s.contactId ? contactList.find((c)=> c.id === String(s.contactId)) : contactList.find((c)=> c.name === String(s.contactName || s.name || ""));
        return {
        id: String(s.id || uuid()),
        contactId: s.contactId ? String(s.contactId) : contactMatch?.id,
        contactName: String(s.contactName || s.name || contactMatch?.name || "Alumno"),
        contactPhone: String(s.contactPhone || s.phone || contactMatch?.phone || ""),
        birthDate: s.birthDate ? String(s.birthDate) : contactMatch?.birthDate,
        instruments: safeArray(s.instruments).length ? safeArray(s.instruments) : (s.primaryInstrument ? [String(s.primaryInstrument)] : ["GUITARRA"]),
        primaryInstrument: s.primaryInstrument ? String(s.primaryInstrument) : (safeArray(s.instruments)[0] || "GUITARRA"),
        tier: (s.tier==="ARTISTA"?"ARTISTA":"ALUMNO") as Student["tier"],
        musicalTastes: safeArray(s.musicalTastes),
        favArtists: safeArray(s.favArtists),
        levelByInstrument: (s.levelByInstrument && typeof s.levelByInstrument==="object") ? s.levelByInstrument : {},
        tutorId,
        tutorName,
        tutorPhone,
        guardianRelation: s.guardianRelation ? String(s.guardianRelation) : (tutorId ? "MADRE" : undefined),
        commsMode: (s.commsMode === "STUDENT_ONLY" || s.commsMode === "BOTH") ? s.commsMode : "TUTOR_ONLY",
        billingMode: s.billingMode === "PROPIO" ? "PROPIO" : "TUTOR",
        portalToken: String(s.portalToken || uuid()),
        createdAt: String(s.createdAt || new Date().toISOString()),
        };
      });
      setStudents(normalized);
      // persist migrated shape so legacy data never crashes again
      if (normalized.length !== arr.length || arr.some((s:any)=> !Array.isArray(s.musicalTastes) || !Array.isArray(s.favArtists) || !Array.isArray(s.instruments))) {
        localStorage.setItem(sk, JSON.stringify(normalized));
      }
    } catch{}
    else { // seed
      const seed: Student[] = [
        { id:"s1", contactName:"Lucía Martín", contactPhone:"+34 600 111 222", instruments:["GUITARRA","VOZ"], primaryInstrument:"GUITARRA", tier:"ARTISTA", musicalTastes:["indie","pop"], favArtists:["Rosalía"], levelByInstrument:{GUITARRA:"BASICO"}, commsMode:"TUTOR_ONLY", billingMode:"TUTOR", portalToken:uuid(), createdAt: new Date().toISOString() },
        { id:"s2", contactName:"Marco Ruiz", contactPhone:"+34 600 333 444", instruments:["BAJO"], primaryInstrument:"BAJO", tier:"ALUMNO", musicalTastes:["rock"], favArtists:["Flea"], levelByInstrument:{BAJO:"INICIACION"}, commsMode:"TUTOR_ONLY", billingMode:"TUTOR", portalToken:uuid(), createdAt: new Date().toISOString() },
      ];
      setStudents(seed); localStorage.setItem(sk, JSON.stringify(seed));
    }
  }, []);

  const persist = (next: Student[])=>{ setStudents(next); localStorage.setItem(getTenantStorageKey("edu_students"), JSON.stringify(next)); };

  const resetForm = ()=>{ setForm({contactId:"", birthDate:"", instruments:[], primary:"GUITARRA", tier:"ALUMNO", tastes:"", artists:"", level:"BASICO", tutorId:"", guardianRelation:"MADRE", commsMode:"TUTOR_ONLY", billingMode:"TUTOR"}); setStep(1); };
  const openNew = ()=>{ setSelected(null); resetForm(); setShowForm(true); };

  const create = (e: React.FormEvent)=>{
    e.preventDefault();
    if (step < 3) { setStep(step + 1); return; } // wizard: avanzar por pasos
    if (!form.contactId) return alert("Paso 1: selecciona contacto alumno (Contact manda)");
    const contact = contacts.find(c=>c.id===form.contactId);
    if (!contact) return;
    const tutor = contacts.find(c=>c.id===form.tutorId);
    if (tutor && tutor.id === contact.id) return alert("El tutor no puede ser el propio alumno. Crea un Contact separado para el padre/madre.");
    if (selected) {
      const next = students.map(s=> s.id===selected.id ? { ...s, contactId: contact.id, contactName: contact.name, contactPhone: contact.phone, birthDate: form.birthDate || contact.birthDate, instruments: form.instruments.length?form.instruments:[form.primary], primaryInstrument:form.primary, tier:form.tier, musicalTastes: form.tastes.split(",").map(v=>v.trim()).filter(Boolean), favArtists: form.artists.split(",").map(v=>v.trim()).filter(Boolean), levelByInstrument:{ ...(s.levelByInstrument||{}), [form.primary]: form.level }, tutorId: tutor?.id, tutorName: tutor?.name, tutorPhone: tutor?.phone, guardianRelation: tutor ? form.guardianRelation : undefined, commsMode: form.commsMode, billingMode: form.billingMode } as Student : s);
      persist(next); setSelected(null);
    } else if (students.find(s=>s.contactName===contact.name || s.contactId===contact.id)) {
      alert("Alumno ya existe para ese contacto (1:1).");
      return;
    } else {
      const ns: Student = { id: uuid(), contactId: contact.id, contactName: contact.name, contactPhone: contact.phone, birthDate: form.birthDate || contact.birthDate, instruments: form.instruments.length?form.instruments:[form.primary], primaryInstrument:form.primary, tier: form.tier, musicalTastes: form.tastes.split(",").map(v=>v.trim()).filter(Boolean), favArtists: form.artists.split(",").map(v=>v.trim()).filter(Boolean), levelByInstrument:{[form.primary]: form.level}, tutorId: tutor?.id, tutorName: tutor?.name, tutorPhone: tutor?.phone, guardianRelation: tutor ? form.guardianRelation : undefined, commsMode: form.commsMode, billingMode: form.billingMode, portalToken: uuid(), createdAt: new Date().toISOString() };
      persist([...students, ns]);
    }
    setShowForm(false); resetForm(); setToast("Alumno guardado (Contact 1:1 + tutor único)"); setTimeout(()=>setToast(null),2500);
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

  const filtered = students.filter(s=> filter==="ALL" || (Array.isArray(s.instruments) ? s.instruments.includes(filter) : false));

  const openEdit = (s: Student)=>{
    setSelected(s);
    setStep(1);
    setForm({ contactId: s.contactId || contacts.find(c=>c.name===s.contactName)?.id || "", birthDate: s.birthDate || "", instruments: safeArray(s.instruments), primary: s.primaryInstrument||safeArray(s.instruments)[0]||"GUITARRA", tier: s.tier, tastes: safeArray(s.musicalTastes).join(", "), artists: safeArray(s.favArtists).join(", "), level: (s.levelByInstrument?.[s.primaryInstrument||""]||"BASICO"), tutorId: s.tutorId || contacts.find(c=>c.name===s.tutorName)?.id || "", guardianRelation: s.guardianRelation || "MADRE", commsMode: s.commsMode || "TUTOR_ONLY", billingMode: s.billingMode || "TUTOR" });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold">{toast}</div>}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Alumnos ({filtered.length})</h2>
        <button onClick={openNew} className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background flex items-center gap-1"><Icons.Plus className="h-4 w-4" /> Nuevo</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={()=>setFilter("ALL")} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter==="ALL"?"bg-foreground text-background":"bg-background"}`}>Todos</button>
        {Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=>(
          <button key={ins.key} onClick={()=>setFilter(ins.key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter===ins.key?"bg-red-500 text-white border-red-500":"bg-background"}`}>{ins.label}</button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((s)=>{
          const def = getInstrumentDef(s.primaryInstrument||s.instruments[0]);
          return (
            <div key={s.id} className="rounded-2xl border border-border/40 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-bold">{s.contactName}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold`}>{s.tier}</span>{s.tier==="ARTISTA"&&<Icons.Star className="h-4 w-4 text-red-500" />}</div>
                  <div className="mt-1 flex flex-wrap gap-1">{safeArray(s.instruments).map((k)=>{ const d=getInstrumentDef(k); return <span key={k} className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-bold">{d.label} · {s.levelByInstrument?.[k]||"—"}</span>; })}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Contacto manda: {s.contactPhone || "⚠ sin teléfono"} · Tutor: {s.tutorName ? `${s.tutorName}${s.guardianRelation ? ` (${s.guardianRelation})` : ""}${s.tutorPhone ? ` · ${s.tutorPhone}` : " · ⚠ sin teléfono"}` : "—"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-700">WhatsApp: {s.commsMode === "BOTH" ? "Ambos" : s.commsMode === "STUDENT_ONLY" ? "Solo alumno" : "Solo tutor"}</span>
                    <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px] font-bold">Paga: {s.billingMode === "PROPIO" ? "Alumno" : "Tutor"}</span>
                    {s.birthDate && <span className="rounded-full bg-muted border px-2 py-0.5 text-[10px] font-bold">Nac: {new Date(s.birthDate).toLocaleDateString("es-ES")}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Gustos: {safeArray(s.musicalTastes).join(", ")||"—"} · Artistas: {safeArray(s.favArtists).join(", ")||"—"}</div>
                  <div className="text-[11px] text-muted-foreground">Portal token: <span className="font-mono">{String(s.portalToken||"").slice(0,8)}…</span> · r/batch/{String(s.portalToken||"").slice(0,6)}</div>
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
                  <div key={sk.label} className="rounded-xl bg-muted/40 p-2 text-center"><div className="text-[10px] font-bold uppercase text-muted-foreground">{sk.label}</div><div className="text-sm font-black">{sk.v}/5</div><div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-red-500" style={{width:`${sk.v/5*100}%`}} /></div></div>
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
            <div className="flex items-center justify-between"><h3 className="font-bold">{selected?"Editar alumno":"Nuevo alumno (Contact 1:1)"} · Paso {step}/3</h3><button type="button" onClick={()=>setShowForm(false)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <div className="mt-2 flex gap-1.5">{[1,2,3].map((n)=> <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-red-500" : "bg-muted"}`} />)}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              {step === 1 && "Paso 1 · Quién recibe el servicio: elige el Contact del alumno (quien viene a clase) y su fecha de nacimiento."}
              {step === 2 && "Paso 2 · Quién contrata y recibe comunicaciones: un único tutor (padre/madre). No puede ser el propio alumno."}
              {step === 3 && "Paso 3 · Comunicación y pago: a quién va el WhatsApp y quién lo paga. Vista previa del reparto."}
            </p>
            {step === 1 && (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold">Contacto alumno *<select value={form.contactId} onChange={(e)=>setForm({...form, contactId:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm"><option value="">— Selecciona Contact —</option>{contacts.map((c)=> <option key={c.id} value={c.id}>{c.name} · {c.phone || "sin teléfono"}</option>)}</select></label>
              <label className="block text-xs font-bold">Fecha de nacimiento (para saber si es menor)<input type="date" value={form.birthDate} onChange={(e)=>setForm({...form, birthDate:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">Instrumentos<div className="mt-1 flex flex-wrap gap-1">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=>{ const active=form.instruments.includes(ins.key); return <button type="button" key={ins.key} onClick={()=>setForm({...form, instruments: active? form.instruments.filter(k=>k!==ins.key): [...form.instruments, ins.key]})} className={`rounded-full border px-3 py-1 text-xs ${active?"bg-red-500 text-white":"bg-background"}`}>{ins.label}</button>; })}</div></label>
                <label className="text-xs font-bold">Principal<select value={form.primary} onChange={(e)=>setForm({...form, primary:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=><option key={ins.key} value={ins.key}>{ins.label}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">Nivel<select value={form.level} onChange={(e)=>setForm({...form, level:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs">{LEVELS.map(l=><option key={l} value={l}>{l}</option>)}</select></label>
                <label className="text-xs font-bold">Tier<select value={form.tier} onChange={(e)=>setForm({...form, tier:e.target.value as any})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs"><option value="ALUMNO">ALUMNO</option><option value="ARTISTA">ARTISTA (premium upsell manual)</option></select></label>
              </div>
              <label className="text-xs font-bold">Gustos musicales (coma)<input value={form.tastes} onChange={(e)=>setForm({...form, tastes:e.target.value})} placeholder="rock, flamenco, indie" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
              <label className="text-xs font-bold">Artistas favoritos<input value={form.artists} onChange={(e)=>setForm({...form, artists:e.target.value})} placeholder="Rosalía, Flea" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
            </div>
            )}
            {step === 2 && (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold">Tutor único — Contact (padre/madre/tutor legal)<select value={form.tutorId} onChange={(e)=>setForm({...form, tutorId:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm"><option value="">— Sin tutor (alumno adulto) —</option>{contacts.filter((c)=>c.id!==form.contactId).map((c)=> <option key={c.id} value={c.id}>{c.name} · {c.phone || "sin teléfono"}</option>)}</select></label>
              {form.tutorId && (
              <label className="block text-xs font-bold">Parentesco<select value={form.guardianRelation} onChange={(e)=>setForm({...form, guardianRelation:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm">{GUARDIAN_RELATIONS.map((r)=><option key={r} value={r}>{r}</option>)}</select></label>
              )}
              {!form.tutorId && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700">Sin tutor: el alumno recibe todo directamente y paga él (modo PROPIO).</p>}
            </div>
            )}
            {step === 3 && (
            <div className="mt-3 space-y-3">
              <div className="text-xs font-bold">¿A quién va el WhatsApp del reporte?
                <div className="mt-1.5 grid gap-2">{COMMS_MODES.map((m)=>(
                  <button type="button" key={m.key} onClick={()=>setForm({...form, commsMode:m.key})} className={`rounded-xl border p-3 text-left ${form.commsMode===m.key ? "border-red-500 bg-red-500/5" : "border-border/40"}`}>
                    <div className="text-xs font-black">{m.label}</div><div className="text-[11px] text-muted-foreground">{m.hint}</div>
                  </button>))}</div>
              </div>
              <div className="text-xs font-bold">¿Quién paga?
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={()=>setForm({...form, billingMode:"TUTOR"})} className={`rounded-xl border p-3 text-xs font-bold ${form.billingMode==="TUTOR" ? "border-red-500 bg-red-500/5" : "border-border/40"}`}>Tutor</button>
                  <button type="button" onClick={()=>setForm({...form, billingMode:"PROPIO"})} className={`rounded-xl border p-3 text-xs font-bold ${form.billingMode==="PROPIO" ? "border-red-500 bg-red-500/5" : "border-border/40"}`}>Alumno (propio)</button>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                Vista previa: WhatsApp → <strong>{form.commsMode === "BOTH" ? "tutor + alumno" : form.commsMode === "STUDENT_ONLY" ? "alumno" : "tutor"}</strong> · Paga <strong>{form.billingMode === "PROPIO" ? "el alumno" : "el tutor"}</strong> · Mismo link familia <span className="font-mono">r/batch/…</span>
              </div>
            </div>
            )}
            <div className="mt-4 flex gap-2">
              {step > 1 && <button type="button" onClick={()=>setStep(step - 1)} className="rounded-xl border border-border/40 bg-background px-4 py-3 text-xs font-bold">Atrás</button>}
              <button type="submit" className="flex-1 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">{step < 3 ? "Continuar" : "Guardar alumno"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
