/**
 * lib/scenarios/storage.ts
 *
 * localStorage-backed scenario persistence for the public landing page.
 * No backend, no auth, no Firestore — everything lives client-side so
 * anonymous visitors can save + fork + revisit their scenarios without
 * signing up. This is the IKEA effect surface: every typed name and
 * saved plan deepens ownership, and research says that's the strongest
 * retention principle for this cohort.
 *
 * Schema (single key, versioned for clean migration when Phase F
 * extends the Scenario type):
 *
 *   key: "compound.scenarios.v1"
 *   value: StoredScenario[]
 *
 * StoredScenario freezes a freedomAge snapshot at save time so the
 * drawer list renders without recomputing for every entry. When the
 * user loads a scenario, we recompute from the actual slider values
 * (the snapshot is purely for list-view display).
 *
 * SSR-safe: every function checks `typeof window === 'undefined'` and
 * returns safe defaults during server rendering. Next 16 will throw a
 * hydration mismatch if we read localStorage during render, so the
 * FireCalculator component wraps reads in useEffect.
 */

import type { Scenario } from './types';

const STORAGE_KEY = 'compound.scenarios.v1';

export interface StoredScenario {
  id: string;
  name: string;
  scenario: Scenario;
  /** freedomAge snapshot at save time; purely for drawer list display. */
  freedomAge: number;
  createdAt: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Read all stored scenarios. Returns [] on SSR, on parse failure, or
 * when no scenarios have been saved yet.
 */
export function listScenarios(): StoredScenario[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredScenario[];
  } catch {
    // Corrupted JSON — treat as empty. Better to silently recover than
    // to lock the user out with an error.
    return [];
  }
}

/**
 * Look up a single stored scenario by id. Returns undefined if not
 * found (or on SSR).
 */
export function getScenario(id: string): StoredScenario | undefined {
  return listScenarios().find((s) => s.id === id);
}

/**
 * Persist a new scenario to storage. Returns the full StoredScenario
 * record (with id + createdAt filled in) so the caller can use it
 * immediately without a second read.
 *
 * If a scenario with the same name already exists, we create a new
 * record anyway — dedup/rename is a future polish task. The user sees
 * "Plan A" twice and can delete one.
 */
export function saveScenario(
  scenario: Scenario,
  name: string,
  freedomAge: number,
): StoredScenario | null {
  if (!isBrowser()) return null;

  const record: StoredScenario = {
    id: crypto.randomUUID(),
    name: name.trim().length > 0 ? name.trim() : 'Untitled',
    scenario,
    freedomAge: Number.isFinite(freedomAge) ? freedomAge : -1,
    createdAt: Date.now(),
  };

  const current = listScenarios();
  const next = [...current, record];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return record;
  } catch {
    // Storage quota exceeded, private-mode Safari, etc. Silently fail
    // rather than crash — the scenario simply isn't saved this time.
    return null;
  }
}

/**
 * Delete a stored scenario by id. No-op on SSR or when the id doesn't
 * exist. Returns the updated list for convenience.
 */
export function deleteScenario(id: string): StoredScenario[] {
  if (!isBrowser()) return [];
  const current = listScenarios();
  const next = current.filter((s) => s.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Silently fail — the in-memory state will reflect the deletion
    // until the next page load.
  }
  return next;
}

/**
 * Fork a stored scenario: clones the record under a new name with a
 * "(copy)" suffix, recomputing freedomAge from the cloned scenario
 * would require access to computeFire() from @/lib/calculations/fire,
 * but since scenario data is unchanged we just copy the snapshot.
 * Caller can recompute if they want a fresh one.
 */
export function forkScenario(id: string): StoredScenario | null {
  const source = getScenario(id);
  if (source == null) return null;
  return saveScenario(
    { ...source.scenario },
    `${source.name} (copy)`,
    source.freedomAge,
  );
}

/**
 * Clear all saved scenarios. Exposed for tests and a future
 * "reset" UI affordance. Not used in the default flow.
 */
export function clearAllScenarios(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op on failure.
  }
}
