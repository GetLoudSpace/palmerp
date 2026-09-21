"use client";

import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";

export default function AdminUnavailablePage() {
  const router = useRouter();
  const pathname = usePathname();
  const destination = pathname.split("/").filter(Boolean).slice(1).join(" / ");

  return (
    <div className="flex min-h-[65vh] items-center justify-center py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-border/50 bg-card/75 p-8 text-center shadow-xl backdrop-blur-md md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
          <Icons.Construction className="h-8 w-8" />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">Área en preparación</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">Esta herramienta todavía está tomando forma</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          La opción <span className="font-semibold text-foreground">{destination || "seleccionada"}</span> está registrada en Palmera, pero aún no tiene una pantalla operativa. Tu navegación y el menú permanecen intactos.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={() => router.back()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-xs font-bold text-background transition hover:opacity-85">
            <Icons.ArrowLeft className="h-4 w-4" /> Volver al lugar anterior
          </button>
          <button onClick={() => router.push("/admin")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-xs font-bold text-foreground transition hover:bg-muted">
            <Icons.Home className="h-4 w-4" /> Ir al inicio
          </button>
        </div>
      </section>
    </div>
  );
}
