// src/modules/education/data/guitar-40.ts
// Guion anual guitarra 40x30' — Principiante / Medio / Avanzado
// Multi-guitarra (española / acústica / eléctrica), cualquier edad.
// Consulta diaria del profesor. Fuente única para Biblioteca + Clases.
// Mapea a Prisma: EduCourseGoal / EduTerm / EduSkill / EduExercise / EduSong / EduLesson.
//
// Base científica aplicada por ficha:
// - Fitts & Posner (cognitivo→asociativo→autónomo): cada técnica sale 3 clases seguidas.
// - Ericsson (práctica deliberada): tarea al borde + feedback + criterio pasa medible.
// - Ebbinghaus (repetición espaciada): reviewFrom con C+1, C+4, C+8.
// - Rohrer (interleaving): técnica en bloque corto + repertorio intercalado.
// - Schmidt (esquema + variabilidad): mismo concepto en 3 voicings/ritmos/guitarras.
// - Gordon (audiation): cantar antes de tocar en toda edad.

export type GuitarScriptLevel = "PRINCIPIANTE" | "MEDIO" | "AVANZADO";
export type EduLevelKey = "INICIACION" | "BASICO" | "INTERMEDIO" | "AVANZADO";
export type GuitarKind = "espanola" | "acustica" | "electrica";

export interface GuitarVariantMap {
  espanola: string;
  acustica: string;
  electrica: string;
}

export interface GuitarLessonScript {
  id: string; // C01..C40
  index: number; // 1..40
  level: GuitarScriptLevel;
  eduLevel: EduLevelKey;
  trimester: 1 | 2 | 3;
  title: string;
  objective: string;
  science: string;
  warmup5: string;
  main20: string[];
  close5: string;
  homePractice: string;
  homeMinPerDay: number;
  passCriteria: string;
  kidAdapt: string;
  adultAdapt: string;
  guitarVariants: GuitarVariantMap;
  reviewFrom: string[];
  skillKeys: string[];
  difficulty: number; // 1-5
  durationMin: number; // 30
  song: string;
}

export interface GuitarSkillDef {
  key: string;
  label: string;
  category: string;
}

export interface GuitarGoalDef {
  key: string;
  scope: "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";
  title: string;
  description: string;
  passCriteria: string;
}

export interface GuitarTermDef {
  scope: "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";
  label: string;
  classRange: string;
  level: GuitarScriptLevel;
}

// 6 skills estables 1-5, compatibles con EduSkillAssessment + LessonsManager.
export const GUITAR_SKILLS: GuitarSkillDef[] = [
  { key: "ritmo", label: "Ritmo y pulso", category: "ritmo" },
  { key: "acordes", label: "Acordes y cejilla", category: "tecnica" },
  { key: "tecnica", label: "Técnica manos", category: "tecnica" },
  { key: "oido", label: "Oído y transcripción", category: "teoria" },
  { key: "lectura", label: "Lectura / Tab", category: "teoria" },
  { key: "repertorio", label: "Repertorio y autonomía", category: "repertorio" },
];

export const GUITAR_GOALS: GuitarGoalDef[] = [
  {
    key: "GUITAR_N1",
    scope: "TRIMESTER_1",
    title: "N1 Principiante — sonar limpio con 8 acordes",
    description: "Postura sana, afinación autónoma, 8 acordes abiertos, rasgueo abajo-arriba y 2 canciones de 3-4 acordes.",
    passCriteria: "8/10 cambios G-Em-C-D sin cuerdas sordas a 60 BPM + 1 canción completa de memoria.",
  },
  {
    key: "GUITAR_N2",
    scope: "TRIMESTER_2",
    title: "N2 Medio — cejilla, pentatónica e improvisación",
    description: "Cejilla F/Bm, power chords, ritmo 16ths, pentatónica menor y 12 compases improvisados sobre backing.",
    passCriteria: "F y Bm 5/6 cuerdas limpias + escala a 80 BPM + impro 12 compases sin perder pulso.",
  },
  {
    key: "GUITAR_N3",
    scope: "TRIMESTER_3",
    title: "N3 Avanzado — CAGED, pieza completa y demo",
    description: "Triadas CAGED, modos básicos, pieza fingerstyle o alternate picking, composición 8 compases y demo grabada.",
    passCriteria: "Pieza completa en público de clase + demo 60-90s en portal Artista + auto-evaluación 1-5.",
  },
];

export const GUITAR_TERMS: GuitarTermDef[] = [
  { scope: "TRIMESTER_1", label: "Trimestre 1 · Principiante", classRange: "C01–C14", level: "PRINCIPIANTE" },
  { scope: "TRIMESTER_2", label: "Trimestre 2 · Medio", classRange: "C15–C28", level: "MEDIO" },
  { scope: "TRIMESTER_3", label: "Trimestre 3 · Avanzado", classRange: "C29–C40", level: "AVANZADO" },
];

function l(
  index: number,
  level: GuitarScriptLevel,
  eduLevel: EduLevelKey,
  trimester: 1 | 2 | 3,
  title: string,
  partial: Omit<GuitarLessonScript, "id" | "index" | "level" | "eduLevel" | "trimester" | "title" | "durationMin">,
): GuitarLessonScript {
  const id = `C${String(index).padStart(2, "0")}`;
  return { id, index, level, eduLevel, trimester, title, durationMin: 30, ...partial };
}

