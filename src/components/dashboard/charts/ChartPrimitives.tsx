"use client";
import React from "react";

export function LineChart({ data, color = "#f59e0b", height = 80 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200;
  const h = height;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * (h - 12) - 6;
    return `${x},${y}`;
  });
  const areaPoints = `0,${h} ${points.join(" ")} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((_, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * w;
        const y = h - ((data[i] - min) / range) * (h - 12) - 6;
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color} stroke="white" strokeWidth={1} />;
      })}
    </svg>
  );
}

export function BarChart({ data, color = "#f59e0b", height = 90 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 200;
  const gap = 4;
  const barW = (w - gap * (data.length + 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = (v / max) * (height - 20);
        const x = gap + i * (barW + gap);
        const y = height - h - 6;
        const rx = 4;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx={rx} fill={color} opacity={0.9} />;
      })}
    </svg>
  );
}

export function AreaChart({ data, color = "#f59e0b", height = 80 }: { data: number[]; color?: string; height?: number }) {
  return <LineChart data={data} color={color} height={height} />;
}

export function DonutChart({ data, colors = ["#f59e0b", "#10b981", "#6366f1", "#06b6d4", "#f43f5e"], size = 90 }: { data: { label: string; value: number }[]; colors?: string[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const radius = 34;
  const stroke = 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const offset = -acc * circumference - circumference * 0.25;
          acc += pct;
          return (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground text-[10px] font-bold">
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-bold text-foreground">{d.value}</span>
            <span className="text-muted-foreground">({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PieChart(props: { data: { label: string; value: number }[]; colors?: string[]; size?: number }) {
  return <DonutChart {...props} />;
}
