import EducationDashboard from "@/modules/education/components/EducationDashboard";
import EducationAgenda from "@/modules/education/components/EducationAgenda";

export const metadata = { title: "Educación — Panel Profesor | Palmera", description: "Agenda Google-like con aulas/profesores, seguimiento y propuestas" };

export default function Page() {
  return (
    <div className="space-y-6">
      <EducationDashboard />
      <div className="rounded-none md:rounded-3xl">
        <h2 className="text-sm font-black flex items-center gap-2 px-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Agenda — calendario de clases</h2>
        <p className="text-xs text-muted-foreground px-1 mb-3">Todo nace de la agenda. Filtra por aula/espacio y profesor. Cada slot vinculado a alumno y conectado al seguimiento (última clase + propuesta ejercicio siguiente). Google Calendar sincronizado opcional, desconectable con el tiempo.</p>
        <EducationAgenda />
      </div>
    </div>
  );
}
