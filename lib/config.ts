/**
 * lib/config.ts
 *
 * App-wide constants. User scope is NOT stored here — every Firestore helper
 * takes `userId` as an explicit parameter, and client code gets it from
 * `useAuth().user?.uid` (see lib/hooks/use-auth.ts).
 *
 * This file is intentionally thin. Add feature flags or tunables here as
 * the product grows; avoid dumping random constants.
 */

export const APP_NAME = 'compound' as const;
