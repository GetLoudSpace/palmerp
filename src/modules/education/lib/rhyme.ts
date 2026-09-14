// Rimador español offline — consonante y asonante
// Basado en fonética + sufijo desde vocal tónica

const COMMON_WORDS_ES = [
  "amor","dolor","color","canción","corazón","pasión","avión","balcón","nación","razón",
  "vida","herida","salida","partida","medida","querida","suave","grave","ave","clave",
  "fuego","juego","luego","ruego","cielo","suelo","vuelo","anhelo",
  "noche","coche","derroche","reproche","luz","cruz","voz","capaz","veloz","feroz",
  "mar","soñar","cantar","llorar","volar","mirar","hablar","callar",
  "tiempo","viento","siento","cuento","mento","lamento","sueño","dueño","pequeño","leño",
  "casa","pasa","abraza","nada","habla","basa","tasa","plaza",
  "mundo","profundo","segundo","inmundo","sombra","nombra","alfombra","hombre",
  "estrella","bella","ella","huella","centella","querella",
  "camino","destino","vino","fino","trino","divino",
  "silencio","inmenso","pienso","lienzo","intenso",
  "corazón","ilusión","traición","canción","ocasión","presión","misión",
  "libertad","verdad","ciudad","soledad","tempestad","mitad",
  "esperanza","confianza","alianza","enseñanza","mudanza","venganza",
  "olvidar","recordar","encontrar","soñar","caminar","respirar",
];

function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

function stripAccents(w: string): string {
  return w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getVowelSuffix(word: string): string {
  const n = normalizeWord(word);
  // consonante: desde última vocal tónica (aprox: últimas 3-4 letras)
  // simplificado: últimos 3 chars o desde última vocal
  const vowels = "aeiou";
  let lastVowelIdx = -1;
  for (let i = n.length - 1; i >= 0; i--) if (vowels.includes(n[i])) { lastVowelIdx = i; break; }
  if (lastVowelIdx <= 0) return n.slice(-2);
  // incluye una consonante previa si existe para distinguir asonante vs consonante
  const start = Math.max(0, lastVowelIdx - 1);
  return n.slice(start);
}

function getAsonanteKey(word: string): string {
  const n = normalizeWord(word);
  const vowels = n.replace(/[^aeiou]/g, "");
  return vowels.slice(-2); // últimas 2 vocales
}

export type RhymeType = "consonante" | "asonante" | "ambas";

export interface RhymeResult {
  word: string;
  type: "consonante" | "asonante";
  score: number;
}

export function getRhymes(input: string, type: RhymeType = "ambas", limit = 20): RhymeResult[] {
  const clean = normalizeWord(input);
  if (!clean || clean.length < 2) return [];
  const suffix = getVowelSuffix(clean);
  const ason = getAsonanteKey(clean);
  const results: RhymeResult[] = [];

  for (const w of COMMON_WORDS_ES) {
    const wn = normalizeWord(w);
    if (wn === clean) continue;
    const wsuf = getVowelSuffix(wn);
    const wason = getAsonanteKey(wn);
    if (wsuf === suffix) {
      results.push({ word: w, type: "consonante", score: 10 + (w.length === clean.length ? 1 : 0) });
    } else if (wason === ason && type !== "consonante") {
      results.push({ word: w, type: "asonante", score: 5 });
    }
  }
  // sort: consonante first, then asonante, then alpha
  results.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
  const filtered = type === "consonante" ? results.filter(r => r.type === "consonante") : type === "asonante" ? results.filter(r => r.type === "asonante") : results;
  return filtered.slice(0, limit);
}

export function getLastWord(text: string): string {
  const words = text.trim().split(/\s+/);
  const last = words[words.length - 1] ?? "";
  return last.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, "");
}

// LLM fallback prompt helper
export function buildRhymeLLMPrompt(word: string): string {
  return `Dame 20 palabras españolas que rimen (consonante y asonante) con "${word}". Devuelve solo JSON array de strings. Sin explicación.`;
}
