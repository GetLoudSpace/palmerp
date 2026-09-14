export type InstrumentKey = string;

export interface InstrumentDef {
  key: string;
  label: string;
  icon: string;
  color: string; // tailwind base
  description: string;
}

export const EDUCATION_INSTRUMENTS: Record<string, InstrumentDef> = {
  GUITARRA: { key: "GUITARRA", label: "Guitarra", icon: "Music", color: "amber", description: "Guitarra acústica/clásica/eléctrica" },
  BAJO: { key: "BAJO", label: "Bajo", icon: "AudioLines", color: "sky", description: "Bajo eléctrico" },
  PIANO: { key: "PIANO", label: "Piano", icon: "Piano", color: "zinc", description: "Piano acústico/digital" },
  BATERIA: { key: "BATERIA", label: "Batería", icon: "Drum", color: "red", description: "Batería acústica/electrónica" },
  VOZ: { key: "VOZ", label: "Voz", icon: "Mic2", color: "emerald", description: "Canto y técnica vocal" },
  COMMON: { key: "COMMON", label: "Transversal", icon: "Layers", color: "slate", description: "Ritmo, teoría, oído" },
};

export const INSTRUMENT_KEYS = Object.keys(EDUCATION_INSTRUMENTS);

export function getInstrumentDef(key: string): InstrumentDef {
  return EDUCATION_INSTRUMENTS[key] ?? { key, label: key, icon: "Music", color: "slate", description: "" };
}

export function instrumentColorClasses(key: string): string {
  const def = getInstrumentDef(key);
  const map: Record<string, string> = {
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    zinc: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
    red: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  };
  return map[def.color] ?? map.slate;
}
