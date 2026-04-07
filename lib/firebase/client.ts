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

// Fail fast on missing config. Firebase does NOT validate config at init time —
// a missing apiKey/projectId silently produces a broken app that only fails
// at first read/write with a cryptic network error. Surface the problem here.
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
] as const;

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(
      `[firebase/client] Missing required env var: ${key}. ` +
        `Copy .env.example → .env.local and fill in your Firebase web config.`,
    );
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export default app;
