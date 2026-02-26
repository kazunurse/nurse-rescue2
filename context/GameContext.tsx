import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import scenariosData from '@/data/scenarios.json';
import type {
  GameState, GamePhase, GameResult, PatientState,
  ActionLog, HistoryRecord, Scenario, ScenarioAction
} from '@/types/game';

const HISTORY_KEY = '@nurse_rescue_history';

// ─── 初期状態 ────────────────────────────────────────────────────────────────
const initialGameState: GameState = {
  phase: 'idle',
  scenarioId: null,
  currentPhaseId: null,
  patientState: null,
  elapsedTime: 0,
  phaseTimeRemaining: 0,
  actionLog: [],
  totalScore: 0,
  criticalActionsCompleted: [],
  result: null,
};

// ─── アクション型 ─────────────────────────────────────────────────────────────
type GameAction =
  | { type: 'START_SCENARIO'; scenarioId: string; initialState: PatientState; firstPhaseId: string; phaseTimeLimit: number }
  | { type: 'PERFORM_ACTION'; action: ScenarioAction; phaseId: string }
  | { type: 'ADVANCE_PHASE'; phaseId: string; phaseTimeLimit: number }
  | { type: 'TICK_ELAPSED'; delta: number }
  | { type: 'TICK_PHASE'; delta: number }
  | { type: 'FINISH_GAME'; result: GameResult }
  | { type: 'RESET' };

// ─── リデューサー ─────────────────────────────────────────────────────────────
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_SCENARIO':
      return {
        ...initialGameState,
        phase: 'playing',
        scenarioId: action.scenarioId,
        currentPhaseId: action.firstPhaseId,
        patientState: action.initialState,
        phaseTimeRemaining: action.phaseTimeLimit,
      };

    case 'PERFORM_ACTION': {
      const newPatientState = action.action.stateChange
        ? mergePatientState(state.patientState!, action.action.stateChange)
        : state.patientState!;

      const logEntry: ActionLog = {
        id: `${Date.now()}-${Math.random()}`,
        actionId: action.action.id,
        actionLabel: action.action.label,
        feedback: action.action.feedback,
        timestamp: state.elapsedTime,
        score: action.action.score,
        isOptimal: action.action.isOptimal,
        phaseId: action.phaseId,
      };

      const newCriticalCompleted = action.action.isOptimal
        ? [...state.criticalActionsCompleted, action.action.id]
        : state.criticalActionsCompleted;

      return {
        ...state,
        patientState: newPatientState,
        actionLog: [...state.actionLog, logEntry],
        totalScore: Math.max(0, state.totalScore + action.action.score),
        criticalActionsCompleted: newCriticalCompleted,
        phaseTimeRemaining: Math.max(0, state.phaseTimeRemaining - action.action.timeRequired),
      };
    }

    case 'ADVANCE_PHASE':
      return {
        ...state,
        currentPhaseId: action.phaseId,
        phaseTimeRemaining: action.phaseTimeLimit,
      };

    case 'TICK_ELAPSED':
      return { ...state, elapsedTime: state.elapsedTime + action.delta };

    case 'TICK_PHASE':
      return { ...state, phaseTimeRemaining: Math.max(0, state.phaseTimeRemaining - action.delta) };

    case 'FINISH_GAME':
      return { ...state, phase: 'finished', result: action.result };

    case 'RESET':
      return initialGameState;

    default:
      return state;
  }
}

function mergePatientState(current: PatientState, changes: Partial<PatientState>): PatientState {
  return {
    ...current,
    ...changes,
    bloodPressure: changes.bloodPressure
      ? { ...current.bloodPressure, ...changes.bloodPressure }
      : current.bloodPressure,
  };
}

