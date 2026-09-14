import LessonsManager from "@/modules/education/components/LessonsManager";
import EducationAgenda from "@/modules/education/components/EducationAgenda";

export const metadata = { title: "Clases & Agenda — Educación | Palmera" };
export default function Page(){
  return (
    <div className="space-y-6">
      <EducationAgenda />
      <LessonsManager />
    </div>
  );
}
