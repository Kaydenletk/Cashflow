/**
 * lib/firebase/client.ts
 *
 * Firebase Web SDK initialization for client components and API routes
 * that do NOT need admin privileges.
 *
 * SSR NOTE: getAnalytics() is intentionally omitted — it crashes on the server
 * because it relies on browser APIs (window, document). If analytics is needed,
 * lazy-import it in a client component behind `typeof window !== 'undefined'`.
 *
 * Admin SDK (firebase-admin) lives in lib/firebase/admin.ts — Phase 2.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Read each NEXT_PUBLIC_FIREBASE_* as a LITERAL property access so Next's
// bundler inlines the values into the client bundle at build time. Dynamic
// access (e.g. process.env[key] inside a loop) does NOT get inlined and
// produces `undefined` in the browser even when the value is set in .env.local.
// See: https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

// Fail fast on missing config. Firebase does NOT validate config at init time —
// a missing apiKey/projectId silently produces a broken app that only fails
// at first read/write with a cryptic network error. Surface the problem here.
if (!apiKey || !projectId) {
  throw new Error(
    `[firebase/client] Missing required env var: ` +
      `${!apiKey ? 'NEXT_PUBLIC_FIREBASE_API_KEY' : 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'}. ` +
      `Copy .env.example → .env.local and fill in your Firebase web config, then restart the dev server.`,
  );
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export default app;