export const GUITAR_40: GuitarLessonScript[] = [
  // ============ TRIMESTRE 1 · PRINCIPIANTE (C01–C14) ============
  l(1, "PRINCIPIANTE", "INICIACION", 1, "La guitarra no muerde: postura, partes y afinación", {
    objective: "Salir tocando la primera nota limpia con postura sana y guitarra afinada.",
    science: "Fitts cognitivo: mapa mental antes que velocidad. Variabilidad Schmidt desde día 1 (3 guitarras).",
    warmup5: "Presentación 2': tamaño guitarra (1/2, 3/4, 4/4), correa, silla sin brazos. Cantar Mi al aire y afinar con afinador.",
    main20: [
      "0-7': Partes (clavijero, trastes, boca/pastilla) + cómo sujetar sin tensar hombro.",
      "7-14': Mano derecha: pulgar cuerda 6 + índice cuerda 3, 4 pulsaciones por cuerda 6-1.",
      "14-20': Mano izquierda: dedo 1 traste 1 cuerda 1, sonar 4 veces sin sordo. Juego: profesor toca, alumno imita.",
    ],
    close5: "Tocar Mi-Si-Mi de memoria + foto postura para casa.",
    homePractice: "5 días x 10': afinar con app + 4 pulsaciones por cuerda + traste 1 limpio. Marcar X en calendario.",
    homeMinPerDay: 10,
    passCriteria: "Nombra 5 partes + afina solo + 6 cuerdas al aire sin sordo 4/4 veces.",
    kidAdapt: "Guitarra pequeña, traste con pegatina color, juego eco. Casa 2x8' mejor que 1x15'.",
    adultAdapt: "Altura silla + reposapié o cojín. Estiramiento muñeca 30s. Uña corta mano izquierda.",
    guitarVariants: {
      espanola: "Uña corta, pulgar apoyado en 6ª, nailon perdona presión.",
      acustica: "Púa fina 0.46, sujetar suave, cuerdas más duras: pulsar cerca del traste.",
      electrica: "Volumen bajo + canal limpio, correa siempre aunque sentado.",
    },
    reviewFrom: [],
    skillKeys: ["tecnica", "lectura"],
    difficulty: 1,
    song: "Mi-Si-Mi (ejercicio, sin canción aún)",
  }),
  l(2, "PRINCIPIANTE", "INICIACION", 1, "Mi primer ritmo: abajo + apagado", {
    objective: "Rasgueo abajo a pulso 60 BPM con apagado rítmico.",
    science: "Ericsson: un solo gesto al borde + metrónomo como feedback. Audiation: contar en voz alta.",
    warmup5: "Afinar solo 2' + repaso C01: 6 cuerdas al aire. Contar 1-2-3-4 con palmas.",
    main20: [
      "0-8': Rasgueo abajo cuerda 6-1 con pulgar/púa, 4/4 a 60 BPM. Contar en voz alta.",
      "8-15': Apagado: palma derecha frena cuerdas en tiempo 4. Patrón | abajo abajo abajo stop |.",
      "15-20': Imitación: profe improvisa 2 compases, alumno responde.",
    ],
    close5: "Grabar 20s con móvil + tarea: traer ritmo favorito para copiar.",
    homePractice: "5x10': 60 BPM abajo x4 + stop. Día 5 subir a 70 si sale 8/10 limpio.",
    homeMinPerDay: 10,
    passCriteria: "4 compases a 60 BPM sin pararse + stop en tiempo 4 (3/4 intentos).",
    kidAdapt: "Púa grande triangular, dibujar flechas abajo en folio. Contar con animalitos (1-gato-2-gato).",
    adultAdapt: "Metrónomo app con vibración. Muñeca suelta, codo quieto; si duele antebrazo, parar 1'.",
    guitarVariants: {
      espanola: "Pulgar para abajo, índice para apoyo. Sonido redondo sobre boca.",
      acustica: "Púa 0.46-0.60, ataque entre boca y puente.",
      electrica: "Púa 0.60, pastilla mástil, palm leve para controlar ruido.",
    },
    reviewFrom: ["C01"],
    skillKeys: ["ritmo", "tecnica"],
    difficulty: 1,
    song: "Ritmo base para futura canción C10",
  }),
  l(3, "PRINCIPIANTE", "INICIACION", 1, "Em y Am: dos dedos que abren 100 canciones", {
    objective: "Em y Am limpios + cambio en 4 tiempos.",
    science: "Chunking motor: 2 formas vecinas (dedos 1-2) minimizan carga. Bloque corto + canción intercalada.",
    warmup5: "Ritmo C02 a 65 BPM + afinar. Cantar Em-Am antes de tocar (audiation).",
    main20: [
      "0-7': Em (dedos 2-3): colocar, pulsar cuerda por cuerda, detectar sordo y corregir dedo arqueado.",
      "7-14': Am (dedos 1-2-3): mismo control cuerda por cuerda.",
      "14-20': Cambio Em→Am en 4 abajo a 55 BPM. Truco dedo pivote.",
    ],
    close5: "Tocar | Em | Am | Em | Am | + elegir canción favorita con esos acordes.",
    homePractice: "5x12': 2' cada acorde lento + 8' cambios a 55-60. Foto dedos día 3.",
    homeMinPerDay: 12,
    passCriteria: "Em y Am 6/6 cuerdas limpias + 4 cambios sin pausa a 55 BPM.",
    kidAdapt: "Cejilla parcial permitida si mano pequeña; usar capo traste 2 para bajar tensión.",
    adultAdapt: "Si dedos no abren, ejercicio araña 1' previo. Presión mínima: soltar hasta que suene sordo y reapretar 10%.",
    guitarVariants: {
      espanola: "Dedos más verticales por mástil ancho.",
      acustica: "Presión extra cerca del traste, no en medio.",
      electrica: "Volumen medio, chequear que no suenen armónicos por roce.",
    },
    reviewFrom: ["C01", "C02"],
    skillKeys: ["acordes", "ritmo"],
    difficulty: 1,
    song: "Ho Hey (Em-Am base simplificada)",
  }),
  l(4, "PRINCIPIANTE", "INICIACION", 1, "C y G fácil: el cambio que decide todo", {
    objective: "C + G (4 dedos simplificado) y rueda Em-Am-C-G.",
    science: "Interleaving: mezclar 4 acordes evita ilusión de dominio en bloque. Feedback cuerda por cuerda.",
    warmup5: "Em-Am a 60 BPM + estiramiento araña 1-2-3-4 trastes 1-4.",
    main20: [
      "0-8': C: dedos 1-2-3, hueco para cuerda 1 al aire. Test cuerda por cuerda.",
      "8-15': G fácil (dedos 1-2-3 en 6-5-1 o G de 3 dedos). Elegir forma según mano.",
      "15-20': Rueda | Em | Am | C | G | abajo x4 a 50 BPM.",
    ],
    close5: "Elegir orden favorita de la rueda + cantarla.",
    homePractice: "5x12': rueda 50→60 BPM. Día 5 grabar 30s.",
    homeMinPerDay: 12,
    passCriteria: "Rueda 1 vuelta sin pausa a 50 BPM con máx 1 cuerda sorda.",
    kidAdapt: "G de 2 dedos (6ª traste 3 + 1ª traste 3) válido todo N1.",
    adultAdapt: "Dolor yema normal 2 semanas; no practicar con herida. Guitarra bien ajustada (acción baja).",
    guitarVariants: {
      espanola: "C con pulgar detrás mástil, no por encima.",
      acustica: "G completo si mano llega; si no, G fácil oficial N1.",
      electrica: "G con 3 dedos + mute 5ª con dedo 1 si roza.",
    },
    reviewFrom: ["C02", "C03"],
    skillKeys: ["acordes", "repertorio"],
    difficulty: 2,
    song: "Horse With No Name (2 acordes, puente a C10)",
  }),
  l(5, "PRINCIPIANTE", "BASICO", 1, "Cambios a 60: el metrónomo es tu amigo", {
    objective: "Cambiar entre 4 acordes a 60 BPM sin cortar pulso.",
    science: "Práctica deliberada: anticipación (mover dedos en tiempo 4) + 10 repeticiones correctas seguidas.",
    warmup5: "Rueda C04 a 55 + cantar cambios antes ('voy a C...').",
    main20: [
      "0-7': Técnica cambio anticipado: en tiempo 4 levantar y volar, caer en 1.",
      "7-15': Bucle 2 acordes rotando parejas (Em-C, Am-G) a 60, luego rueda completa.",
      "15-20': Juego fallo: profe grita cambio aleatorio, alumno cae en 1 compás.",
    ],
    close5: "Test 60 BPM grabado + pacto práctica.",
    homePractice: "5x12': app cambio acordes 60 BPM. Contar racha: objetivo racha 10.",
    homeMinPerDay: 12,
    passCriteria: "Rueda completa a 60 BPM, máx 1 pausa, 2/3 intentos.",
    kidAdapt: "Metrónomo visual (luz) + puntos por racha. Premio racha 10.",
    adultAdapt: "Practicar cambios sin mirar 50% tiempo para automatizar (Fase asociativa).",
    guitarVariants: {
      espanola: "Uñas mano derecha no interfieren; mano izquierda uña cero.",
      acustica: "Púa no se gira al cambiar: marcar agarre.",
      electrica: "Selector fijo mástil para no distraerse.",
    },
    reviewFrom: ["C03", "C04"],
    skillKeys: ["acordes", "ritmo", "tecnica"],
    difficulty: 2,
    song: "Riptide (base, se toca entera en C10)",
  }),
  l(6, "PRINCIPIANTE", "BASICO", 1, "D y A: cuerdas agudas sin miedo", {
    objective: "D + A limpios y rueda de 6 acordes.",
    science: "Esquema Schmidt: misma mano, nueva zona (agudos). Detección sordo por simpatía.",
    warmup5: "Rueda 4 acordes 60 + araña 1'.",
    main20: [
      "0-8': D: dedos 1-2-3 triángulo, no tocar 5ª-6ª. Apagado con pulgar.",
      "8-14': A: dedos juntos 1-2-3 o 2 dedos (barreta parcial válida N1).",
      "14-20': Rueda 6: Em-Am-C-G-D-A a 55, abajo x2 por acorde.",
    ],
    close5: "Elegir 3 favoritos para su primera canción.",
    homePractice: "5x12': D-A 5' + rueda 6 a 55-60.",
    homeMinPerDay: 12,
    passCriteria: "D y A 5/6 notas limpias + rueda 6 a 55 sin pararse.",
    kidAdapt: "A con 1 dedo pisando 3 cuerdas (mini-cejilla) válido.",
    adultAdapt: "D con dedos apiñados: probar digitación 1-3-2 alternativa si yemas grandes.",
    guitarVariants: {
      espanola: "D con pulgar mute 6-5ª natural por mástil ancho.",
      acustica: "A con púa abajo suave, evitar 6ª.",
      electrica: "D con overdrive off; si mete ruido, palm mute 6ª.",
    },
    reviewFrom: ["C04", "C05"],
    skillKeys: ["acordes", "tecnica"],
    difficulty: 2,
    song: "Three Little Birds (A-D base)",
  }),
  l(7, "PRINCIPIANTE", "BASICO", 1, "G-Em-C-D: tu primera progresión pop", {
    objective: "Progresión I-vi-IV-V completa a 65 BPM.",
    science: "Teoría funcional mínima + oído: reconocer que suena a 'canción'. Memoria procedimental.",
    warmup5: "Rueda 6 a 60 + cantar números 1-6-4-5.",
    main20: [
      "0-6': Explicar 1-6-4-5 con ejemplo (Stand By Me).",
      "6-16': Bucle G-Em-C-D abajo x4 a 60→65. Anticipar cambios.",
      "16-20': Cantar encima tónica (solo voz) mientras otro toca o backing.",
    ],
    close5: "Grabar bucle + ponerle letra inventada 2 versos.",
    homePractice: "5x12': bucle 65 BPM + cantar encima 2'.",
    homeMinPerDay: 12,
    passCriteria: "2 vueltas G-Em-C-D a 65 sin pausa + cantar tónica encima.",
    kidAdapt: "Capo 2 si voz grave; dibujar colores por acorde.",
    adultAdapt: "Transporte mental: si G muy grave para cantar, capo 2 y tocar G forma.",
    guitarVariants: {
      espanola: "Arpegio pulgar en bajos para oír raíces.",
      acustica: "Rasgueo completo, bajo del acorde en tiempo 1.",
      electrica: "Power de 2 notas si G cuesta, válido como paso.",
    },
    reviewFrom: ["C05", "C06"],
    skillKeys: ["acordes", "oido", "repertorio"],
    difficulty: 2,
    song: "Stand By Me (G-Em-C-D)",
  }),
  l(8, "PRINCIPIANTE", "BASICO", 1, "Arriba también existe: rasgueo completo", {
    objective: "Patrón abajo-abajo-arriba-arriba-abajo a 70 BPM.",
    science: "Disociación motriz: muñeca péndulo continuo, el ritmo vive en la mano no en el acorde.",
    warmup5: "Bucle C07 a 65 + péndulo muñeca sin guitarra 30s.",
    main20: [
      "0-8': Mano fantasma: arriba-abajo continuo sin tocar, luego rozar.",
      "8-15': Patrón D-D-U-U-D en Em, luego Am, luego rueda.",
      "15-20': Acentos tiempo 1 y 3 + dinámica suave/fuerte.",
    ],
    close5: "Tocar bucle con patrón nuevo + elegir intensidad.",
    homePractice: "5x12': patrón en 1 acorde 5' + rueda 7'.",
    homeMinPerDay: 12,
    passCriteria: "Patrón 4 compases seguidos a 70 sin trabarse (2/3).",
    kidAdapt: "Púa atada con cuerda a muñeca si se cae. Movimientos grandes primero.",
    adultAdapt: "Si antebrazo se carga, púa más fina + muñeca no codo.",
    guitarVariants: {
      espanola: "Índice uña para arriba, pulgar para abajo (sin púa).",
      acustica: "Púa 0.60, ángulo 45° para no enganchar.",
      electrica: "Upstrokes suaves, pastilla intermedia.",
    },
    reviewFrom: ["C02", "C07"],
    skillKeys: ["ritmo", "tecnica"],
    difficulty: 2,
    song: "Love Me Do (patrón D-D-U-U-D)",
  }),
  l(9, "PRINCIPIANTE", "BASICO", 1, "E, A y E7: sonido blues en 10 minutos", {
    objective: "E + A + E7 y shuffle básico.",
    science: "Variabilidad + motivación: 12-bar blues como contexto musical real inmediato.",
    warmup5: "Patrón C08 en Em-Am + afinar.",
    main20: [
      "0-7': E mayor + E7 (levantar dedo 3). Sonido blues instantáneo.",
      "7-14': A repaso + cambio E-A-E7 a 60.",
      "14-20': Blues 12 compases simplificado | E | E | A | E | con shuffle abajo-arriba.",
    ],
    close5: "Jam blues profe-bajo o backing + alumno E-A.",
    homePractice: "5x12': blues 12 compases a 65 + cambio E7.",
    homeMinPerDay: 12,
    passCriteria: "Blues 12 compases sin perderse + E7 limpio.",
    kidAdapt: "Contar compases con dedos, cartel E/A grande.",
    adultAdapt: "Escuchar original + tocar encima (play-along 5').",
    guitarVariants: {
      espanola: "E7 con dedos redondos, shuffle con pulgar-índice.",
      acustica: "Shuffle marcado, bajo-tiempo 1 con púa.",
      electrica: "E7 + overdrive leve para motivar, palm en 6ª.",
    },
    reviewFrom: ["C06", "C08"],
    skillKeys: ["acordes", "ritmo", "oido"],
    difficulty: 2,
    song: "Hoochie Coochie Man (E-A simplificado)",
  }),
  l(10, "PRINCIPIANTE", "BASICO", 1, "Mi primera canción entera", {
    objective: "Tocar 1 canción de 3 acordes de principio a fin.",
    science: "Recuperación + performance: tocar sin parar consolida. Efecto repertorio = motivación.",
    warmup5: "Blues C09 + respiración 4-4 antes de tocar (control ansiedad).",
    main20: [
      "0-5': Elegir entre 2: Three Little Birds (A-D-E) o Horse With No Name (Em-D6).",
      "5-15': Montar por partes: intro, verso, estribillo. Bucle difícil x5.",
      "15-20': Pase completo sin parar a 65-70 + grabar.",
    ],
    close5: "Escuchar grabación + marcar 1 mejora para casa. Aplauso ritual.",
    homePractice: "5x15': 10' canción + 5' rueda. Tocar para 1 persona día 5.",
    homeMinPerDay: 15,
    passCriteria: "Canción entera sin parar (tempo libre ±, máx 2 fallos que no paran).",
    kidAdapt: "Letra grande + dibujos. Tocar para peluche primero.",
    adultAdapt: "Grabar vídeo para auto-evaluar, no para publicar aún.",
    guitarVariants: {
      espanola: "Arpegio simple si rasgueo cansa.",
      acustica: "Capo según voz.",
      electrica: "Clean + reverb ligera para premio sonoro.",
    },
    reviewFrom: ["C07", "C09"],
    skillKeys: ["repertorio", "acordes", "ritmo"],
    difficulty: 2,
    song: "Three Little Birds / Horse With No Name (a elegir)",
  }),
  l(11, "PRINCIPIANTE", "BASICO", 1, "PIMA: el arpegio que suena a clásico", {
    objective: "Patrón p-i-m-a sobre C-G-Am-Fmaj7 a 60.",
    science: "Independencia dedos: inicio fingerstyle, base técnica clásica y pop.",
    warmup5: "Canción C10 una vez + estirar dedos.",
    main20: [
      "0-7': Asignar p-6/5/4, i-3, m-2, a-1. Ejercicio cuerda al aire.",
      "7-15': Patrón p-i-m-a en C, luego G, Am.",
      "15-20': Rueda arpegiada C-G-Am-Fmaj7 a 55-60.",
    ],
    close5: "Arpegiar su canción C10 + decidir si prefiere púa o dedos.",
    homePractice: "5x12': 5' patrón al aire + 7' rueda.",
    homeMinPerDay: 12,
    passCriteria: "Patrón 4 compases sin cruzar dedos + rueda 1 vuelta.",
    kidAdapt: "Uñas cortas, empezar p-i-m solo (sin a).",
    adultAdapt: "Apoyar antebrazo, no muñeca, en boca.",
    guitarVariants: {
      espanola: "Posición clásica pie izquierdo elevado, sonido referencia.",
      acustica: "Arpegio con púa + dedos (hybrid leve) opcional.",
      electrica: "Dedos sin púa, pastilla mástil, tono al 7.",
    },
    reviewFrom: ["C04", "C10"],
    skillKeys: ["tecnica", "acordes"],
    difficulty: 3,
    song: "Hallelujah (arpegio simplificado)",
  }),
  l(12, "PRINCIPIANTE", "BASICO", 1, "Cejilla sin dolor: Fmaj7 y Bm7 fáciles", {
    objective: "Fmaj7 + Bm7 (mini-cejillas) limpios.",
    science: "Progresión de carga: cejilla parcial antes que total evita lesión y frustración.",
    warmup5: "PIMA C11 + araña + rotación hombro.",
    main20: [
      "0-8': Fmaj7 (dedo 1 dos cuerdas + 2-3): test cuerda por cuerda.",
      "8-15': Bm7 (dedo 1 dos cuerdas): cambio Fmaj7-Bm7.",
      "15-20': Bucle Am-Fmaj7-C-G con nuevas formas.",
    ],
    close5: "Elegir si usa cejilla fácil o acorde abierto según mano.",
    homePractice: "5x10': 2' presión-relajación + 8' cambios. Nunca con dolor agudo.",
    homeMinPerDay: 10,
    passCriteria: "Fmaj7 y Bm7 4/6 cuerdas limpias + cambio sin pausa a 55.",
    kidAdapt: "Capo como 'cejilla amiga'. Guitarra bien ajustada imprescindible.",
    adultAdapt: "Dedo 1 recto, fuerza desde brazo no solo dedo. Pausas 30s.",
    guitarVariants: {
      espanola: "Mástil ancho ayuda a no tapar de más.",
      acustica: "Calibre ligero 11-52 si cuesta.",
      electrica: "Acción baja: la cejilla más fácil vive aquí.",
    },
    reviewFrom: ["C03", "C11"],
    skillKeys: ["acordes", "tecnica"],
    difficulty: 3,
    song: "Let It Be (con Fmaj7 válido)",
  }),
  l(13, "PRINCIPIANTE", "BASICO", 1, "Contratiempo y mute: suenas a banda", {
    objective: "Acento en 2 y 4 + apagado rítmico en canción.",
    science: "Groove: oír backbeat internaliza pulso bailable. Interleaving ritmo + canción.",
    warmup5: "Bucle C12 + palmas en 2 y 4.",
    main20: [
      "0-8': Rasgueo con mute en 2 y 4 sobre Em.",
      "8-15': Aplicar a canción C10: verso mute, estribillo abierto.",
      "15-20': Dinámica: verso piano, estribillo forte.",
    ],
    close5: "Tocar canción con dinámica + grabar.",
    homePractice: "5x12': canción con mute + dinámica.",
    homeMinPerDay: 12,
    passCriteria: "Canción con 2 intensidades + mute en su sitio 3/4 veces.",
    kidAdapt: "Mute como 'aplauso en guitarra'.",
    adultAdapt: "Escuchar original y copiar dinámica con notas.",
    guitarVariants: {
      espanola: "Mute con palma + pulgar.",
      acustica: "Mute + púa: chasquido controlado.",
      electrica: "Palm mute en puente para verso, abierto estribillo.",
    },
    reviewFrom: ["C08", "C10"],
    skillKeys: ["ritmo", "repertorio"],
    difficulty: 3,
    song: "Su canción C10 con arreglo",
  }),
  l(14, "PRINCIPIANTE", "BASICO", 1, "Checkpoint N1: grabo y celebro", {
    objective: "Demostrar N1 y fijar plan N2.",
    science: "Test + feedback + celebración = memoria + motivación. Evaluación formativa, no examen.",
    warmup5: "Afinar + respiración + canción favorita una vez.",
    main20: [
      "0-10': Test: rueda G-Em-C-D 65 + Fmaj7/Bm7 + patrón D-D-U-U-D.",
      "10-17': Pase canción entera grabada (móvil).",
      "17-20': Auto-nota 1-5 por skill + profe nota + pacto N2.",
    ],
    close5: "Escuchar toma + elegir canción N2 + foto progreso.",
    homePractice: "Semana puente: tocar 3x su canción + descansar 2 días (consolidación sueño).",
    homeMinPerDay: 10,
    passCriteria: "Pasa a N2 si: rueda 65 + canción entera + Fmaj7/Bm7 aceptables. Si no, refuerzo 2 semanas.",
    kidAdapt: "Diploma N1 + pegatina. Invitar familia a escuchar.",
    adultAdapt: "Comparar grabación C01 vs C14 (progreso audible). Fijar 15' diarios N2.",
    guitarVariants: {
      espanola: "Demo con arpegio si prefiere clásico.",
      acustica: "Demo con capo si canta.",
      electrica: "Demo clean + 10s con drive como premio.",
    },
    reviewFrom: ["C07", "C10", "C12"],
    skillKeys: ["ritmo", "acordes", "tecnica", "repertorio"],
    difficulty: 2,
    song: "Su canción + rueda examen",
  }),

  // ============ TRIMESTRE 2 · MEDIO (C15–C28) ============
  l(15, "MEDIO", "INTERMEDIO", 2, "F completa: la cejilla que abre el mástil", {
    objective: "F mayor 6 cuerdas limpio + cambio desde C y Am.",
    science: "Sobrecarga progresiva + fuerza isométrica breve. 2' presión, no 20' dolor.",
    warmup5: "Fmaj7-Bm7 C12 + estiramiento + afinar.",
    main20: [
      "0-8': F: dedo 1 recto traste 1, 2-3-4 forma E. Test 6 cuerdas.",
      "8-15': Cambios C→F→Am a 55, anticipando cejilla.",
      "15-20': Bucle Am-F-C-G (el famoso) lento.",
    ],
    close5: "Compromiso: F 2' al día, nunca con dolor irradiado.",
    homePractice: "5x12': F 5' + bucle 7' 55→60.",
    homeMinPerDay: 12,
    passCriteria: "F 6/6 limpias 3/5 intentos + bucle 1 vuelta a 55.",
    kidAdapt: "Si mano no llega, Fmaj7 oficial 3 semanas más + reintento C18.",
    adultAdapt: "Ajuste guitarra crítico aquí; cejilla alta = frustración técnica no musical.",
    guitarVariants: {
      espanola: "Acción alta: capo 1 para practicar F forma en Fa# más fácil.",
      acustica: "Calibre 11, presionar con peso brazo.",
      electrica: "La más fácil: usarla para ganar fuerza y transferir.",
    },
    reviewFrom: ["C12", "C14"],
    skillKeys: ["acordes", "tecnica"],
    difficulty: 4,
    song: "Let It Be (F real)",
  }),
  l(16, "MEDIO", "INTERMEDIO", 2, "Bm y el pasillo Am-Bm-C", {
    objective: "Bm 5 cuerdas + pasillo Am-Bm-C-D.",
    science: "Transferencia: misma cejilla, nueva raíz. Contexto musical (pasillo) > ejercicio aislado.",
    warmup5: "F C15 + rueda Am-F-C-G.",
    main20: [
      "0-8': Bm forma Am con cejilla 2. Test 5 cuerdas.",
      "8-15': Pasillo Am-Bm-C-D a 60.",
      "15-20': Aplicar a canción con Bm (ej. Hotel California intro simplificada).",
    ],
    close5: "Grabar pasillo + elegir canción con Bm.",
    homePractice: "5x12': Bm 5' + pasillo 7'.",
    homeMinPerDay: 12,
    passCriteria: "Bm 5/5 + pasillo sin pausa a 60.",
    kidAdapt: "Bm7 válido si Bm duele; reintento C19.",
    adultAdapt: "Rotar F/Bm días alternos para no sobrecargar.",
    guitarVariants: {
      espanola: "Bm con dedos arqueados por mástil plano.",
      acustica: "Bm con bajo 5ª claro.",
      electrica: "Bm + drive leve para oír sordos.",
    },
    reviewFrom: ["C12", "C15"],
    skillKeys: ["acordes", "repertorio"],
    difficulty: 4,
    song: "Hotel California (intro simplificada)",
  }),
  l(17, "MEDIO", "INTERMEDIO", 2, "Power chords + palm mute rock", {
    objective: "E5-A5-D5 con mute y cambio rápido.",
    science: "Motivación + economía: 2 dedos, sonido banda inmediato. Base eléctrica transferible.",
    warmup5: "Pasillo C16 + cromático 1-2-3-4 trastes 5-8.",
    main20: [
      "0-8': E5 (0-2-2), A5, D5. Mute cuerdas no usadas con índice.",
      "8-15': Riff E5-E5-A5-E5 a 80 con palm mute.",
      "15-20': Riff canción (Smoke / Seven Nation simplificado).",
    ],
    close5: "Tocar riff con backing batería.",
    homePractice: "5x12': riff 80→90 + cambios power.",
    homeMinPerDay: 12,
    passCriteria: "Riff 8 compases a 80 sin ruido parásito.",
    kidAdapt: "Un dedo power (solo tónica+quinta con 1-3) válido.",
    adultAdapt: "Correa + muñeca recta; si hormiguea, revisar postura.",
    guitarVariants: {
      espanola: "Power con dedos, sonido flamenco-rock curioso pero válido.",
      acustica: "Power + púa gruesa 0.73.",
      electrica: "Palm en puente + drive moderado, puerta ruido si hay.",
    },
    reviewFrom: ["C09", "C15"],
    skillKeys: ["acordes", "ritmo", "tecnica"],
    difficulty: 3,
    song: "Smoke on the Water / Seven Nation Army",
  }),
  l(18, "MEDIO", "INTERMEDIO", 2, "16ths: el ritmo que te hace sonar pro", {
    objective: "Patrón 16ths D-D-U-U-D-U a 70.",
    science: "Subdivisión: contar '1-e-y-a' automatiza. Metrónomo + palm como andamio.",
    warmup5: "Riff C17 + contar 16ths con palmas.",
    main20: [
      "0-8': Mano fantasma 16ths continua en Em sin sonar.",
      "8-15': Patrón en Em-Am a 65→70.",
      "15-20': Aplicar a canción funk-pop con mute.",
    ],
    close5: "Grabar 30s + comparar con C08.",
    homePractice: "5x12': 16ths 1 acorde + canción.",
    homeMinPerDay: 12,
    passCriteria: "Patrón 4 compases a 70 continuo.",
    kidAdapt: "Primero 8ths rápido, luego 16ths lento.",
    adultAdapt: "Grabarse lento y subir 5 BPM por día (regla 5%).",
    guitarVariants: {
      espanola: "16ths con dedos índice-medio alternando.",
      acustica: "Púa fina para no atascar.",
      electrica: "16ths + compresor leve si hay.",
    },
    reviewFrom: ["C08", "C13"],
    skillKeys: ["ritmo", "tecnica"],
    difficulty: 4,
    song: "Get Lucky (16ths simplificado)",
  }),
  l(19, "MEDIO", "INTERMEDIO", 2, "Pentatónica menor: tu primera escala útil", {
    objective: "Forma 1 Am pentatónica asc/desc a 70.",
    science: "Memoria + oído: cantar cada nota antes (audiation) duplica retención.",
    warmup5: "16ths C18 2' + afinar + cantar A-C-D-E-G.",
    main20: [
      "0-8': Forma 1 traste 5: 5-8, 5-7, 5-7, 5-7, 5-8, 5-8. Dedos 1-4.",
      "8-15': Subir/bajar a 60→70 con metrónomo, alternate picking o dedos.",
      "15-20': Juego pregunta-respuesta: profe 4 notas, alumno responde.",
    ],
    close5: "Impro libre 1 min sobre Am drone.",
    homePractice: "5x12': escala 7' + pregunta-respuesta con backing 5'.",
    homeMinPerDay: 12,
    passCriteria: "Escala ida/vuelta sin errores a 70 (2/3).",
    kidAdapt: "Puntos por cada subida limpia, pegatina escala.",
    adultAdapt: "Memorizar notas, no solo dedos (A-C-D-E-G-A).",
    guitarVariants: {
      espanola: "Dedos, sonido dulce, vibrato clásico.",
      acustica: "Púa abajo-arriba estricto.",
      electrica: "Alternate + bend test en 7 traste 3ª.",
    },
    reviewFrom: ["C09", "C17"],
    skillKeys: ["tecnica", "oido", "lectura"],
    difficulty: 3,
    song: "Backing Am 70 BPM (jam)",
  }),
  l(20, "MEDIO", "INTERMEDIO", 2, "Improvisar sin miedo sobre backing", {
    objective: "Frases 4 notas con silencios sobre backing Am.",
    science: "Creatividad con restricción: pocas notas + ritmo > muchas notas rápidas.",
    warmup5: "Pentatónica C19 a 75 + respirar.",
    main20: [
      "0-7': Regla 4 notas + silencio: tocar-callar.",
      "7-15': Backing Am 75: 4 vueltas, cada vez 1 idea nueva.",
      "15-20': Grabar + elegir mejor frase y repetirla (motivo).",
    ],
    close5: "Tocar motivo + ponerle nombre.",
    homePractice: "5x12': backing 75, grabar 1 toma al día.",
    homeMinPerDay: 12,
    passCriteria: "12 compases sin perder forma + 1 motivo repetido.",
    kidAdapt: "Juego historia: cada frase es un animal.",
    adultAdapt: "Transcribir su mejor frase a tab (puente lectura).",
    guitarVariants: {
      espanola: "Fraseo legato, poco bend.",
      acustica: "Fraseo rítmico con silencios.",
      electrica: "Bend medio tono + vibrato al final frase.",
    },
    reviewFrom: ["C19", "C10"],
    skillKeys: ["oido", "repertorio", "tecnica"],
    difficulty: 3,
    song: "Backing Am-Dm (blues menor)",
  }),
  l(21, "MEDIO", "INTERMEDIO", 2, "Fingerstyle base: bajo + melodía", {
    objective: "Patrón Travis simplificado p-bajo + i-m.",
    science: "Coordinación bimanual: bajo estable + melodía libera. Inicio autonomía fingerstyle.",
    warmup5: "PIMA C11 + pentatónica descendente.",
    main20: [
      "0-8': Pulgar alterna 5-4-6-4 en C, luego i-m en 2-1.",
      "8-15': Juntar: bajo + 2 notas agudas por compás.",
      "15-20': Aplicar a Hallelujah 4 compases.",
    ],
    close5: "Elegir canción fingerstyle N2.",
    homePractice: "5x12': Travis lento 60 + canción.",
    homeMinPerDay: 12,
    passCriteria: "8 compases bajo estable + melodía sin pararse a 60.",
    kidAdapt: "Pulgar solo + 1 dedo agudo válido.",
    adultAdapt: "Uña índice-media 2mm si fingerstyle gusta.",
    guitarVariants: {
      espanola: "Referencia: aquí brilla.",
      acustica: "Travis con púa en bajo + dedos (hybrid intro).",
      electrica: "Travis limpio pastilla mástil.",
    },
    reviewFrom: ["C11", "C20"],
    skillKeys: ["tecnica", "repertorio"],
    difficulty: 4,
    song: "Hallelujah (fingerstyle 4 compases)",
  }),
  l(22, "MEDIO", "INTERMEDIO", 2, "I-V-vi-IV de oído: saca canciones solo", {
    objective: "Reconocer I-V-vi-IV en 2 canciones y transportar.",
    science: "Oído relativo funcional: bajo + color mayor/menor. Transferencia real.",
    warmup5: "Bucle G-Em-C-D cantando bajo (G-E-C-D).",
    main20: [
      "0-8': Escuchar estribillo conocido, cazar bajo con 1 cuerda.",
      "8-15': Poner acorde mayor/menor encima + comprobar.",
      "15-20': Transportar su canción a otra tonalidad con capo.",
    ],
    close5: "Sacar 4 compases de canción nueva sin tab.",
    homePractice: "5x12': 1 canción de oído por semana (bajo + acordes).",
    homeMinPerDay: 12,
    passCriteria: "Bajo correcto 4 compases + acordes mayor/menor correctos.",
    kidAdapt: "Caza del bajo como videojuego (frío/caliente).",
    adultAdapt: "App slow-downer 75% para cazar.",
    guitarVariants: {
      espanola: "Cazar con cejilla móvil oído + forma.",
      acustica: "Capo para comprobar transporte.",
      electrica: "Power para comprobar bajo rápido.",
    },
    reviewFrom: ["C07", "C20"],
    skillKeys: ["oido", "lectura"],
    difficulty: 4,
    song: "Canción elegida por alumno (de oído)",
  }),
  l(23, "MEDIO", "INTERMEDIO", 2, "Capo y transporte: toca en cualquier tono", {
    objective: "Transportar con capo + cejilla móvil.",
    science: "Esquema: misma forma, nueva función. Autonomía para cantar.",
    warmup5: "Canción favorita + probar capo 2.",
    main20: [
      "0-8': Tabla transporte: G→A (capo 2), C→D.",
      "8-15': Tocar su canción en 2 tonos con capo.",
      "15-20': Cejilla móvil E-shape trastes 1-5 (F-F#-G-G#-A).",
    ],
    close5: "Elegir tono voz definitivo + anotar.",
    homePractice: "5x10': canción en 2 tonos.",
    homeMinPerDay: 10,
    passCriteria: "Toca misma canción en 2 tonos sin errores forma.",
    kidAdapt: "Capo de colores, tabla dibujada.",
    adultAdapt: "Ajustar tono voz con app tuner vocal simple.",
    guitarVariants: {
      espanola: "Capo sin apretar de más (afina).",
      acustica: "Capo + rasgueo referencia.",
      electrica: "Transporte con power + capo opcional.",
    },
    reviewFrom: ["C12", "C22"],
    skillKeys: ["acordes", "oido", "repertorio"],
    difficulty: 3,
    song: "Su canción en 2 tonos",
  }),
  l(24, "MEDIO", "INTERMEDIO", 2, "Hammer, pull y slide: suenas fluido", {
    objective: "H-P-S limpios en pentatónica.",
    science: "Articulación legato: fuerza mínima + timing. Base solo.",
    warmup5: "Pentatónica 75 + cromático legato.",
    main20: [
      "0-7': Hammer 5h7, pull 7p5, slide 5/7 en 2ª cuerda.",
      "7-15': Aplicar en escala: cada 2 notas 1 legato.",
      "15-20': Lick 4 notas con H-P-S sobre backing.",
    ],
    close5: "Crear lick propio 4 notas.",
    homePractice: "5x12': legato 5' + lick 7'.",
    homeMinPerDay: 12,
    passCriteria: "H-P-S suenan igual volumen que picado (3/4).",
    kidAdapt: "Hammer como 'martillito', slide como 'tobogán'.",
    adultAdapt: "Si dedos se fatigan, acción/ calibre revisar.",
    guitarVariants: {
      espanola: "Legato clásico fuerte, uña no interfiere.",
      acustica: "Legato + púa resto.",
      electrica: "Legato + ligera compresión para igualar.",
    },
    reviewFrom: ["C19", "C20"],
    skillKeys: ["tecnica", "oido"],
    difficulty: 4,
    song: "Lick propio sobre Am",
  }),
  l(25, "MEDIO", "INTERMEDIO", 2, "Bend + vibrato: la voz de la guitarra", {
    objective: "Bend medio tono afinado + vibrato regular.",
    science: "Afinación microtonal + oído: bend se afina cantando nota destino.",
    warmup5: "Lick C24 + cantar nota destino bend.",
    main20: [
      "0-8': Bend 7 traste 3ª (B→C): subir, comprobar con C traste 5 2ª.",
      "8-15': Vibrato muñeca (no dedo) 4 pulsos por nota.",
      "15-20': Frase con bend + vibrato final sobre backing.",
    ],
    close5: "Grabar frase + comparar afinación.",
    homePractice: "5x10': bends afinados 5' + frase 5'.",
    homeMinPerDay: 10,
    passCriteria: "3 bends seguidos afinados ±10 cents (app) + vibrato regular.",
    kidAdapt: "Bend en eléctrica o acústica ligera; española solo vibrato clásico.",
    adultAdapt: "Dedo apoyo (2 dedos empujan) para no lesionar.",
    guitarVariants: {
      espanola: "Vibrato clásico longitudinal, bend leve (nailon desafina fácil).",
      acustica: "Bend 1/2 tono máx cuerda 3ª.",
      electrica: "Bend tono + vibrato amplio, calibre 09-42 ideal.",
    },
    reviewFrom: ["C20", "C24"],
    skillKeys: ["tecnica", "oido"],
    difficulty: 4,
    song: "Frase blues con bend",
  }),
  l(26, "MEDIO", "INTERMEDIO", 2, "Tu primer solo de 12 compases", {
    objective: "Solo estructurado inicio-desarrollo-cierre.",
    science: "Forma + memoria: motivo, repetición, final. Performance sin parar.",
    warmup5: "Frase C25 + pentatónica 80.",
    main20: [
      "0-6': Estructura: 4 compases pregunta, 4 respuesta, 4 cierre con bend final.",
      "6-16': Montar + grabar 3 tomas, elegir mejor.",
      "16-20': Tocar de memoria sin backing y con backing.",
    ],
    close5: "Poner título al solo + fecha.",
    homePractice: "5x12': solo memoria + 1 toma diaria.",
    homeMinPerDay: 12,
    passCriteria: "Solo 12 compases memoria sin pararse.",
    kidAdapt: "Dibujar arco historia del solo.",
    adultAdapt: "Transcribir solo a tab para Biblioteca.",
    guitarVariants: {
      espanola: "Solo legato + arpegio final.",
      acustica: "Solo rítmico + acorde final.",
      electrica: "Solo con 2 sonidos (clean/drive).",
    },
    reviewFrom: ["C20", "C24", "C25"],
    skillKeys: ["repertorio", "tecnica", "oido"],
    difficulty: 4,
    song: "Solo propio 12 compases",
  }),
  l(27, "MEDIO", "INTERMEDIO", 2, "Canción intermedia completa", {
    objective: "Canción con cejilla + solo o arpegio de principio a fin.",
    science: "Integración: todo N2 en contexto real. Ensayo espaciado.",
    warmup5: "Solo C26 + bucle con cejilla.",
    main20: [
      "0-5': Elegir: Knockin' (G-D-Am con F puente) o Wish You Were Here (intro + acordes).",
      "5-15': Montar partes difíciles en bucle x5.",
      "15-20': Pase completo grabado.",
    ],
    close5: "Plan toques: tocarla 3 veces esa semana.",
    homePractice: "5x15': canción + solo mantenimiento.",
    homeMinPerDay: 15,
    passCriteria: "Canción entera máx 2 fallos sin parar.",
    kidAdapt: "Versión corta válida (verso+estribillo).",
    adultAdapt: "Tocar con metrónomo + cantar si puede.",
    guitarVariants: {
      espanola: "Arpegio en verso, rasgueo estribillo.",
      acustica: "Capo según voz + rasgueo completo.",
      electrica: "Intro riff + acordes + solo C26 como outro.",
    },
    reviewFrom: ["C15", "C26"],
    skillKeys: ["repertorio", "acordes", "ritmo"],
    difficulty: 4,
    song: "Knockin' on Heaven's Door / Wish You Were Here",
  }),
  l(28, "MEDIO", "INTERMEDIO", 2, "Checkpoint N2: ¿listo para avanzado?", {
    objective: "Verificar cejilla + pentatónica + canción.",
    science: "Evaluación + plan: decidir refuerzo o avance. Comparar audio C14 vs C28.",
    warmup5: "Afinar + canción N1 vs N2 seguidas.",
    main20: [
      "0-10': Test: F/Bm + pentatónica 80 + 16ths 70.",
      "10-17': Solo 12 + canción intermedia grabados.",
      "17-20': Notas 1-5 + pacto N3 (elegir pieza final).",
    ],
    close5: "Escucha comparada + diploma N2.",
    homePractice: "Puente: mantener F/Bm + solo 3x semana.",
    homeMinPerDay: 12,
    passCriteria: "F/Bm + solo + canción = pasa a N3. Si falla 2/3, refuerzo 3 clases.",
    kidAdapt: "Celebración familia + elegir guitarra futura.",
    adultAdapt: "Fijar objetivo N3 (pieza + demo).",
    guitarVariants: {
      espanola: "Prueba fingerstyle si va a clásica.",
      acustica: "Prueba canto + guitarra.",
      electrica: "Prueba con drive + limpio.",
    },
    reviewFrom: ["C15", "C26", "C27"],
    skillKeys: ["acordes", "tecnica", "repertorio", "ritmo"],
    difficulty: 3,
    song: "Medley N1+N2",
  }),

  // ============ TRIMESTRE 3 · AVANZADO (C29–C40) ============
  l(29, "AVANZADO", "AVANZADO", 3, "CAGED: el mástil deja de ser misterio", {
    objective: "Triadas C-A-G-E-D en 3 grupos de cuerdas.",
    science: "Mapa cognitivo: 5 formas conectadas reducen carga. Visual + táctil.",
    warmup5: "F/Bm + pentatónica 80.",
    main20: [
      "0-8': Triadas mayor C en 1-2-3 (C-A-G-E-D formas).",
      "8-15': Conectar 2 formas vecinas a 60.",
      "15-20': Aplicar a su canción: tocar estribillo en 2 posiciones.",
    ],
    close5: "Dibujar mapa CAGED propio.",
    homePractice: "5x15': triadas 1 tonalidad/semana.",
    homeMinPerDay: 15,
    passCriteria: "Triadas C en 3 posiciones sin dudar.",
    kidAdapt: "Colores por forma, juego puzzle.",
    adultAdapt: "Relacionar con teoría: 1-3-5.",
    guitarVariants: {
      espanola: "Triadas dedos, sonido clásico.",
      acustica: "Triadas + bajo.",
      electrica: "Triadas + drive leve para oír intervalos.",
    },
    reviewFrom: ["C15", "C23"],
    skillKeys: ["acordes", "lectura", "oido"],
    difficulty: 5,
    song: "Su canción en 2 posiciones CAGED",
  }),
  l(30, "AVANZADO", "AVANZADO", 3, "Séptimas + funk: ritmo de otro nivel", {
    objective: "Acordes 7 + ritmo funk 16ths con mute.",
    science: "Groove + armonía: mano derecha percusiva, izquierda precisa.",
    warmup5: "16ths C18 + triadas C29.",
    main20: [
      "0-8': Am7-D7-G7-Cmaj7 formas.",
      "8-15': Patrón funk: mute-chick-acorde a 75.",
      "15-20': Progresión ii-V-I funk.",
    ],
    close5: "Jam funk profe-bajo o drum loop.",
    homePractice: "5x12': funk + séptimas.",
    homeMinPerDay: 12,
    passCriteria: "ii-V-I funk 4 vueltas a 75 con chick claro.",
    kidAdapt: "Chick como 'chas' divertido.",
    adultAdapt: "Escuchar Nile Rodgers y copiar 2 compases.",
    guitarVariants: {
      espanola: "Funk dedos, chick con golpe.",
      acustica: "Funk púa fina.",
      electrica: "Funk pastilla puente + compresor.",
    },
    reviewFrom: ["C18", "C29"],
    skillKeys: ["ritmo", "acordes"],
    difficulty: 5,
    song: "Play That Funky Music (base)",
  }),
  l(31, "AVANZADO", "AVANZADO", 3, "Modos sin humo: jónico y dórico útiles", {
    objective: "Usar jónico y dórico sobre 2 acordes.",
    science: "Contexto antes que teoría: oír color antes de nombre.",
    warmup5: "Pentatónica + cantar 7 notas.",
    main20: [
      "0-8': Dórico sobre Dm7-G7 (2 notas características).",
      "8-15': Jónico sobre Cmaj7-Fmaj7.",
      "15-20': Impro 8 compases eligiendo modo por acorde.",
    ],
    close5: "Grabar impro modal + nombrar color.",
    homePractice: "5x12': backing modal 1 por día.",
    homeMinPerDay: 12,
    passCriteria: "Impro 8 compases sin notas fuera (guía: 6ª mayor dórico).",
    kidAdapt: "Modo = 'sabor' (alegre/misterioso).",
    adultAdapt: "Relacionar pentatónica + 2 notas = modo.",
    guitarVariants: {
      espanola: "Modal legato dulce.",
      acustica: "Modal rítmico.",
      electrica: "Modal + delay leve.",
    },
    reviewFrom: ["C19", "C29"],
    skillKeys: ["oido", "tecnica", "lectura"],
    difficulty: 5,
    song: "So What / Oye Como Va (modal base)",
  }),
  l(32, "AVANZADO", "AVANZADO", 3, "Alternate picking / picado que aguanta", {
    objective: "Alternate 16ths a 90 limpio + picado clásico.",
    science: "Economía motora: ángulo + relajación. Subir 5 BPM/día.",
    warmup5: "Cromático 60-80 + estirar.",
    main20: [
      "0-8': Alternate en 1 cuerda 70→90, luego 2 cuerdas.",
      "8-15': Fragmento escala con alternate estricto.",
      "15-20': Aplicar a riff o estudio clásico (picado).",
    ],
    close5: "Test velocidad máxima limpia + anotar.",
    homePractice: "5x12': alternate 90→100 en semana.",
    homeMinPerDay: 12,
    passCriteria: "16ths 8 compases a 90 sin tensar hombro.",
    kidAdapt: "Carreras divertidas con backing batería.",
    adultAdapt: "Si duele, revisar agarre púa y altura correa.",
    guitarVariants: {
      espanola: "Picado índice-medio alternando, uña 2mm.",
      acustica: "Alternate púa gruesa.",
      electrica: "Alternate + metrónomo + palm leve.",
    },
    reviewFrom: ["C18", "C24"],
    skillKeys: ["tecnica", "ritmo"],
    difficulty: 5,
    song: "Estudio picado / riff alternate",
  }),
  l(33, "AVANZADO", "AVANZADO", 3, "Fingerstyle avanzado / hybrid picking", {
    objective: "Pieza fingerstyle 16 compases o hybrid con púa.",
    science: "Independencia + memoria procedimental larga. Fragmentar en 4x4.",
    warmup5: "Travis C21 + alternate C32 suave.",
    main20: [
      "0-6': Elegir pieza: Tears in Heaven (dedos) o hybrid country.",
      "6-16': Montar 8 compases en 2 bloques x5 bucles.",
      "16-20': Unir + grabar.",
    ],
    close5: "Plan 2 semanas para 16 compases.",
    homePractice: "5x15': bloques + unión.",
    homeMinPerDay: 15,
    passCriteria: "8 compases sin parar a tempo.",
    kidAdapt: "Uñas postizas no; dedos cortos + paciencia.",
    adultAdapt: "Silla + reposapié si fingerstyle serio.",
    guitarVariants: {
      espanola: "Pieza clásica referencia.",
      acustica: "Fingerstyle + golpe percusivo opcional.",
      electrica: "Hybrid púa + medio-anular.",
    },
    reviewFrom: ["C11", "C21"],
    skillKeys: ["tecnica", "repertorio"],
    difficulty: 5,
    song: "Tears in Heaven (8 compases)",
  }),
  l(34, "AVANZADO", "AVANZADO", 3, "Dinámica y sonido: suenas en escenario", {
    objective: "Tocar misma pieza piano-forte + ajustar sonido base.",
    science: "Expresividad + control: dinámica intencional = musicalidad audible.",
    warmup5: "Pieza C33 + respiración escenario.",
    main20: [
      "0-8': Escala de dinámica 1-5 sobre acorde.",
      "8-15': Aplicar a canción: mapa dinámico dibujado.",
      "15-20': Sonido: EQ base + reverb/drive moderado + volumen guitarra.",
    ],
    close5: "Tocar pieza con mapa + grabar 2 tomas.",
    homePractice: "5x12': pieza con dinámica.",
    homeMinPerDay: 12,
    passCriteria: "Pieza con 3 niveles dinámicos claros.",
    kidAdapt: "Dinámica como contar cuento (susurro/grito).",
    adultAdapt: "Pedalera mínima: afinador + drive + reverb.",
    guitarVariants: {
      espanola: "Dinámica uña/carne + posición mano.",
      acustica: "Dinámica púa + punto ataque.",
      electrica: "Volumen guitarra como control dinámico.",
    },
    reviewFrom: ["C13", "C33"],
    skillKeys: ["repertorio", "ritmo", "tecnica"],
    difficulty: 4,
    song: "Su pieza con mapa dinámico",
  }),
  l(35, "AVANZADO", "AVANZADO", 3, "Compón 8 compases que sean tuyos", {
    objective: "Componer progresión + melodía 8 compases.",
    science: "Creación + teoría aplicada: restricción (4 acordes) libera.",
    warmup5: "CAGED + motivo favorito.",
    main20: [
      "0-7': Elegir 4 acordes + ritmo + motivo 4 notas.",
      "7-16': Componer 8 compases, grabar voz + guitarra móvil.",
      "16-20': Poner título + letra 2 versos o tarareo.",
    ],
    close5: "Tocar composición 2 veces + feedback.",
    homePractice: "5x15': pulir + escribir tab/letra.",
    homeMinPerDay: 15,
    passCriteria: "8 compases propios tocados de memoria + tab/letra escrita.",
    kidAdapt: "Dibujar historia + acordes colores.",
    adultAdapt: "Estructura verso + tag final.",
    guitarVariants: {
      espanola: "Composición arpegio + melodía.",
      acustica: "Composición rasgueo + voz.",
      electrica: "Composición riff + solo corto.",
    },
    reviewFrom: ["C20", "C26"],
    skillKeys: ["repertorio", "oido", "lectura"],
    difficulty: 5,
    song: "Composición propia 8 compases",
  }),
  l(36, "AVANZADO", "AVANZADO", 3, "Graba tu demo (portal Artista)", {
    objective: "Demo 60-90s grabada con móvil/DAW simple.",
    science: "Registro + auto-escucha: la grabación es el mejor profesor.",
    warmup5: "Composición C35 2 veces.",
    main20: [
      "0-8': Técnica grabación: posición móvil, niveles, 3 tomas.",
      "8-16': Grabar demo + elegir mejor toma.",
      "16-20': Subir a portal Artista + portada + descripción.",
    ],
    close5: "Escuchar demo + 1 mejora para directo.",
    homePractice: "3x15': regrabar si quiere + compartir familia.",
    homeMinPerDay: 15,
    passCriteria: "Demo subida a Artista + audible sin saturar.",
    kidAdapt: "Portada dibujada + nombre artístico.",
    adultAdapt: "DAW gratis (BandLab/GarageBand) 1 pista + voz opcional.",
    guitarVariants: {
      espanola: "Grabar a 30cm boca, habitación con cortinas.",
      acustica: "Grabar a 12º traste + boca mezcla.",
      electrica: "Grabar ampli bajo + IR o plugin.",
    },
    reviewFrom: ["C10", "C35"],
    skillKeys: ["repertorio", "tecnica"],
    difficulty: 4,
    song: "Demo propia 60-90s",
  }),
  l(37, "AVANZADO", "AVANZADO", 3, "Transcribe como un pro", {
    objective: "Transcribir 8 compases de solo/canción de oído a tab.",
    science: "Transcripción = oído + lectura + memoria. Slow-downer como andamio.",
    warmup5: "Oído C22 + escala.",
    main20: [
      "0-8': Elegir 8 compases (solo fácil: Wish, Knockin').",
      "8-16': Cazar a 75% velocidad, escribir tab.",
      "16-20': Tocar encima original a velocidad.",
    ],
    close5: "Guardar tab en Biblioteca + tocar para clase.",
    homePractice: "5x15': terminar transcripción.",
    homeMinPerDay: 15,
    passCriteria: "Tab 8 compases con ritmo aproximado + tocado encima 80%.",
    kidAdapt: "Tab grande + colores.",
    adultAdapt: "Software Transcribe!/Anytune 1 semana.",
    guitarVariants: {
      espanola: "Transcribir fingerstyle.",
      acustica: "Transcribir rasgueo + adornos.",
      electrica: "Transcribir solo con bends.",
    },
    reviewFrom: ["C22", "C31"],
    skillKeys: ["oido", "lectura"],
    difficulty: 5,
    song: "Transcripción 8 compases a elegir",
  }),
  l(38, "AVANZADO", "AVANZADO", 3, "Set de 3 canciones encadenadas", {
    objective: "Medley 3 canciones 8-10 min sin parar.",
    science: "Resistencia + transiciones: el directo se entrena encadenando.",
    warmup5: "3 canciones favoritas una vez cada una.",
    main20: [
      "0-6': Orden + transiciones (acorde puente, conteo).",
      "6-16': Pase set con fallos que no paran (regla: seguir).",
      "16-20': Grabar + anotar puntos débiles.",
    ],
    close5: "Fijar setlist concierto C40.",
    homePractice: "5x15': set + transiciones.",
    homeMinPerDay: 15,
    passCriteria: "Set 3 canciones sin parar (fallos que siguen valen).",
    kidAdapt: "Tarjetas orden + aplauso entre canciones.",
    adultAdapt: "Setlist impreso + afinación entre canciones rápida.",
    guitarVariants: {
      espanola: "Set fingerstyle + clásico.",
      acustica: "Set canto + guitarra.",
      electrica: "Set clean-drive-clean.",
    },
    reviewFrom: ["C27", "C36"],
    skillKeys: ["repertorio", "ritmo", "acordes"],
    difficulty: 5,
    song: "Set 3 canciones",
  }),
  l(39, "AVANZADO", "AVANZADO", 3, "Ensayo general + auto-evaluación", {
    objective: "Simulacro concierto + plan mejora.",
    science: "Simulación + ansiedad controlada: ensayar condiciones reales reduce fallos 30%.",
    warmup5: "Ritual escenario: afinar, respirar, 1' silencio.",
    main20: [
      "0-12': Pase set C38 de pie + presentación hablada.",
      "12-18': Feedback 2 estrellas + 1 deseo + auto-nota 1-5.",
      "18-20': Plan C40: ropa, lista, invitado.",
    ],
    close5: "Foto ensayo + mensaje familia invitación.",
    homePractice: "3x set + 2 días descanso activo (oír, no tocar).",
    homeMinPerDay: 15,
    passCriteria: "Simulacro completo + auto-evaluación escrita.",
    kidAdapt: "Público peluches + familia.",
    adultAdapt: "Grabar vídeo + ver sin sonido para postura.",
    guitarVariants: {
      espanola: "Silla clásica + reposapié en ensayo.",
      acustica: "Correa + de pie.",
      electrica: "De pie + cable + sonido final.",
    },
    reviewFrom: ["C34", "C38"],
    skillKeys: ["repertorio", "tecnica"],
    difficulty: 4,
    song: "Set C38 simulacro",
  }),
  l(40, "AVANZADO", "AVANZADO", 3, "Concierto cierre + plan año 2", {
    objective: "Tocar en público de clase + fijar siguiente nivel.",
    science: "Performance + celebración + continuidad: el progreso notorio se archiva y se proyecta.",
    warmup5: "Afinar + ritual + 1 canción fácil.",
    main20: [
      "0-12': Concierto: set 3 + composición/demos (8-10').",
      "12-17': Feedback público + entrega diploma N3 + escucha C01 vs C40.",
      "17-20': Plan año 2: repertorio, técnica, artista (single/EP) + horario práctica.",
    ],
    close5: "Foto + demo final subida + abrazo.",
    homePractice: "Verano: set 1x semana + 1 canción nueva al mes (mantenimiento espaciado).",
    homeMinPerDay: 15,
    passCriteria: "Concierto realizado + demo + plan año 2 firmado. Pasa a Artista si quiere.",
    kidAdapt: "Diploma + medalla + vídeo familia.",
    adultAdapt: "Comparar audio C01/C40 + fijar objetivo (grupo, open mic, EP).",
    guitarVariants: {
      espanola: "Cierre fingerstyle + clásico.",
      acustica: "Cierre canto + guitarra.",
      electrica: "Cierre banda o backing + solo.",
    },
    reviewFrom: ["C28", "C36", "C38"],
    skillKeys: ["ritmo", "acordes", "tecnica", "oido", "lectura", "repertorio"],
    difficulty: 4,
    song: "Concierto final",
  }),
];

