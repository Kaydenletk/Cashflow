/**
 * lib/scenarios/storage.test.ts
 *
 * Tests for localStorage-backed scenario persistence. vitest with jsdom
 * provides localStorage, so we can run these as unit tests without
 * spinning up a browser.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearAllScenarios,
  deleteScenario,
  forkScenario,
  getScenario,
  listScenarios,
  saveScenario,
} from './storage';
import type { Scenario } from './types';

const canonical: Scenario = {
  currentAge: 30,
  currentNetWorth: 50_000,
  monthlyContribution: 1_500,
  returnRate: 0.07,
};

beforeEach(() => {
  clearAllScenarios();
});

afterEach(() => {
  clearAllScenarios();
});

describe('listScenarios', () => {
  it('returns empty array when no scenarios are saved', () => {
    expect(listScenarios()).toEqual([]);
  });

  it('returns all saved scenarios in insertion order', () => {
    saveScenario(canonical, 'Plan A', 51);
    saveScenario(canonical, 'Plan B', 50);
    const list = listScenarios();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Plan A');
    expect(list[1].name).toBe('Plan B');
  });
});

describe('saveScenario', () => {
  it('returns a record with id, name, scenario, freedomAge, createdAt', () => {
    const record = saveScenario(canonical, 'Plan A', 51);
    expect(record).not.toBeNull();
    expect(record!.id).toBeTruthy();
    expect(record!.name).toBe('Plan A');
    expect(record!.scenario).toEqual(canonical);
    expect(record!.freedomAge).toBe(51);
    expect(record!.createdAt).toBeTypeOf('number');
  });

  it('trims the name', () => {
    const record = saveScenario(canonical, '  Plan A  ', 51);
    expect(record!.name).toBe('Plan A');
  });

  it('falls back to "Untitled" for empty or whitespace-only names', () => {
    const a = saveScenario(canonical, '', 51);
    const b = saveScenario(canonical, '   ', 51);
    expect(a!.name).toBe('Untitled');
    expect(b!.name).toBe('Untitled');
  });

  it('clamps non-finite freedomAge to -1', () => {
    const record = saveScenario(canonical, 'Plan A', Infinity);
    expect(record!.freedomAge).toBe(-1);
  });

  it('generates unique ids for duplicate saves', () => {
    const a = saveScenario(canonical, 'Plan A', 51);
    const b = saveScenario(canonical, 'Plan A', 51);
    expect(a!.id).not.toBe(b!.id);
  });
});

describe('getScenario', () => {
  it('finds a scenario by id', () => {
    const saved = saveScenario(canonical, 'Plan A', 51);
    const found = getScenario(saved!.id);
    expect(found).toEqual(saved);
  });

  it('returns undefined for missing ids', () => {
    expect(getScenario('nonexistent')).toBeUndefined();
  });
});

describe('deleteScenario', () => {
  it('removes the target scenario and returns the updated list', () => {
    const a = saveScenario(canonical, 'Plan A', 51);
    const b = saveScenario(canonical, 'Plan B', 50);
    const after = deleteScenario(a!.id);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(b!.id);
    expect(getScenario(a!.id)).toBeUndefined();
  });

  it('is a no-op for missing ids', () => {
    const a = saveScenario(canonical, 'Plan A', 51);
    const after = deleteScenario('nonexistent');
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(a!.id);
  });
});

describe('forkScenario', () => {
  it('clones the source with a "(copy)" suffix', () => {
    const source = saveScenario(canonical, 'Plan A', 51);
    const fork = forkScenario(source!.id);
    expect(fork).not.toBeNull();
    expect(fork!.name).toBe('Plan A (copy)');
    expect(fork!.scenario).toEqual(canonical);
    expect(fork!.id).not.toBe(source!.id);
  });

  it('returns null when source id is missing', () => {
    expect(forkScenario('nonexistent')).toBeNull();
  });

  it('leaves the original intact', () => {
    const source = saveScenario(canonical, 'Plan A', 51);
    forkScenario(source!.id);
    const list = listScenarios();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Plan A');
    expect(list[1].name).toBe('Plan A (copy)');
  });
});

describe('clearAllScenarios', () => {
  it('removes every stored scenario', () => {
    saveScenario(canonical, 'Plan A', 51);
    saveScenario(canonical, 'Plan B', 50);
    clearAllScenarios();
    expect(listScenarios()).toEqual([]);
  });
});

describe('corruption recovery', () => {
  it('returns empty array when storage contains non-JSON garbage', () => {
    window.localStorage.setItem('compound.scenarios.v1', 'not json at all');
    expect(listScenarios()).toEqual([]);
  });

  it('returns empty array when storage contains a non-array value', () => {
    window.localStorage.setItem('compound.scenarios.v1', '{"not":"an array"}');
    expect(listScenarios()).toEqual([]);
  });
});
