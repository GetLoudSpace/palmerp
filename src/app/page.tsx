"use client";

import React, { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import { Task } from "@/types/core";
import OnboardingFlow from "@/components/OnboardingFlow";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const DAILY_SCRUM_QUESTIONS = [
  {
    key: "yesterday",
    question: "¿Qué hiciste ayer?",
    hint: "Cuéntame las tareas que completaste ayer...",
  },
  {
    key: "today",
    question: "¿Qué harás hoy?",
    hint: "¿Cuáles son tus objetivos para hoy?",
  },
  {
    key: "blockers",
    question: "¿Tienes algún bloqueo?",
    hint: "¿Hay algo que te impida avanzar?",
  },
];

const WELLBEING_CHECK = [
  {
    key: "mood",
    question: "¿Cómo te sientes hoy?",
    hint: "Del 1 al 10, ¿cómo está tu ánimo?",
    type: "rating",
  },
  {
    key: "energy",
    question: "¿Qué nivel de energía tienes?",
    hint: "Del 1 al 10, ¿cuánta energía sientes?",
    type: "rating",
  },
  {
    key: "wellbeing_note",
    question: "¿Hay algo que quieras compartir sobre cómo te sientes?",
    hint: "Opcional. Si quieres desahogarte, estoy aquí.",
    type: "text",
  },
];

const wellnessPills = [
  {
    icon: Icons.Coffee,
    title: "Descanso 20-20-20",
    text: "Cada 20 minutos, mira algo a 6 metros durante 20 segundos. Reduce la fatiga visual un 60%.",
  },
  {
    icon: Icons.Apple,
    title: "Snacks de oficina",
    text: "Nueces y arándanos mejoran la concentración. Evita el azúcar refinado tras las 15h.",
  },
  {
    icon: Icons.Lightbulb,
    title: "Estimular creatividad",
    text: "Una caminata de 10 minutos sin móvil aumenta la generación de ideas un 60% (Stanford, 2014).",
  },
  {
    icon: Icons.Moon,
    title: "Desconexión real",
    text: "Cierra los ojos 2 minutos y respira 4-7-8: inhala 4s, mantén 7s, exhala 8s. Activa el sistema parasimpático.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extractedTasks, setExtractedTasks] = useState<Task[]>([]);
  const [taskValidations, setTaskValidations] = useState<Record<string, "approved" | "adjusted" | "rejected">>({});
  const [isComplete, setIsComplete] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatStarted = messages.length > 0;

  const isTenantSubdomain = (() => {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
    if (isLocalhost) {
      const parts = hostname.split(".");
      return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www";
    }
    const parts = hostname.split(".");
    return parts.length > 2 && parts[0] !== "www";
  })();

  useEffect(() => {
    const profile = localStorage.getItem("palmera_user_profile");
    if (!profile) {
      setShowOnboarding(true);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("palmera_validation_history");
    if (stored) {
      const history: { action: string }[] = JSON.parse(stored);
      const approved = history.filter((h) => h.action === "approved").length;
      const adjusted = history.filter((h) => h.action === "adjusted").length;
      const rejected = history.filter((h) => h.action === "rejected").length;
      const total = approved + adjusted + rejected;
      if (total > 0) {
        setAccuracyScore(Math.round(((approved + adjusted * 0.5) / total) * 100));
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatStarted && !isComplete && !isLoading) {
      inputRef.current?.focus();
    }
  }, [chatStarted, messages.length, isComplete, isLoading]);

  const startChat = (firstAnswer: string) => {
    setAnswers({ yesterday: firstAnswer });
    setCurrentQuestion(1);

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: firstAnswer,
      timestamp: new Date(),
    };
    setMessages([userMsg]);

    setTimeout(() => {
      const nextQ = DAILY_SCRUM_QUESTIONS[1];
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `${nextQ.question}\n\n${nextQ.hint}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 600);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentAnswer = input.trim();
    setInput("");
    setIsLoading(true);
    setError(null);

    const totalScrumQuestions = DAILY_SCRUM_QUESTIONS.length;
    const totalWellbeingQuestions = WELLBEING_CHECK.length;
    const totalQuestions = totalScrumQuestions + totalWellbeingQuestions;

    // Determine which question we're on
    if (currentQuestion < totalScrumQuestions) {
      // Scrum phase
      const questionKey = DAILY_SCRUM_QUESTIONS[currentQuestion].key;
      setAnswers((prev) => ({ ...prev, [questionKey]: currentAnswer }));

      if (currentQuestion < totalScrumQuestions - 1) {
        // Next scrum question
        setTimeout(() => {
          const nextQuestion = DAILY_SCRUM_QUESTIONS[currentQuestion + 1];
          const assistantMessage: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: `${nextQuestion.question}\n\n${nextQuestion.hint}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentQuestion((prev) => prev + 1);
          setIsLoading(false);
        }, 600);
      } else {
        // Last scrum question → start wellbeing check
        setTimeout(() => {
          const firstWellbeing = WELLBEING_CHECK[0];
          const assistantMessage: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: `${firstWellbeing.question}\n\n${firstWellbeing.hint}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentQuestion(totalScrumQuestions);
          setIsLoading(false);
        }, 600);
      }
    } else {
      // Wellbeing phase
      const wellbeingIndex = currentQuestion - totalScrumQuestions;
      const wellbeingKey = WELLBEING_CHECK[wellbeingIndex].key;
      setAnswers((prev) => ({ ...prev, [wellbeingKey]: currentAnswer }));

      if (wellbeingIndex < totalWellbeingQuestions - 1) {
        // Next wellbeing question
        setTimeout(() => {
          const nextWellbeing = WELLBEING_CHECK[wellbeingIndex + 1];
          const assistantMessage: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: `${nextWellbeing.question}\n\n${nextWellbeing.hint}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentQuestion((prev) => prev + 1);
          setIsLoading(false);
        }, 600);
      } else {
        // All questions done → extract tasks
        try {
          const allAnswers = { ...answers, [wellbeingKey]: currentAnswer };
          const response = await fetch("/api/daily-scrum", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: `Ayer: ${allAnswers.yesterday}\n\nHoy: ${allAnswers.today}\n\nBloqueos: ${allAnswers.blockers}\n\nÁnimo: ${allAnswers.mood}/10\nEnergía: ${allAnswers.energy}/10\nNota bienestar: ${allAnswers.wellbeing_note || "Ninguna"}`,
                },
              ],
              action: "extract_tasks",
            }),
          });

          const data = await response.json();

          if (data.success && data.tasks) {
            setExtractedTasks(data.tasks);
            setIsComplete(true);
            localStorage.setItem("palmera_daily_tasks", JSON.stringify(data.tasks));

            // Save wellbeing reflection
            const reflections = JSON.parse(localStorage.getItem("palmera_reflections") || "[]");
            reflections.push({
              date: new Date().toISOString(),
              mood: parseInt(allAnswers.mood) || 5,
              energy: parseInt(allAnswers.energy) || 5,
              note: allAnswers.wellbeing_note || "",
            });
            localStorage.setItem("palmera_reflections", JSON.stringify(reflections));

            const summaryMessage: Message = {
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: `He extraído ${data.tasks.length} tareas de tu Daily Scrum.\n\n${data.summary || "Aquí tienes el resumen de tu día:"}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, summaryMessage]);
          } else {
            throw new Error(data.error || "No se pudieron extraer las tareas");
          }
        } catch (err: any) {
          setError(err.message || "Error al procesar el Daily Scrum");
          const errorMessage: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: "Lo siento, ha ocurrido un error al procesar tus respuestas. Inténtalo de nuevo.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!chatStarted) {
        if (input.trim()) {
          startChat(input.trim());
          setInput("");
        }
      } else {
        handleSend();
      }
    }
  };

  const handleRestart = () => {
    setMessages([]);
    setInput("");
    setCurrentQuestion(0);
    setAnswers({});
    setExtractedTasks([]);
    setTaskValidations({});
    setIsComplete(false);
    setError(null);
    setAccuracyScore(null);
  };

  const updateAccuracy = (taskId: string, action: "approved" | "adjusted" | "rejected") => {
    const stored = localStorage.getItem("palmera_validation_history");
    const history: { action: string; timestamp: string }[] = stored ? JSON.parse(stored) : [];
    history.push({ action, timestamp: new Date().toISOString() });
    localStorage.setItem("palmera_validation_history", JSON.stringify(history));

    const approved = history.filter((h) => h.action === "approved").length;
    const adjusted = history.filter((h) => h.action === "adjusted").length;
    const rejected = history.filter((h) => h.action === "rejected").length;
    const total = approved + adjusted + rejected;

    if (total > 0) {
      const score = Math.round(((approved + adjusted * 0.5) / total) * 100);
      setAccuracyScore(score);
    }
  };

  const priorityConfig = {
    critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "Crítica" },
    high: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "Alta" },
    medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Media" },
    low: { color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", label: "Baja" },
  };

  const totalQuestions = DAILY_SCRUM_QUESTIONS.length + WELLBEING_CHECK.length;
  const currentQuestionLabel = currentQuestion < DAILY_SCRUM_QUESTIONS.length
    ? `Pregunta ${currentQuestion + 1}/${totalQuestions}`
    : `Bienestar ${currentQuestion - DAILY_SCRUM_QUESTIONS.length + 1}/${WELLBEING_CHECK.length}`;

  return (
    <>
      {!profileLoaded && (
        <div className="min-h-screen bg-[#0c0a09] text-neutral-200 flex items-center justify-center">
          <div className="flex items-center gap-2 text-neutral-400">
            <Icons.Loader2 className="h-4 w-4 animate-spin text-red-500" />
          </div>
        </div>
      )}

      {showOnboarding && profileLoaded && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}

      {profileLoaded && !showOnboarding && (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0c0a09] text-neutral-200 flex flex-col" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
          <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 mx-auto max-w-7xl w-full px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-red-600 to-red-500 shadow-md shadow-red-500/20">
            <Icons.Palmtree className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium tracking-tight text-white">
              Palm <span className="text-red-500">ERP</span>
            </span>
            {chatStarted && (
              <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold">
                {isComplete ? "Completado" : currentQuestionLabel}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isComplete && (
            <>
              <button
                onClick={() => window.location.href = "/project"}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
              >
                <Icons.LayoutGrid className="h-3.5 w-3.5" />
                <span>Ver Proyecto</span>
              </button>
              <button
                onClick={handleRestart}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Icons.RotateCcw className="h-3.5 w-3.5" />
                <span>Nuevo Daily</span>
              </button>
            </>
          )}
          <a
            href="/admin"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10"
          >
            <Icons.Palmtree className="h-3.5 w-3.5 text-red-500" />
            <span>ERP</span>
          </a>
          {!isTenantSubdomain && (
            <a
              href="/superadmin"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10"
            >
              <span>Consola</span>
              <Icons.ArrowRight className="h-3.5 w-3.5 text-red-500" />
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-2xl w-full px-6 flex-1 flex flex-col">
        {/* Welcome title (hidden once chat starts) */}
        {!chatStarted && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-6">
              <h2 className="text-xl font-normal tracking-tight text-neutral-200 md:text-2xl">
                ¿Cuáles son tus objetivos para hoy?
              </h2>
            </div>
          </div>
        )}

        {/* Messages area */}
        {chatStarted && (
          <div className="flex-1 overflow-y-auto py-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-5 py-3.5 ${
                    msg.role === "user"
                      ? "bg-red-500 text-white"
                      : "bg-white/5 border border-white/10 text-neutral-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-2 ${msg.role === "user" ? "text-red-100/70" : "text-neutral-500"}`}>
                    {msg.timestamp.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Icons.Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                    <span className="text-xs text-neutral-400">Procesando...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-xs text-red-400">
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Tasks Panel with Validation */}
        {isComplete && extractedTasks.length > 0 && (
          <div className="border-t border-white/5 bg-white/[0.02] px-4 py-4 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icons.CheckSquare className="h-4 w-4 text-red-500" />
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                  Tareas Extraídas ({extractedTasks.length})
                </span>
              </div>
              {accuracyScore !== null && (
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <Icons.Target className="h-3 w-3" />
                  <span>Precisión: {accuracyScore}%</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-neutral-500 mb-3">
              Valida cada tarea. Cuanto más valides, mejor te conozco.
            </p>

            <div className="space-y-2">
              {extractedTasks.map((task) => {
                const pConfig = priorityConfig[task.priority];
                const validation = taskValidations[task.id];
                return (
                  <div
                    key={task.id}
                    className={`rounded-xl border p-3 transition-all ${
                      validation === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : validation === "rejected"
                        ? "border-red-500/20 bg-red-500/5 opacity-50"
                        : validation === "adjusted"
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-white/5 bg-white/[0.02] hover:border-red-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${pConfig.bg} ${pConfig.border} border`}>
                        <div className={`h-2 w-2 rounded-full ${pConfig.color.replace("text", "bg")}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-white truncate">{task.title}</h4>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pConfig.bg} ${pConfig.color} border ${pConfig.border}`}>
                            {pConfig.label}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {task.module && (
                            <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                              <Icons.Folder className="h-3 w-3" />
                              {task.module}
                            </span>
                          )}
                          {task.estimatedTime && (
                            <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                              <Icons.Clock className="h-3 w-3" />
                              {task.estimatedTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Validation buttons */}
                    {!validation && (
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            setTaskValidations((prev) => ({ ...prev, [task.id]: "approved" }));
                            updateAccuracy(task.id, "approved");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                        >
                          <Icons.Check className="h-3 w-3" />
                          Correcta
                        </button>
                        <button
                          onClick={() => {
                            setTaskValidations((prev) => ({ ...prev, [task.id]: "adjusted" }));
                            updateAccuracy(task.id, "adjusted");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                        >
                          <Icons.Edit className="h-3 w-3" />
                          Ajustar
                        </button>
                        <button
                          onClick={() => {
                            setTaskValidations((prev) => ({ ...prev, [task.id]: "rejected" }));
                            updateAccuracy(task.id, "rejected");
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                        >
                          <Icons.X className="h-3 w-3" />
                          No aplica
                        </button>
                      </div>
                    )}

                    {validation && (
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-neutral-500">
                          {validation === "approved" && "✓ Validada"}
                          {validation === "adjusted" && "✎ Ajustada"}
                          {validation === "rejected" && "✗ Descartada"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/5 bg-[#0c0a09]/80 backdrop-blur-md px-4 py-4">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-red-500/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatStarted
                  ? (currentQuestion < DAILY_SCRUM_QUESTIONS.length
                      ? DAILY_SCRUM_QUESTIONS[currentQuestion]?.hint
                      : WELLBEING_CHECK[currentQuestion - DAILY_SCRUM_QUESTIONS.length]?.hint) || "Escribe tu mensaje..."
                  : "Cuéntame cómo te puedo ayudar..."
              }
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-hidden max-h-32 min-h-[24px]"
              rows={1}
              disabled={isLoading}
              autoFocus
            />
            <button
              onClick={() => {
                if (!input.trim() || isLoading) return;
                if (!chatStarted) {
                  startChat(input.trim());
                  setInput("");
                } else {
                  handleSend();
                }
              }}
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 transition-colors"
            >
              {isLoading ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-neutral-600 text-center mt-2">
            Palmera Daily Scrum · Powered by {process.env.AI_PROVIDER === "ollama" ? "Ollama" : "OpenRouter"}
          </p>
        </div>
      </main>

      {/* Wellness Pills Footer */}
      <footer className="relative z-10 border-t border-white/5 py-5 bg-black/20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold mb-3">
            Bienestar
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {wellnessPills.map((pill, idx) => {
              const Icon = pill.icon;
              return (
                <div key={idx} className="flex items-start gap-2.5 rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2.5">
                  <Icon className="h-3.5 w-3.5 text-red-500/60 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] font-medium text-neutral-400">{pill.title}</span>
                    <p className="text-[10px] text-neutral-600 leading-relaxed mt-0.5">{pill.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] text-neutral-700">
              © {new Date().getFullYear()} Palmera
            </p>
          </div>
        </div>
      </footer>
        </div>
      )}
    </>
  );
}
