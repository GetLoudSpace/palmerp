"use client";

import React, { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import {
  PsychologicalProfile,
  WorkStyle,
  EnergyPattern,
  LearningStyle,
  MotivationDriver,
  UserProfile,
} from "@/types/core";

interface OnboardingStep {
  id: string;
  question: string;
  subtitle: string;
  type: "single" | "multi" | "text";
  options?: { value: string; label: string; icon?: string; description?: string }[];
  placeholder?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "name",
    question: "¿Cómo te llamas?",
    subtitle: "Queremos conocerte de verdad, no solo tu nombre en la nómina.",
    type: "text",
    placeholder: "Tu nombre...",
  },
  {
    id: "role",
    question: "¿A qué te dedicas aquí?",
    subtitle: "No el título formal, sino lo que realmente haces.",
    type: "text",
    placeholder: "Ej: Diseño interfaces, gestiono equipos, analizo datos...",
  },
  {
    id: "workStyle",
    question: "¿Cómo trabajas mejor?",
    subtitle: "Elige las que más te identifiquen (puedes elegir varias).",
    type: "multi",
    options: [
      { value: "analytical", label: "Analítico", description: "Datos, lógica, estructura" },
      { value: "creative", label: "Creativo", description: "Ideas nuevas, innovación" },
      { value: "social", label: "Social", description: "Personas, equipo, comunicación" },
      { value: "structured", label: "Organizado", description: "Procesos, planificación" },
      { value: "adaptive", label: "Adaptable", description: "Cambio rápido, improvisación" },
    ],
  },
  {
    id: "energyPattern",
    question: "¿Cuándo rindes mejor?",
    subtitle: "Tu energía natural, no el horario impuesto.",
    type: "single",
    options: [
      { value: "morning", label: "Mañana", description: "6:00 - 12:00", icon: "Sunrise" },
      { value: "afternoon", label: "Mediodía", description: "12:00 - 17:00", icon: "Sun" },
      { value: "evening", label: "Tarde-Noche", description: "17:00 - 22:00", icon: "Moon" },
      { value: "flexible", label: "Flexible", description: "Depende del día", icon: "Clock" },
    ],
  },
  {
    id: "motivationDrivers",
    question: "¿Qué te motiva de verdad?",
    subtitle: "Elige las 2-3 que más resuenen contigo.",
    type: "multi",
    options: [
      { value: "growth", label: "Crecimiento", description: "Aprender y evolucionar" },
      { value: "autonomy", label: "Autonomía", description: "Libertad para decidir" },
      { value: "purpose", label: "Propósito", description: "Sentir que importa" },
      { value: "mastery", label: "Maestría", description: "Ser excelente en algo" },
      { value: "recognition", label: "Reconocimiento", description: "Que valoren tu trabajo" },
      { value: "connection", label: "Conexión", description: "Relaciones genuinas" },
    ],
  },
  {
    id: "learningStyle",
    question: "¿Cómo aprendes mejor?",
    subtitle: "Esto nos ayuda a recomendarte formación que realmente funcione.",
    type: "single",
    options: [
      { value: "visual", label: "Visual", description: "Diagramas, vídeos, gráficos" },
      { value: "auditory", label: "Auditivo", description: "Podcasts, conversaciones" },
      { value: "kinesthetic", label: "Práctico", description: "Haciendo, experimentando" },
      { value: "reading", label: "Lectura", description: "Artículos, libros, docs" },
      { value: "mixed", label: "Mixto", description: "Depende del tema" },
    ],
  },
  {
    id: "strengths",
    question: "¿En qué destacas?",
    subtitle: "Tus superpoderes. Lo que la gente reconoce en ti.",
    type: "text",
    placeholder: "Ej: Resuelvo problemas complejos, conecto con la gente, organizo el caos...",
  },
  {
    id: "growthAreas",
    question: "¿Qué te gustaría mejorar?",
    subtitle: "No son debilidades, son áreas de crecimiento. Todos las tenemos.",
    type: "text",
    placeholder: "Ej: Hablar en público, delegar más, gestionar el estrés...",
  },
  {
    id: "vision",
    question: "¿Dónde te ves en 1 año?",
    subtitle: "No la respuesta de entrevista. Lo que realmente deseas.",
    type: "text",
    placeholder: "Ej: Liderar un equipo, dominar una habilidad, tener más equilibrio...",
  },
];

