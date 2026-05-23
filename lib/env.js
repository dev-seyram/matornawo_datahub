export function assertProductionEnv() {
  if (process.env.VERCEL_ENV !== 'production') {
    return;
  }
  const required = [
    'DATABASE_URL',
    'ADMIN_PASSWORD',
    'ADMIN_SESSION_SECRET',
    'PAYSTACK_SECRET_KEY',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
