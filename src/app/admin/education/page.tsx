import EducationDashboard from "@/modules/education/components/EducationDashboard";
import EducationAgenda from "@/modules/education/components/EducationAgenda";
import ProfessorsManager from "@/modules/education/components/ProfessorsManager";

export const metadata = { title: "Educación — Profesor | Palmera", description: "Profesores, agenda calendario y seguimiento" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
        <h1 className="text-xl font-black">Profesor</h1>
        <p className="text-xs text-muted-foreground">Sección Profesor (antes Agenda) — crea profesores y gestiona agenda compartida.</p>
      </div>
      <ProfessorsManager />
      <EducationDashboard />
      <div className="rounded-none md:rounded-3xl">
        <h2 className="text-sm font-black flex items-center gap-2 px-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Agenda — calendario compartido</h2>
        <p className="text-xs text-muted-foreground px-1 mb-3">Todo nace de la agenda (comportamiento Google Calendar). Filtra por aula/espacio y profesor. Cada slot vinculado a alumno y profesor, conectado al seguimiento (última clase + propuesta ejercicio siguiente). Verás demás profesores — arquitectura compartida con RLS por teacherId. Google Calendar opcional y desconectable.</p>
        <EducationAgenda />
      </div>
    </div>
  );
}
