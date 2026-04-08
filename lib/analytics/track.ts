/**
 * lib/analytics/track.ts
 *
 * Thin analytics wrapper. No-ops in development (console.debug only),
 * calls Amplitude in production once wired. This file exists so every
 * Phase E call site can instrument engagement without blocking on
 * Amplitude project setup — Phase F can replace the no-op body without
 * touching a single call site.
 *
 * Four events track the key interactions on the landing page:
 *
 *   landing_scenario_changed — debounced 2s, fires when the user has
 *     stopped dragging. Props: freedomAge, currentAge. Tells us the
 *     depth of first-visit engagement.
 *
 *   landing_scenario_saved — fires on save-button click. Props: name.
 *     Tells us which users cross the "I care enough to name this"
 *     threshold (IKEA effect activation).
 *
 *   landing_scenario_shared — fires on share-button click. Tells us
 *     the share loop activation rate. Return visits from a shared URL
 *     are attributed via the URL state itself.
 *
 *   landing_template_clicked — fires when a life event template card
 *     is opened. Props: templateId. Tells us which templates resonate
 *     so Phase F can prioritize the next batch.
 *
 * Usage:
 *   import { track } from '@/lib/analytics/track';
 *   track('landing_scenario_saved', { name: 'Plan A' });
 */

export type AnalyticsEventName =
  | 'landing_scenario_changed'
  | 'landing_scenario_saved'
  | 'landing_scenario_shared'
  | 'landing_template_clicked';

export type AnalyticsProps = Record<string, string | number | boolean>;

/**
 * Fire an analytics event. No-op in development (logs to console for
 * debugging). In production, wire to Amplitude via the Amplitude MCP
 * integration once the project ID is provisioned.
 */
export function track(event: AnalyticsEventName, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') {
    // SSR safety — analytics only fire in the browser.
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    // Dev: log so we can watch events while smoke-testing.
    console.debug('[analytics]', event, props ?? {});
    return;
  }

  // Production: Amplitude hook point. Phase F will replace this with:
  //   import { track as amplitudeTrack } from '@amplitude/analytics-browser';
  //   amplitudeTrack(event, props);
  // For now, silent no-op in prod so we never break a shipped build.
}
