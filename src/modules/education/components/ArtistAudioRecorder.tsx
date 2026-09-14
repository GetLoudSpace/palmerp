"use client";
import React, { useRef, useState } from "react";
import * as Icons from "lucide-react";
import ArtistAudioPlayer from "./ArtistAudioPlayer";

export default function ArtistAudioRecorder({ onSave }: { onSave: (blob: Blob, fileName: string, durationSec: number) => Promise<void> | void }) {
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    setError(null); setBlobUrl(null); setBlob(null); setDuration(0);
    if (!navigator.mediaDevices?.getUserMedia) { setError("Tu dispositivo no soporta grabación. Usa Subir."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } as any });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(b);
        setBlob(b); setBlobUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e: any) {
      if (String(e?.name).includes("NotAllowed")) setError("Permiso denegado — activa el micrófono en Ajustes > Privacidad.");
      else setError(String(e?.message ?? e));
    }
  };
  const stop = () => { mediaRecorderRef.current?.stop(); setRecording(false); };
  const save = async () => {
    if (!blob) return;
    const name = `grabacion_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.webm`;
    await onSave(blob, name, duration);
    setBlob(null); setBlobUrl(null); setDuration(0);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Icons.Mic2 className="h-4 w-4 text-red-500" /> Grabadora</div>
      {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600">{error}</div>}
      <div className="flex items-center gap-2">
        {!recording ? (
          <button onClick={start} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white"><Icons.CircleDot className="h-4 w-4" /> Grabar</button>
        ) : (
          <button onClick={stop} className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background"><Icons.Square className="h-4 w-4" /> Parar · {Math.floor(duration/60)}:{String(duration%60).padStart(2,"0")}</button>
        )}
        {recording && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
      </div>
      {blobUrl && (
        <div className="space-y-2">
          <ArtistAudioPlayer src={blobUrl} fileName={`Grabación ${Math.floor(duration/60)}:${String(duration%60).padStart(2,"0")}`} />
          <button onClick={save} className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white">Guardar como DEMO</button>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">Al pulsar Grabar el navegador pedirá permiso de micrófono. El mismo reproductor sirve para grabaciones y archivos subidos.</p>
    </div>
  );
}
