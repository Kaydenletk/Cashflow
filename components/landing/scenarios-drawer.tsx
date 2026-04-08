/**
 * components/landing/scenarios-drawer.tsx
 *
 * Right-side sliding panel that lists the user's saved scenarios from
 * localStorage. Opens from a button in the calculator actions bar.
 * Each row shows name + freedom age snapshot + load + fork + delete.
 *
 * Architecture: the outer ScenariosDrawer conditionally renders the
 * inner DrawerBody based on `open`. Each time the drawer re-opens,
 * DrawerBody mounts fresh via the `refreshKey` key prop, so its
 * lazy-initialized state reads storage synchronously on mount. This
 * sidesteps the react-hooks/set-state-in-effect lint rule (no effects
 * that call setState) and gives us free "refresh on open" behavior.
 *
 * Mutations (fork, delete) update local drawer state directly via
 * setScenarios.
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import {
  deleteScenario,
  forkScenario,
  listScenarios,
  type StoredScenario,
} from '@/lib/scenarios/storage';
import type { Scenario } from '@/lib/scenarios/types';

interface ScenariosDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user loads a scenario — parent updates its state. */
  onLoad: (scenario: Scenario) => void;
  /**
   * Bumped by the parent after saves so the drawer's next open cycle
   * reads a fresh list. Passed as React key so the inner DrawerBody
   * remounts cleanly.
   */
  refreshKey: number;
}

export function ScenariosDrawer({
  open,
  onClose,
  onLoad,
  refreshKey,
}: ScenariosDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <DrawerBody
          key={`drawer-${refreshKey}`}
          onClose={onClose}
          onLoad={onLoad}
        />
      )}
    </AnimatePresence>
  );
}

interface DrawerBodyProps {
  onClose: () => void;
  onLoad: (scenario: Scenario) => void;
}

function DrawerBody({ onClose, onLoad }: DrawerBodyProps) {
  const [scenarios, setScenarios] = useState<StoredScenario[]>(() =>
    listScenarios(),
  );

  function handleLoad(scenario: StoredScenario) {
    onLoad(scenario.scenario);
    onClose();
  }

  function handleFork(id: string) {
    forkScenario(id);
    setScenarios(listScenarios());
  }

  function handleDelete(id: string) {
    deleteScenario(id);
    setScenarios(listScenarios());
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#262626] bg-[#0A0A0A] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#262626] px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-[#FAFAFA]">
            Your scenarios
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#A3A3A3] hover:text-[#FAFAFA]"
            aria-label="Close scenarios drawer"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {scenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="text-sm font-medium text-[#FAFAFA]">
                No scenarios saved yet.
              </div>
              <p className="max-w-xs text-xs text-[#A3A3A3] leading-relaxed">
                Drag any slider on the calculator and your first scenario
                auto-saves as &quot;Untitled 1&quot;. You can rename, fork,
                or delete it anytime.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {scenarios.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-[#262626] bg-[#141414] p-4"
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <div className="truncate text-sm font-medium text-[#FAFAFA]">
                      {s.name}
                    </div>
                    <div className="shrink-0 text-xs text-[#10B981]">
                      {Number.isFinite(s.freedomAge) && s.freedomAge > 0
                        ? `freedom at ${Math.round(s.freedomAge)}`
                        : '—'}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-[#525252]">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoad(s)}
                      className="inline-flex h-7 items-center rounded-full bg-[#10B981] px-3 text-[11px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#10B981]/90"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFork(s.id)}
                      className="inline-flex h-7 items-center rounded-full border border-[#262626] bg-[#0A0A0A] px-3 text-[11px] font-medium text-[#A3A3A3] transition-colors hover:bg-[#141414] hover:text-[#FAFAFA]"
                    >
                      Fork
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="ml-auto text-[11px] text-[#525252] hover:text-[#EF4444]"
                      aria-label={`Delete ${s.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.aside>
    </>
  );
}
