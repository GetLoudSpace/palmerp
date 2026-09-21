"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { AIProvider } from "@/types/core";

interface AIModel {
  id: string;
  name: string;
  description: string;
  contextLength: number | null;
  isFree: boolean;
}

interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
}

const STORAGE_KEY = "palmera_ai_config";

const defaultConfig: AIConfig = {
  provider: "openrouter",
  model: "google/gemma-3-4b-it:free",
  apiKey: "",
  baseUrl: "http://localhost:11434",
};

export default function AISettingsPage() {
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {
        // use default
      }
    }
  }, []);

  useEffect(() => {
    if (config.provider && (config.provider === "ollama" || config.apiKey)) {
      fetchModels();
    }
  }, []);

  const fetchModels = async () => {
    setFetchingModels(true);
    try {
      const params = new URLSearchParams({
        provider: config.provider,
        ...(config.provider === "openrouter" && config.apiKey ? { apiKey: config.apiKey } : {}),
        ...(config.provider === "ollama" ? { baseUrl: config.baseUrl } : {}),
      });

      const res = await fetch(`/api/ai/models?${params}`);
      const data = await res.json();

      if (data.success) {
        setModels(data.models);
      } else {
        setModels([]);
      }
    } catch {
      setModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  const checkConnection = async () => {
    setConnectionStatus("checking");
    try {
      const params = new URLSearchParams({
        provider: config.provider,
        ...(config.provider === "openrouter" && config.apiKey ? { apiKey: config.apiKey } : {}),
        ...(config.provider === "ollama" ? { baseUrl: config.baseUrl } : {}),
      });

      const res = await fetch(`/api/ai/models?${params}`);
      const data = await res.json();

      if (data.success && data.models.length > 0) {
        setConnectionStatus("ok");
        setModels(data.models);
      } else {
        setConnectionStatus("error");
      }
    } catch {
      setConnectionStatus("error");
    }
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setToastMessage("¡Configuración de IA guardada!");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTestAndSave = async () => {
    await checkConnection();
    handleSave();
  };

  return (
    <div className="space-y-6 relative">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-xl border border-emerald-400 backdrop-blur-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
          <Icons.CheckCircle className="h-5 w-5 text-white animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl flex items-center gap-2">
            <Icons.Brain className="h-6 w-6 text-red-500" />
            Configuración de IA
          </div>
          <div className="text-xs text-muted-foreground block mt-1">
            Selecciona el proveedor de IA, configura la API key y elige el modelo para el Daily Scrum.
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Cols: Main settings */}
        <div className="md:col-span-2 space-y-6 bg-card border border-border/40 p-6 rounded-2xl">
          {/* Provider Selection */}
          <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest block mb-4 border-b border-border/20 pb-2">
            Proveedor de IA
          </span>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* OpenRouter */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, provider: "openrouter", model: "" })}
              className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                config.provider === "openrouter"
                  ? "border-red-500 bg-red-500/5"
                  : "border-border/40 bg-background hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icons.Cloud className={`h-5 w-5 ${config.provider === "openrouter" ? "text-red-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-bold text-foreground">OpenRouter</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Gateway multi-modelo.
              </p>
            </button>

            {/* Anthropic */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, provider: "anthropic", model: "claude-3-5-sonnet-20241022" })}
              className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                config.provider === "anthropic"
                  ? "border-red-500 bg-red-500/5"
                  : "border-border/40 bg-background hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icons.Sparkles className={`h-5 w-5 ${config.provider === "anthropic" ? "text-red-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-bold text-foreground">Anthropic</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Claude 3.5 Sonnet / Opus.
              </p>
            </button>

            {/* OpenAI */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, provider: "openai", model: "gpt-4o" })}
              className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                config.provider === "openai"
                  ? "border-red-500 bg-red-500/5"
                  : "border-border/40 bg-background hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icons.Bot className={`h-5 w-5 ${config.provider === "openai" ? "text-red-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-bold text-foreground">OpenAI</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                GPT-4o / GPT-4o-mini.
              </p>
            </button>

            {/* Nvidia */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, provider: "nvidia", model: "meta/llama-3.1-70b-instruct" })}
              className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                config.provider === "nvidia"
                  ? "border-red-500 bg-red-500/5"
                  : "border-border/40 bg-background hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icons.Cpu className={`h-5 w-5 ${config.provider === "nvidia" ? "text-red-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-bold text-foreground">Nvidia NIM</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Llama 3.1 / Nemotron.
              </p>
            </button>

            {/* Ollama */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, provider: "ollama", model: "" })}
              className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                config.provider === "ollama"
                  ? "border-red-500 bg-red-500/5"
                  : "border-border/40 bg-background hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icons.Laptop className={`h-5 w-5 ${config.provider === "ollama" ? "text-red-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-bold text-foreground">Ollama</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Modelos locales sin coste.
              </p>
            </button>
          </div>

          {/* Provider-specific settings */}
          {(config.provider === "openrouter" || config.provider === "anthropic" || config.provider === "openai" || config.provider === "nvidia") && (
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">API Key de {config.provider.toUpperCase()}</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder={`sk-${config.provider}-...`}
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 pr-10 text-xs text-foreground outline-hidden focus:border-red-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <Icons.EyeOff className="h-4 w-4" /> : <Icons.Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {config.provider === "ollama" && (
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">URL de Ollama</label>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Model Selection */}
          <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest block pt-4 mb-4 border-b border-border/20 pb-2">
            Modelo de IA
          </span>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchModels}
                disabled={fetchingModels || (config.provider === "openrouter" && !config.apiKey)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fetchingModels ? (
                  <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icons.RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>{fetchingModels ? "Cargando..." : "Cargar modelos"}</span>
              </button>

              <button
                type="button"
                onClick={checkConnection}
                disabled={connectionStatus === "checking" || (config.provider === "openrouter" && !config.apiKey)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {connectionStatus === "checking" ? (
                  <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icons.Plug className="h-3.5 w-3.5" />
                )}
                <span>Probar conexión</span>
              </button>

              {connectionStatus === "ok" && (
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <Icons.CheckCircle className="h-3 w-3" />
                  Conectado
                </span>
              )}
              {connectionStatus === "error" && (
                <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                  <Icons.XCircle className="h-3 w-3" />
                  Error de conexión
                </span>
              )}
            </div>

            {/* Model list */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-lg border border-border/40 p-2 bg-background">
              {fetchingModels ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                  <Icons.Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cargando modelos...
                </div>
              ) : models.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  {config.provider === "openrouter" && !config.apiKey
                    ? "Introduce tu API key para ver los modelos disponibles"
                    : "Pulsa 'Cargar modelos' para ver los disponibles"}
                </div>
              ) : (
                models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setConfig({ ...config, model: model.id })}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      config.model === model.id
                        ? "bg-red-500/10 border border-red-500/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{model.name}</span>
                      {model.isFree && (
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          GRATIS
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{model.description}</p>
                    )}
                    {model.contextLength && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Contexto: {model.contextLength.toLocaleString()} tokens
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Custom model input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                O escribe el modelo manualmente
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder={config.provider === "openrouter" ? "google/gemma-3-4b-it:free" : "llama3"}
                className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-mono"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-4 mt-6">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              <Icons.Save className="h-4 w-4" />
              <span>Guardar</span>
            </button>
            <button
              type="button"
              onClick={handleTestAndSave}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-metallic-red px-5 text-xs font-bold shadow-md shadow-red-500/25 transition-all hover:bg-red-600"
            >
              <Icons.CheckCircle className="h-4 w-4" />
              <span>Probar y Guardar</span>
            </button>
          </div>
        </div>

        {/* Right Col: Info */}
        <div className="space-y-6">
          <div className="bg-card border border-border/40 p-6 rounded-2xl">
            <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest block mb-4 border-b border-border/20 pb-2">
              Proveedores Disponibles
            </span>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icons.Cloud className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-bold text-foreground">OpenRouter</span>
                </div>
                <ul className="text-[10px] text-muted-foreground space-y-1">
                  <li>• Modelos gratuitos disponibles</li>
                  <li>• Google Gemma, Mistral, Llama</li>
                  <li>• Sin necesidad de infraestructura</li>
                  <li>• Requiere API key gratuita</li>
                </ul>
              </div>

              <div className="border-t border-border/30 pt-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icons.Laptop className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-bold text-foreground">Ollama</span>
                </div>
                <ul className="text-[10px] text-muted-foreground space-y-1">
                  <li>• Ejecución 100% local</li>
                  <li>• Sin costes de API</li>
                  <li>• Privacidad total de datos</li>
                  <li>• Requiere instalación local</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-muted/15 border border-border/40 p-5 rounded-2xl text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-extrabold text-foreground uppercase tracking-wider block mb-1">
              Nota sobre configuración
            </span>
            <span>
              La configuración se guarda en localStorage del navegador. Cada usuario puede tener su propia configuración de IA. La API key nunca se envía al servidor, solo se usa para consultar modelos disponibles.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
