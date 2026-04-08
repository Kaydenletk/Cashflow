/**
 * lib/firebase/dedupe.test.ts
 *
 * Verifies the dedup hash is:
 *   1. Deterministic — same inputs → same hash
 *   2. Sensitive to cents-level amount differences
 *   3. Sensitive to date
 *   4. Whitespace-insensitive for merchant (internal normalization)
 *   5. Case-insensitive for merchant
 *   6. Fixed length (64 hex chars, SHA-256)
 */

import { describe, it, expect } from 'vitest';

import { hashTransaction, hashMerchantKey } from './dedupe';

describe('hashTransaction', () => {
  it('returns a 64-char hex string', async () => {
    const hash = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL DES:INST XFER',
    );
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable for identical inputs', async () => {
    const a = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL DES:INST XFER',
    );
    const b = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL DES:INST XFER',
    );
    expect(a).toBe(b);
  });

  it('collapses merchant whitespace differences', async () => {
    const a = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL  DES:INST  XFER',
    );
    const b = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL DES:INST XFER',
    );
    expect(a).toBe(b);
  });

  it('is case-insensitive for merchant', async () => {
    const a = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL DES:INST XFER',
    );
    const b = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'paypal des:inst xfer',
    );
    expect(a).toBe(b);
  });

  it('distinguishes by cent-level amount differences', async () => {
    const a = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL',
    );
    const b = await hashTransaction(
      new Date('2026-01-14'),
      -31.12,
      'PAYPAL',
    );
    expect(a).not.toBe(b);
  });

  it('distinguishes by date', async () => {
    const a = await hashTransaction(
      new Date('2026-01-14'),
      -31.11,
      'PAYPAL',
    );
    const b = await hashTransaction(
      new Date('2026-01-15'),
      -31.11,
      'PAYPAL',
    );
    expect(a).not.toBe(b);
  });

  it('distinguishes positive from negative amounts', async () => {
    const a = await hashTransaction(new Date('2026-01-14'), 31.11, 'PAYPAL');
    const b = await hashTransaction(new Date('2026-01-14'), -31.11, 'PAYPAL');
    expect(a).not.toBe(b);
  });

  it('is immune to floating-point drift (rounds to cents)', async () => {
    const a = await hashTransaction(new Date('2026-01-14'), 19.99, 'COFFEE');
    const b = await hashTransaction(
      new Date('2026-01-14'),
      19.990000000000002, // classic float drift
      'COFFEE',
    );
    expect(a).toBe(b);
  });
});

describe('hashMerchantKey', () => {
  it('returns a stable 64-char hex hash', async () => {
    const a = await hashMerchantKey('SCHWAB BROKERAGE DES:MONEYLINK');
    const b = await hashMerchantKey('SCHWAB BROKERAGE DES:MONEYLINK');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('collapses whitespace and case', async () => {
    const a = await hashMerchantKey('SCHWAB  BROKERAGE');
    const b = await hashMerchantKey('schwab brokerage');
    expect(a).toBe(b);
  });

  it('truncates to 120 characters before hashing (long merchants)', async () => {
    const base = 'ALPHA BETA GAMMA DELTA EPSILON ZETA ETA THETA IOTA KAPPA LAMBDA MU NU XI OMICRON PI RHO SIGMA TAU UPSILON PHI CHI PSI OMEGA';
    const longer = base + ' EXTRA SUFFIX THAT FALLS OFF';
    // Both strings share the first 120 chars once normalized; hashes match.
    const a = await hashMerchantKey(base);
    const b = await hashMerchantKey(longer);
    expect(a).toBe(b);
  });
});
