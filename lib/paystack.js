/**
 * Paystack secret key validation for server-side verify calls.
 * Vercel must set PAYSTACK_SECRET_KEY to sk_test_... or sk_live_... (never pk_...).
 */

export function getPaystackSecretStatus() {
  const raw = process.env.PAYSTACK_SECRET_KEY;
  if (!raw?.trim()) {
    return {
      configured: false,
      valid: false,
      mode: null,
      reason: 'PAYSTACK_SECRET_KEY is not set (Vercel → Settings → Environment Variables).',
    };
  }

  const secret = raw.trim();

  if (secret.startsWith('pk_')) {
    return {
      configured: true,
      valid: false,
      mode: secret.startsWith('pk_live_') ? 'live' : 'test',
      reason:
        'PAYSTACK_SECRET_KEY is a public key (pk_...). Use the Secret Key (sk_...) from Paystack → Settings → API Keys.',
    };
  }

  if (secret.startsWith('sk_')) {
    const mode = secret.startsWith('sk_live_') ? 'live' : 'test';
    return { configured: true, valid: true, mode, reason: null };
  }

  return {
    configured: true,
    valid: false,
    mode: null,
    reason: 'PAYSTACK_SECRET_KEY must start with sk_test_ or sk_live_.',
  };
}

/** @throws {Error & { code?: string }} */
export function getPaystackSecret() {
  const status = getPaystackSecretStatus();
  if (!status.valid) {
    const err = new Error(status.reason ?? 'Invalid Paystack secret key');
    err.code = 'PAYSTACK_SECRET_INVALID';
    throw err;
  }
  return process.env.PAYSTACK_SECRET_KEY.trim();
}
