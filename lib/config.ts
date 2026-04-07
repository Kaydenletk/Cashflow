/**
 * lib/config.ts
 *
 * Phase 3 single-user constant. The whole app runs against this hardcoded
 * user ID until Phase 2 (Auth) lands. When that happens, every Firestore
 * helper that imports PERSONAL_USER_ID will be migrated to read the real
 * `auth.currentUser.uid` instead — see the spec §10 migration path.
 */

export const PERSONAL_USER_ID = 'personal' as const;
