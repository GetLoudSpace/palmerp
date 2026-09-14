export interface MenuItem {
  label: string;
  path: string;
}

export interface PalmModule {
  id: string;
  name: string;
  icon: string;
  category: "General" | "CRM" | "Herramientas" | "Configuracion";
  menuItems: MenuItem[];
  requiredRole?: "ADMIN" | "STAFF" | "PROFESSOR" | "DEV";
}

export interface PalmModeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "Operaciones" | "Soporte" | "Estrategia" | "Configuracion";
  menuItems: MenuItem[];
  requiredRole?: "ADMIN" | "STAFF" | "PROFESSOR" | "DEV";
}

export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  module?: string;
  estimatedTime?: string;
  createdAt: string;
}

export interface DailyScrumSession {
  id: string;
  date: string;
  duration: number;
  responses: {
    yesterday: string;
    today: string;
    blockers: string;
  };
  extractedTasks: Task[];
  status: "in_progress" | "completed";
}

export type AIProvider = "openrouter" | "ollama" | "anthropic" | "openai" | "nvidia" | "none";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export type WorkStyle = "analytical" | "creative" | "social" | "structured" | "adaptive";
export type EnergyPattern = "morning" | "afternoon" | "evening" | "flexible";
export type LearningStyle = "visual" | "auditory" | "kinesthetic" | "reading" | "mixed";
export type MotivationDriver = "growth" | "autonomy" | "purpose" | "recognition" | "mastery" | "connection";

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  lastActive: string;
  dailyScrumCount: number;
  profileComplete: boolean;
}

export interface PsychologicalProfile {
  workStyle: WorkStyle[];
  energyPattern: EnergyPattern;
  learningStyle: LearningStyle;
  motivationDrivers: MotivationDriver[];
  strengths: string[];
  growthAreas: string[];
  stressTriggers: string[];
  preferredFeedback: "direct" | "gentle" | "data-driven" | "collaborative";
  communicationStyle: "concise" | "detailed" | "visual" | "storytelling";
  wellbeingScore: number;
  engagementScore: number;
  autonomyLevel: "needs-guidance" | "independent" | "self-directed";
  notes: string;
}

export interface DailyReflection {
  date: string;
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  satisfaction: number;
  note?: string;
}

export interface SkillProgress {
  skill: string;
  category: string;
  level: number;
  startedAt: string;
  lastPracticed: string;
  hoursInvested: number;
  milestones: { label: string; achievedAt: string }[];
}

export interface PersonalInsight {
  id: string;
  type: "pattern" | "recommendation" | "milestone" | "warning";
  title: string;
  description: string;
  createdAt: string;
  data: Record<string, any>;
}

export interface PersonalDevelopmentPlan {
  userId: string;
  vision: string;
  shortTermGoals: { title: string; deadline?: string; skills: string[] }[];
  longTermGoals: { title: string; timeframe: string; skills: string[] }[];
  currentSkills: SkillProgress[];
  insights: PersonalInsight[];
  reflections: DailyReflection[];
  updatedAt: string;
}