// ---------- Helpers consulta diaria / ERP ----------

export function getGuitarLesson(id: string): GuitarLessonScript | undefined {
  return GUITAR_40.find((lesson) => lesson.id === id);
}

export function getGuitarLessonsByLevel(level: GuitarScriptLevel): GuitarLessonScript[] {
  return GUITAR_40.filter((lesson) => lesson.level === level);
}

export function getGuitarLessonsByTrimester(trimester: 1 | 2 | 3): GuitarLessonScript[] {
  return GUITAR_40.filter((lesson) => lesson.trimester === trimester);
}

/** Clase sugerida por semana 1..40 desde inicio de curso. Fuera de rango devuelve C01/C40. */
export function getGuitarLessonForWeek(week: number): GuitarLessonScript {
  if (week <= 1) return GUITAR_40[0];
  if (week >= 40) return GUITAR_40[GUITAR_40.length - 1];
  return GUITAR_40[week - 1];
}

/** Texto 60 segundos para panel profesor / WhatsApp. */
export function buildGuitarDailyBrief(lesson: GuitarLessonScript): string {
  const steps = lesson.main20.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return [
    `${lesson.id} · ${lesson.title} (${lesson.level} · ${lesson.durationMin}')`,
    `Objetivo: ${lesson.objective}`,
    `Calentamiento 5': ${lesson.warmup5}`,
    `Bloque 20':\n${steps}`,
    `Cierre 5': ${lesson.close5}`,
    `Casa ${lesson.homeMinPerDay}'x5: ${lesson.homePractice}`,
    `Pasa si: ${lesson.passCriteria}`,
    `Skills: ${lesson.skillKeys.join(", ")} · Repaso: ${lesson.reviewFrom.join(", ") || "—"}`,
  ].join("\n");
}

