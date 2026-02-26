// ゲームの型定義

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Category = 'endocrine' | 'respiratory' | 'cardiovascular' | 'neurological' | 'infection' | 'trauma' | 'allergy' | 'other';
export type PatientAppearance = 'normal' | 'anxious' | 'pale' | 'critical' | 'unconscious';
export type ActionCategory = 'assess' | 'measure' | 'examine' | 'interview' | 'treat' | 'call' | 'report' | 'wait';
export type GamePhase = 'idle' | 'playing' | 'paused' | 'finished';
export type GameResult = 'success' | 'partial_success' | 'fail';

export interface PatientState {
  consciousness: number;       // JCS値
  bloodPressure: { systolic: number; diastolic: number };
  heartRate: number;
  spO2: number;
  bloodGlucose: number | null;
  temperature: number;
  respiratoryRate: number;
  appearance: PatientAppearance;
}

export interface LabTestValue {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
  flag: 'H' | 'L' | null;
}

export interface LabData {
  bloodTest: {
    available: boolean;
    revealedByAction?: string;
    values?: LabTestValue[];
    interpretation?: string;
  };
  ecg: {
    available: boolean;
    revealedByAction?: string;
    findings?: string;
    interpretation?: string;
  };
  imaging: {
    available: boolean;
    revealedByAction?: string;
    findings?: string;
    interpretation?: string;
  };
}

export interface ScenarioAction {
  id: string;
  label: string;
  category: ActionCategory;
  icon: string;
  isOptimal: boolean;
  stateChange: Partial<PatientState>;
  feedback: string;
  score: number;
  timeRequired: number;
}

export interface ScenarioPhase {
  id: string;
  description: string;
  urgencyHint: string | null;
  timeLimit: number;
  availableActionIds: string[];
  criticalActions: string[];
  nextPhase: {
    onCriticalAction?: string;
    onTimeout?: string;
    onWaitAndSee?: string;
  };
}

export interface ScenarioPatient {
  name: string;
  age: number;
  gender: 'male' | 'female';
  chiefComplaint: string;
  medicalHistory: string[];
  currentOrders: string;
  ward: string;
}

export interface ScenarioExplanation {
  summary: string;
  keyPoints: string[];
  evidence: string;
  evidenceUrl?: string;
}

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  category: Category;
  timeLimit: number;
  estimatedMinutes: number;
  description: string;
  patient: ScenarioPatient;
  initialState: PatientState;
  labData: LabData;
  phases: ScenarioPhase[];
  actions: ScenarioAction[];
  explanation: ScenarioExplanation;
}

export interface ActionLog {
  id: string;
  actionId: string;
  actionLabel: string;
  feedback: string;
  timestamp: number;
  score: number;
  isOptimal: boolean;
  phaseId: string;
}

export interface GameState {
  phase: GamePhase;
  scenarioId: string | null;
  currentPhaseId: string | null;
  patientState: PatientState | null;
  elapsedTime: number;
  phaseTimeRemaining: number;
  actionLog: ActionLog[];
  totalScore: number;
  criticalActionsCompleted: string[];
  result: GameResult | null;
  revealedLabData: string[];   // 開示済み検査データのアクションID
}

export interface HistoryRecord {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  playedAt: number;
  result: GameResult;
  totalScore: number;
  elapsedTime: number;
  actionCount: number;
}

// カテゴリの日本語ラベル
export const CATEGORY_LABELS: Record<Category, string> = {
  endocrine: '内分泌',
  respiratory: '呼吸器',
  cardiovascular: '循環器',
  neurological: '神経',
  infection: '感染症',
  trauma: '外傷',
  allergy: 'アレルギー',
  other: 'その他',
};

// 難易度の日本語ラベル
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
};

// アクションカテゴリの日本語ラベル
export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  assess: 'アセスメント',
  measure: '測定する',
  examine: '診察する',
  interview: '問診する',
  treat: '処置する',
  call: '呼ぶ',
  report: '報告・記録',
  wait: '待機',
};