// ─── コンテキスト型 ────────────────────────────────────────────────────────────
interface GameContextType {
  gameState: GameState;
  scenarios: Scenario[];
  startScenario: (scenarioId: string) => void;
  performAction: (actionId: string) => void;
  finishGame: (result: GameResult) => void;
  resetGame: () => void;
  getScenario: (id: string) => Scenario | undefined;
  getCurrentPhase: () => Scenario['phases'][0] | undefined;
  getAvailableActions: () => ScenarioAction[];
  history: HistoryRecord[];
  loadHistory: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

// ─── プロバイダー ─────────────────────────────────────────────────────────────
export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
  const [history, setHistory] = React.useState<HistoryRecord[]>([]);
  const scenarios = scenariosData as Scenario[];

  // タイマー参照
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const getScenario = useCallback((id: string) => {
    return scenarios.find(s => s.id === id);
  }, [scenarios]);

  const getCurrentPhase = useCallback(() => {
    const { scenarioId, currentPhaseId } = gameStateRef.current;
    if (!scenarioId || !currentPhaseId) return undefined;
    const scenario = scenarios.find(s => s.id === scenarioId);
    return scenario?.phases.find(p => p.id === currentPhaseId);
  }, [scenarios]);

  const getAvailableActions = useCallback(() => {
    const phase = getCurrentPhase();
    const { scenarioId } = gameStateRef.current;
    if (!phase || !scenarioId) return [];
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return [];
    return phase.availableActionIds
      .map(id => scenario.actions.find(a => a.id === id))
      .filter((a): a is ScenarioAction => !!a);
  }, [getCurrentPhase, scenarios]);

