# Matornawo Datahub

Affordable mobile data bundles for Ghana. Buy MTN, AirtelTigo, and Telecel data instantly.

## Live site

[https://matoe.store](https://matoe.store)

## Local development

1. Copy [`.env.example`](.env.example) to `.env` and fill in required values (`DATABASE_URL`, Paystack keys, admin credentials).
2. Install dependencies: `npm install`
3. Run the Vite dev server: `npm run dev`
4. API routes under `/api` are intended for [Vercel](https://vercel.com) serverless deployment with Neon Postgres.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Node unit tests (`lib/orderTrack`, `lib/validate`) |

## Deploy

Deploy to Vercel (or similar) with environment variables from `.env.example`. Set `VITE_PAYSTACK_PUBLIC_KEY` at build time and `PAYSTACK_SECRET_KEY` only on the server.

Public order tracking (`GET /api/orders?order_id=…` or `?phone=…`) is rate-limited in memory (30 requests per IP per minute). On serverless this is best-effort per instance—not a global cap. Use Redis/KV if you need strict cluster-wide limits.

## Assets

- `public/favicon.svg` — site icon (vector mark; run `npm run generate-favicons` for PNG/ICO fallbacks). Do not use the full 3D `favicon-source.png` for tab icons.
- `public/og-source.png` — master hero; run `npm run generate-og-image` → `og-image.jpg` (WhatsApp-friendly, &lt;300 KB) + `og-image.png`

## Contact

WhatsApp support number is configurable in **Admin → Settings** (default `233534764068`).
