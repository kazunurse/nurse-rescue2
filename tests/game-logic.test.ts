import { describe, it, expect } from 'vitest';
import scenariosData from '../data/scenarios.json';
import type { Scenario, ScenarioAction } from '../types/game';

const scenarios = scenariosData as Scenario[];

describe('Scenarios Data', () => {
  it('should have at least 3 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(3);
  });

  it('each scenario should have required fields', () => {
    for (const scenario of scenarios) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.title).toBeTruthy();
      expect(scenario.patient).toBeDefined();
      expect(scenario.initialState).toBeDefined();
      expect(scenario.phases).toBeDefined();
      expect(scenario.phases.length).toBeGreaterThan(0);
      expect(scenario.explanation).toBeDefined();
    }
  });

  it('each scenario should have valid difficulty', () => {
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    for (const scenario of scenarios) {
      expect(validDifficulties).toContain(scenario.difficulty);
    }
  });

  it('each scenario should have valid initial vitals', () => {
    for (const scenario of scenarios) {
      const state = scenario.initialState;
      expect(state.consciousness).toBeGreaterThanOrEqual(0);
      expect(state.bloodPressure.systolic).toBeGreaterThan(0);
      expect(state.bloodPressure.diastolic).toBeGreaterThan(0);
      expect(state.heartRate).toBeGreaterThan(0);
      expect(state.spO2).toBeGreaterThan(0);
      expect(state.spO2).toBeLessThanOrEqual(100);
      expect(state.temperature).toBeGreaterThan(0);
    }
  });

  it('each phase should have actions (non-terminal phases)', () => {
    for (const scenario of scenarios) {
      // terminal phases (success/fail) have empty availableActionIds by design
      const nonTerminalPhases = scenario.phases.filter(p => p.timeLimit > 0);
      for (const phase of nonTerminalPhases) {
        expect(phase.id).toBeTruthy();
        expect(phase.description).toBeTruthy();
        expect(phase.availableActionIds).toBeDefined();
        expect(phase.availableActionIds.length).toBeGreaterThan(0);
      }
    }
  });

  it('each action should have required fields', () => {
    for (const scenario of scenarios) {
      for (const action of scenario.actions) {
        expect(action.id).toBeTruthy();
        expect(action.label).toBeTruthy();
        expect(action.category).toBeTruthy();
        expect(typeof action.score).toBe('number');
        expect(action.feedback).toBeTruthy();
      }
    }
  });

  it('each scenario should have explanation with key points', () => {
    for (const scenario of scenarios) {
      expect(scenario.explanation.summary).toBeTruthy();
      expect(scenario.explanation.keyPoints).toBeDefined();
      expect(scenario.explanation.keyPoints.length).toBeGreaterThan(0);
      expect(scenario.explanation.evidence).toBeTruthy();
    }
  });

  it('hypoglycemia scenario should have blood glucose action that reveals low glucose', () => {
    const hypo = scenarios.find(s => s.id === 'hypoglycemia');
    expect(hypo).toBeDefined();
    // Initial bloodGlucose is null (unknown) - revealed via measure_glucose action
    const glucoseAction = hypo!.actions.find(a => a.id === 'measure_glucose');
    expect(glucoseAction).toBeDefined();
    const revealedGlucose = glucoseAction!.stateChange.bloodGlucose;
    expect(revealedGlucose).toBeDefined();
    expect(revealedGlucose as number).toBeLessThan(70);
  });

  it('scenarios should have valid categories', () => {
    const validCategories = ['endocrine', 'respiratory', 'cardiovascular', 'neurological', 'other'];
    for (const scenario of scenarios) {
      expect(validCategories).toContain(scenario.category);
    }
  });
});

describe('Score Logic', () => {
  it('optimal actions should have positive scores', () => {
    for (const scenario of scenarios) {
      const optimalActions = scenario.actions.filter((a: ScenarioAction) => a.isOptimal);
      for (const action of optimalActions) {
        expect(action.score).toBeGreaterThan(0);
      }
    }
  });

  it('total possible score should be calculable', () => {
    for (const scenario of scenarios) {
      let totalPossible = 0;
      for (const action of scenario.actions) {
        if (action.score > 0) totalPossible += action.score;
      }
      expect(totalPossible).toBeGreaterThan(0);
    }
  });
});