  const stopTimers = useCallback(() => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    elapsedTimerRef.current = null;
    phaseTimerRef.current = null;
  }, []);

  const startTimers = useCallback((phaseTimeLimit: number) => {
    stopTimers();
    if (phaseTimeLimit <= 0) return;

    elapsedTimerRef.current = setInterval(() => {
      dispatch({ type: 'TICK_ELAPSED', delta: 1 });
    }, 1000);

    phaseTimerRef.current = setInterval(() => {
      dispatch({ type: 'TICK_PHASE', delta: 1 });
    }, 1000);
  }, [stopTimers]);

  const saveHistory = useCallback(async (record: HistoryRecord) => {
    try {
      const existing = await AsyncStorage.getItem(HISTORY_KEY);
      const records: HistoryRecord[] = existing ? JSON.parse(existing) : [];
      const updated = [record, ...records].slice(0, 50);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setHistory(updated);
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      if (data) setHistory(JSON.parse(data));
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const startScenario = useCallback((scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    const firstPhase = scenario.phases[0];
    dispatch({
      type: 'START_SCENARIO',
      scenarioId,
      initialState: scenario.initialState,
      firstPhaseId: firstPhase.id,
      phaseTimeLimit: firstPhase.timeLimit,
    });
    startTimers(firstPhase.timeLimit);
  }, [scenarios, startTimers]);

  const performAction = useCallback((actionId: string) => {
    const state = gameStateRef.current;
    if (state.phase !== 'playing' || !state.scenarioId || !state.currentPhaseId) return;

    const scenario = scenarios.find(s => s.id === state.scenarioId);
    if (!scenario) return;

    const action = scenario.actions.find(a => a.id === actionId);
    if (!action) return;

    const currentPhase = scenario.phases.find(p => p.id === state.currentPhaseId);
    if (!currentPhase) return;

    dispatch({ type: 'PERFORM_ACTION', action, phaseId: state.currentPhaseId });

    // フェーズ進行ロジック
    const isCritical = currentPhase.criticalActions.includes(actionId);
    const isWaitAndSee = actionId.includes('wait_and_see');

    if (isCritical && currentPhase.nextPhase.onCriticalAction) {
      const nextPhaseId = currentPhase.nextPhase.onCriticalAction;
      const nextPhase = scenario.phases.find(p => p.id === nextPhaseId);
      if (nextPhase) {
        if (['phase_success', 'phase_partial_success', 'phase_fail',
             'phase_success_pe', 'phase_partial_pe', 'phase_fail_pe',
             'phase_success_mi', 'phase_partial_mi', 'phase_fail_mi'].includes(nextPhaseId) ||
            nextPhase.description === 'success' || nextPhase.description === 'fail' || nextPhase.description === 'partial_success') {
          stopTimers();
          const result: GameResult =
            nextPhase.description === 'success' ? 'success' :
            nextPhase.description === 'partial_success' ? 'partial_success' : 'fail';
          setTimeout(() => {
            dispatch({ type: 'FINISH_GAME', result });
          }, 500);
        } else {
          setTimeout(() => {
            dispatch({ type: 'ADVANCE_PHASE', phaseId: nextPhaseId, phaseTimeLimit: nextPhase.timeLimit });
            startTimers(nextPhase.timeLimit);
          }, 1500);
        }
      }
    } else if (isWaitAndSee && currentPhase.nextPhase.onWaitAndSee) {
      const nextPhaseId = currentPhase.nextPhase.onWaitAndSee;
      const nextPhase = scenario.phases.find(p => p.id === nextPhaseId);
      if (nextPhase) {
        setTimeout(() => {
          dispatch({ type: 'ADVANCE_PHASE', phaseId: nextPhaseId, phaseTimeLimit: nextPhase.timeLimit });
          startTimers(nextPhase.timeLimit);
        }, 2000);
      }
    }
  }, [scenarios, stopTimers, startTimers]);

  const finishGame = useCallback((result: GameResult) => {
    stopTimers();
    dispatch({ type: 'FINISH_GAME', result });

    const state = gameStateRef.current;
    if (!state.scenarioId) return;
    const scenario = scenarios.find(s => s.id === state.scenarioId);
    if (!scenario) return;

    const record: HistoryRecord = {
      id: `${Date.now()}`,
      scenarioId: state.scenarioId,
      scenarioTitle: scenario.title,
      playedAt: Date.now(),
      result,
      totalScore: state.totalScore,
      elapsedTime: state.elapsedTime,
      actionCount: state.actionLog.length,
    };
    saveHistory(record);
  }, [stopTimers, scenarios, saveHistory]);

  const resetGame = useCallback(() => {
    stopTimers();
    dispatch({ type: 'RESET' });
  }, [stopTimers]);

  // タイムアウト処理
  React.useEffect(() => {
    const state = gameState;
    if (state.phase !== 'playing' || !state.currentPhaseId || !state.scenarioId) return;
    if (state.phaseTimeRemaining > 0) return;

    const scenario = scenarios.find(s => s.id === state.scenarioId);
    if (!scenario) return;
    const currentPhase = scenario.phases.find(p => p.id === state.currentPhaseId);
    if (!currentPhase || currentPhase.timeLimit === 0) return;

    const timeoutPhaseId = currentPhase.nextPhase.onTimeout;
    if (!timeoutPhaseId) return;

    const nextPhase = scenario.phases.find(p => p.id === timeoutPhaseId);
    if (!nextPhase) return;

    if (nextPhase.description === 'fail') {
      stopTimers();
      dispatch({ type: 'FINISH_GAME', result: 'fail' });
      const record: HistoryRecord = {
        id: `${Date.now()}`,
        scenarioId: state.scenarioId,
        scenarioTitle: scenario.title,
        playedAt: Date.now(),
        result: 'fail',
        totalScore: state.totalScore,
        elapsedTime: state.elapsedTime,
        actionCount: state.actionLog.length,
      };
      saveHistory(record);
    } else {
      dispatch({ type: 'ADVANCE_PHASE', phaseId: timeoutPhaseId, phaseTimeLimit: nextPhase.timeLimit });
    }
  }, [gameState.phaseTimeRemaining, gameState.phase]);

  return (
    <GameContext.Provider value={{
      gameState,
      scenarios,
      startScenario,
      performAction,
      finishGame,
      resetGame,
      getScenario,
      getCurrentPhase,
      getAvailableActions,
      history,
      loadHistory,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
