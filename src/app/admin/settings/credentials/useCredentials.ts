// src/app/admin/settings/credentials/useCredentials.ts
// Estado + llamadas del vault. El valor en claro solo vive en el input local
// hasta pulsar Guardar; al confirmar se limpia y solo quedan badges de estado.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CredStatus = {
  key: string;
  label: string;
  hint: string;
  configured: boolean;
  source: "vault" | "env" | null;
};

export type Toast = { msg: string; ok: boolean } | null;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Error de red");
  return data;
}

export function useCredentials() {
  const [creds, setCreds] = useState<CredStatus[]>([]);
  const [keyReady, setKeyReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/admin/credentials");
      setCreds(data.credentials || []);
      setKeyReady(data.secretsKeyReady !== false);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : "Error cargando", false);
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    load();
  }, [load]);

  const setValue = useCallback((key: string, value: string) => {
    setValues((p) => ({ ...p, [key]: value }));
  }, []);

  const toggleShow = useCallback((key: string) => {
    setShow((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const save = useCallback(
    async (key: string) => {
      const v = (values[key] || "").trim();
      if (!v) {
        flash("Pega primero el valor en el campo.", false);
        return;
      }
      setSaving(key);
      try {
        await api("/api/admin/credentials", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: v }),
        });
        // Se limpia: el valor ya quedó cifrado en el servidor.
        setValues((p) => ({ ...p, [key]: "" }));
        setShow((p) => ({ ...p, [key]: false }));
        await load();
        flash("✅ Guardado y cifrado. Ya se usa automáticamente donde toca.", true);
      } catch (e: unknown) {
        flash(e instanceof Error ? e.message : "Error guardando", false);
      } finally {
        setSaving(null);
      }
    },
    [values, load, flash]
  );

  const remove = useCallback(
    async (key: string) => {
      if (!confirm("¿Eliminar esta credencial del vault? (Si hay fallback en servidor, seguirá activo)")) return;
      try {
        const data = await api("/api/admin/credentials", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        await load();
        flash(
          data?.envFallback ? "⚠️ Borrado del vault, pero sigue activo desde servidor." : "🗑️ Credencial eliminada.",
          true
        );
      } catch (e: unknown) {
        flash(e instanceof Error ? e.message : "Error eliminando", false);
      }
    },
    [load, flash]
  );

  const sendTest = useCallback(async () => {
    if (testPhone.replace(/\D/g, "").length < 9) {
      flash("Escribe tu móvil para recibir la prueba.", false);
      return;
    }
    setTesting(true);
    try {
      const data = await api("/api/admin/credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testPhone }),
      });
      if (!data?.success) throw new Error(data?.error || "La prueba falló");
      flash(`✅ Prueba enviada a ${data.to}. Revisa tu WhatsApp.`, true);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : "La prueba falló", false);
    } finally {
      setTesting(false);
    }
  }, [testPhone, flash]);

  return {
    creds,
    keyReady,
    loading,
    values,
    setValue,
    show,
    toggleShow,
    saving,
    testPhone,
    setTestPhone,
    testing,
    toast,
    save,
    remove,
    sendTest,
  };
}
