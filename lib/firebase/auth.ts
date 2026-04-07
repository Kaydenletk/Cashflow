/**
 * lib/firebase/auth.ts
 *
 * Thin wrapper around Firebase Auth Web SDK. Google OAuth is the ONLY
 * supported sign-in method for the Compound MVP — no email/password, no
 * anonymous auth. This keeps the surface area small and matches the
 * "premium, low-friction" positioning (one-click sign in).
 *
 * All functions are client-side. API routes don't verify tokens here —
 * Firestore security rules enforce tenancy at the database layer.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import { auth } from '@/lib/firebase/client';

const googleProvider = new GoogleAuthProvider();

/**
 * Open the Google sign-in popup. Returns the authenticated user on success.
 * Throws if the user closes the popup or denies access.
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign the current user out. Idempotent — safe to call when already signed out.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 * The callback fires immediately with the current user (or null).
 */
export function onAuthChange(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}