const STORAGE_KEY_PROFILE = "palmera_user_profile";
const STORAGE_KEY_PSYCH = "palmera_psychological_profile";
const STORAGE_KEY_DEV_PLAN = "palmera_development_plan";

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [textValue, setTextValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentStep]);

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = () => {
    if (step.type === "text") {
      if (!textValue.trim()) return;
      setAnswers((prev) => ({ ...prev, [step.id]: textValue.trim() }));
    } else {
      if (selectedOptions.length === 0) return;
      setAnswers((prev) => ({ ...prev, [step.id]: [...selectedOptions] }));
    }

    if (isLastStep) {
      saveProfile();
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
      setTextValue("");
      setSelectedOptions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && step.type === "text") {
      e.preventDefault();
      handleNext();
    }
  };

  const toggleOption = (value: string) => {
    if (step.type === "single") {
      setSelectedOptions([value]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    }
  };

  const saveProfile = () => {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: answers.name || "Usuario",
      role: answers.role || "",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      dailyScrumCount: 0,
      profileComplete: true,
    };
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));

    const psychProfile: PsychologicalProfile = {
      workStyle: (answers.workStyle || []) as WorkStyle[],
      energyPattern: (answers.energyPattern?.[0] || "flexible") as EnergyPattern,
      learningStyle: (answers.learningStyle?.[0] || "mixed") as LearningStyle,
      motivationDrivers: (answers.motivationDrivers || []) as MotivationDriver[],
      strengths: (answers.strengths || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      growthAreas: (answers.growthAreas || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      stressTriggers: [],
      preferredFeedback: "gentle",
      communicationStyle: "concise",
      wellbeingScore: 70,
      engagementScore: 70,
      autonomyLevel: "independent",
      notes: answers.vision || "",
    };
    localStorage.setItem(STORAGE_KEY_PSYCH, JSON.stringify(psychProfile));

    const devPlan = {
      userId: profile.id,
      vision: answers.vision || "",
      shortTermGoals: [],
      longTermGoals: [],
      currentSkills: [],
      insights: [],
      reflections: [],
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_DEV_PLAN, JSON.stringify(devPlan));
  };

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0c0a09] text-neutral-200 flex flex-col" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 mx-auto max-w-7xl w-full px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-red-600 to-red-500 shadow-md shadow-red-500/20">
            <Icons.Palmtree className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium tracking-tight text-white">
            Palm <span className="text-red-500">ERP</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-neutral-500">
            {currentStep + 1} de {onboardingSteps.length}
          </span>
          <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-xl w-full px-6 flex-1 flex flex-col justify-center">
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Question */}
          <div className="space-y-2">
            <h2 className="text-xl font-normal tracking-tight text-neutral-100 md:text-2xl">
              {step.question}
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {step.subtitle}
            </p>
          </div>

          {/* Input */}
          {step.type === "text" ? (
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-red-500/50 transition-colors">
              <textarea
                ref={inputRef}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={step.placeholder}
                className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-hidden max-h-32 min-h-[24px]"
                rows={2}
              />
              <button
                onClick={handleNext}
                disabled={!textValue.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 transition-colors"
              >
                <Icons.ArrowUp className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {step.options?.map((option) => {
                const isSelected = selectedOptions.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                          isSelected
                            ? "border-red-500 bg-red-500"
                            : "border-white/20"
                        }`}
                      >
                        {isSelected && <Icons.Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-neutral-200">{option.label}</span>
                        {option.description && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">{option.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNext}
                  disabled={selectedOptions.length === 0}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-500 px-5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 transition-colors"
                >
                  <span>{isLastStep ? "Empezar" : "Continuar"}</span>
                  <Icons.ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-4 bg-black/20">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <p className="text-[10px] text-neutral-600">
            Tu perfil es personal y privado. Solo tú puedes verlo.
          </p>
          {currentStep > 0 && (
            <button
              onClick={() => {
                setCurrentStep((prev) => prev - 1);
                setTextValue("");
                setSelectedOptions([]);
              }}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ← Atrás
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
