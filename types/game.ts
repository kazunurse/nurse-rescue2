// ゲームの型定義

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Category = 'endocrine' | 'respiratory' | 'cardiovascular' | 'neurological' | 'other';
export type PatientAppearance = 'normal' | 'anxious' | 'pale' | 'critical' | 'unconscious';
export type ActionCategory = 'measure' | 'examine' | 'interview' | 'treat' | 'call' | 'report' | 'wait';
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
