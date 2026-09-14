import EducationAgenda from "@/modules/education/components/EducationAgenda";
export const metadata = { title: "Agenda — Educación | Palmera" };
export default function Page(){
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 bg-card p-4">
        <h1 className="text-lg font-black">Agenda</h1>
        <p className="text-xs text-muted-foreground">Calendario compartido Google-like — mismos datos que en Profesor. Filtra por aula y profesor. Cada slot vinculado a alumno.</p>
      </div>
      <EducationAgenda />
    </div>
  );
}
