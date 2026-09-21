import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ClassReportPanel from "@/modules/education/components/ClassReportPanel";
import ProfessorsManager from "@/modules/education/components/ProfessorsManager";

export const metadata = { title: "Educación — Profesor | Palmera", description: "Tus clases de hoy y envío de reportes por WhatsApp" };

export default async function Page() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role === "ADMIN" || role === "DEV";
  const firstName = session?.user?.name?.split(" ")[0] || "profe";
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
        <h1 className="text-xl font-black">Hola, {firstName} — tus clases de hoy</h1>
        <p className="mt-0.5 text-xs text-muted-foreground capitalize">{today} · Finaliza cada clase para enviar el reporte por WhatsApp.</p>
        <Link
          href="/admin/education/agenda"
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-bold hover:bg-muted transition"
        >
          Ver agenda completa →
        </Link>
      </div>

      {/* Clases de hoy con Finalizar → WhatsApp (filtradas por profesor logueado) */}
      <ClassReportPanel />

      {/* Gestión de profesores: solo ADMIN/DEV. El profesor no ve a los demás. */}
      {isAdmin && (
        <div className="space-y-3 pt-2">
          <ProfessorsManager />
        </div>
      )}
    </div>
  );
}
