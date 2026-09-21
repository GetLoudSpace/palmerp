"use client";

import React, { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import { Task } from "@/types/core";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface DailyScrumChatProps {
  onTasksExtracted?: (tasks: Task[]) => void;
  onNavigateToProject?: () => void;
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

export default function DailyScrumChat({ onTasksExtracted, onNavigateToProject }: DailyScrumChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extractedTasks, setExtractedTasks] = useState<Task[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      role: "assistant",
      content: "¡Buenos días! 👋 Vamos a hacer tu Daily Scrum de 5 minutos.\n\nTe haré 3 preguntas clave para organizar tu día. ¿Empezamos?",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    const questionKey = DAILY_SCRUM_QUESTIONS[currentQuestion].key;
    setAnswers((prev) => ({ ...prev, [questionKey]: currentAnswer }));

    if (currentQuestion < DAILY_SCRUM_QUESTIONS.length - 1) {
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
      try {
        const allAnswers = { ...answers, [questionKey]: currentAnswer };
        const response = await fetch("/api/daily-scrum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Ayer: ${allAnswers.yesterday}\n\nHoy: ${allAnswers.today}\n\nBloqueos: ${allAnswers.blockers}`,
              },
            ],
            action: "extract_tasks",
          }),
        });

        const data = await response.json();

        if (data.success && data.tasks) {
          setExtractedTasks(data.tasks);
          setIsComplete(true);
          onTasksExtracted?.(data.tasks);

          localStorage.setItem("palmera_daily_tasks", JSON.stringify(data.tasks));

          const summaryMessage: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: `¡Perfecto! He extraído ${data.tasks.length} tareas de tu Daily Scrum.\n\n${data.summary || "Aquí tienes el resumen de tu día:"}`,
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRestart = () => {
    setMessages([]);
    setInput("");
    setCurrentQuestion(0);
    setAnswers({});
    setExtractedTasks([]);
    setIsComplete(false);
    setError(null);

    const welcomeMessage: Message = {
      id: "welcome",
      role: "assistant",
      content: "¡Vamos de nuevo! ¿Qué hiciste ayer?",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const priorityConfig = {
    critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "Crítica" },
    high: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "Alta" },
    medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Media" },
    low: { color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", label: "Baja" },
  };

  return (
    <div className="flex flex-col h-screen bg-[#0c0a09] text-neutral-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0c0a09]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-red-600 to-red-500 shadow-md shadow-red-500/20">
            <Icons.Palmtree className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">
              Palm <span className="text-red-500">Daily</span>
            </h1>
            <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">
              {isComplete ? "Completado" : `Pregunta ${currentQuestion + 1}/3`}
            </p>
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
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
              <p
                className={`text-[10px] mt-2 ${
                  msg.role === "user" ? "text-red-100/70" : "text-neutral-500"
                }`}
              >
                {msg.timestamp.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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

      {/* Tasks Panel (when complete) */}
      {isComplete && extractedTasks.length > 0 && (
        <div className="border-t border-white/5 bg-white/[0.02] px-4 py-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
              <Icons.CheckSquare className="h-4 w-4" />
              <span>Tareas Extraídas ({extractedTasks.length})</span>
            </h3>
          </div>

          <div className="space-y-2">
            {extractedTasks.map((task) => {
              const pConfig = priorityConfig[task.priority];
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-red-500/20 transition-colors"
                >
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
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/5 bg-[#0c0a09]/80 backdrop-blur-md px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-red-500/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentQuestion < DAILY_SCRUM_QUESTIONS.length
                  ? DAILY_SCRUM_QUESTIONS[currentQuestion].hint
                  : "Escribe tu mensaje..."
              }
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-hidden max-h-32 min-h-[24px]"
              rows={1}
              disabled={isLoading || isComplete}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isComplete}
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
      </div>
    </div>
  );
}
