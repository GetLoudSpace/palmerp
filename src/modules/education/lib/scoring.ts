import { EDUCATION_INSTRUMENTS } from "./instruments";

export interface ExerciseCandidate {
  id: string;
  title: string;
  instrument: string;
  level: string;
  difficulty: number;
  estimatedMin: number;
  skillKeys: string[];
  description?: string;
  tabContent?: string;
  sourceUrl?: string;
}

export interface ScoringContext {
  instrument: string;
  studentLevel: string;
  skillGaps: string[]; // keys with rating <3
  goalSkillKeys: string[];
  availableMin: number;
  recentExerciseIds: string[];
  musicalTastes?: string[];
}

const LEVEL_ORDER: Record<string, number> = { INICIACION: 0, BASICO: 1, INTERMEDIO: 2, AVANZADO: 3 };

export function scoreExercises(candidates: ExerciseCandidate[], ctx: ScoringContext): (ExerciseCandidate & { _score: number; _reason: string })[] {
  const levelNum = LEVEL_ORDER[ctx.studentLevel] ?? 1;
  return candidates
    .filter((c) => {
      if (c.instrument !== ctx.instrument && c.instrument !== "COMMON") return false;
      const cLevel = LEVEL_ORDER[c.level] ?? 1;
      if (cLevel > levelNum + 1) return false;
      if (c.estimatedMin > ctx.availableMin) return false;
      return true;
    })
    .map((c) => {
      let score = 0;
      let reason = "";
      const gapHits = c.skillKeys.filter((k) => ctx.skillGaps.includes(k)).length;
      if (gapHits > 0) { score += gapHits * 5; reason += `Refuerza ${gapHits} skill floja. `; }
      const goalHits = c.skillKeys.filter((k) => ctx.goalSkillKeys.includes(k)).length;
      if (goalHits > 0) { score += goalHits * 3; reason += `Alineado con objetivo. `; }
      if (ctx.recentExerciseIds.includes(c.id)) { score -= 4; reason += `Repetido reciente. `; }
      // prefer shorter if availableMin small
      if (c.estimatedMin <= 10) score += 1;
      if (!reason) reason = "Variedad / mantenimiento.";
      return { ...c, _score: score, _reason: reason.trim() };
    })
    .sort((a, b) => b._score - a._score);
}

export function pickQuickClass(candidates: ExerciseCandidate[], ctx: ScoringContext, count = 3) {
  return scoreExercises(candidates, ctx).slice(0, count);
}
