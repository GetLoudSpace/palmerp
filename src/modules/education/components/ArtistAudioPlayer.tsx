"use client";
import React, { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";

export default function ArtistAudioPlayer({ src, fileName, onDuration }: { src: string; fileName?: string; onDuration?: (sec: number) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onLoaded = () => { setDuration(a.duration || 0); onDuration?.(a.duration || 0); };
    const onEnded = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onLoaded); a.removeEventListener("ended", onEnded); };
  }, [src, onDuration]);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);

  const toggle = async () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { try { await a.play(); setPlaying(true); } catch {} }
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={toggle} className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
          {playing ? <Icons.Pause className="h-5 w-5" /> : <Icons.Play className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold truncate">{fileName || "Audio"}</div>
          <div className="text-[10px] text-muted-foreground">{Math.floor(current/60)}:{String(Math.floor(current%60)).padStart(2,"0")} / {duration ? `${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,"0")}` : "--:--"}</div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <select value={speed} onChange={(e)=>setSpeed(parseFloat(e.target.value))} className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs">
          <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option>
        </select>
        <a href={src} download={fileName} target="_blank" rel="noreferrer" className="rounded-lg border border-border/40 p-2 hover:bg-muted"><Icons.Download className="h-4 w-4" /></a>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