/** Semilla Biblioteca: ejercicios derivados del guion (2/5/15'). */
export function buildGuitarLibrarySeeds(): Array<{
  title: string;
  instrument: string;
  level: EduLevelKey;
  difficulty: number;
  estimatedMin: number;
  skillKeys: string[];
  description: string;
}> {
  return GUITAR_40.map((lesson) => ({
    title: `${lesson.id} ${lesson.title}`,
    instrument: "GUITARRA",
    level: lesson.eduLevel,
    difficulty: lesson.difficulty,
    estimatedMin: lesson.homeMinPerDay <= 10 ? 10 : lesson.homeMinPerDay <= 12 ? 10 : 15,
    skillKeys: lesson.skillKeys,
    description: `${lesson.objective} Casa: ${lesson.homePractice}`,
  }));
}

export const GUITAR_COURSE_META = {
  totalClasses: 40,
  minutesPerClass: 30,
  totalContactMin: 1200,
  suggestedHomeMinPerDay: 12,
  levels: ["PRINCIPIANTE", "MEDIO", "AVANZADO"] as GuitarScriptLevel[],
  distribution: "C01–C14 Principiante · C15–C28 Medio · C29–C40 Avanzado",
  instruments: ["espanola", "acustica", "electrica"] as GuitarKind[],
} as const;
