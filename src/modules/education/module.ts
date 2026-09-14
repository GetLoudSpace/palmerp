import { PalmModeConfig } from "@/types/core";

export const educationModule: PalmModeConfig = {
  id: "EDUCACION",
  name: "Educación",
  description: "Seguimiento multi-instrumento, biblioteca, WhatsApp Cloud API y portal artista premium.",
  icon: "GraduationCap",
  category: "Operaciones",
  menuItems: [
    { label: "Panel Profesor", path: "/admin/education" },
    { label: "Alumnos", path: "/admin/education/students" },
    { label: "Clases & Seguimiento", path: "/admin/education/lessons" },
    { label: "Biblioteca", path: "/admin/education/library" },
    { label: "Artista", path: "/admin/education/artist" },
  ],
};
