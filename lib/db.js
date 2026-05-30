import { neon } from '@neondatabase/serverless';
import { assertProductionEnv } from './env.js';

let sql;
let ready = false;

export function getSql() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function ensureDb() {
  if (ready) return getSql();
  assertProductionEnv();
  const db = getSql();

  await db`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      package_id TEXT UNIQUE NOT NULL,
      network TEXT NOT NULL,
      size TEXT NOT NULL,
      validity TEXT NOT NULL,
      price NUMERIC NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      network TEXT NOT NULL,
      package TEXT NOT NULL,
      price NUMERIC NOT NULL,
      service_fee NUMERIC NOT NULL,
      total NUMERIC NOT NULL,
      recipient_phone TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      paystack_reference TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      notice_id TEXT UNIQUE NOT NULL,
      message TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS promo_slides (
      slide_index INTEGER PRIMARY KEY CHECK (slide_index >= 1 AND slide_index <= 3),
      title TEXT NOT NULL,
      headline TEXT NOT NULL,
      background_color TEXT NOT NULL DEFAULT '#2563eb',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      business_name TEXT NOT NULL DEFAULT 'MATOE CONNECT',
      whatsapp_order_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
      network_states JSONB NOT NULL DEFAULT '{"MTN":"active","AirtelTigo":"disabled","Telecel":"disabled"}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const migrations = [
    db`ALTER TABLE packages ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true`,
    db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paystack_reference TEXT`,
    db`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS network_states JSONB NOT NULL DEFAULT '{"MTN":"active","AirtelTigo":"disabled","Telecel":"disabled"}'::jsonb`,
    db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    db`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS whatsapp_support_number TEXT NOT NULL DEFAULT '233534764068'`,
  ];
  for (const [index, migration] of migrations.entries()) {
    try {
      await migration;
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'warn',
          context: 'ensureDb.migration',
          migration_index: index,
          error: err?.message ?? String(err),
        })
      );
    }
  }

  await db`
    INSERT INTO site_settings (id, business_name, whatsapp_order_reminder_enabled, network_states)
    VALUES (
      1,
      'MATOE CONNECT',
      true,
      '{"MTN":"active","AirtelTigo":"disabled","Telecel":"disabled"}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING
  `;

  const promoDefaults = [
    { slide_index: 1, title: 'TELECEL PROMO', headline: 'Fast & Reliable Data Plans', background_color: '#2563eb' },
    { slide_index: 2, title: 'MTN SPECIAL', headline: 'Affordable Non-Expiry Bundles', background_color: '#d97706' },
    { slide_index: 3, title: '24/7 SERVICE', headline: 'Buy Data Anytime, Anywhere', background_color: '#059669' },
  ];
  for (const slide of promoDefaults) {
    await db`
      INSERT INTO promo_slides (slide_index, title, headline, background_color)
      VALUES (${slide.slide_index}, ${slide.title}, ${slide.headline}, ${slide.background_color})
      ON CONFLICT (slide_index) DO NOTHING
    `;
  }

  ready = true;
  return db;
}

export async function lookupPackagePrice(db, network, size) {
  const rows = await db`
    SELECT price FROM packages
    WHERE network = ${network} AND size = ${size} AND active = true
    LIMIT 1
  `;
  if (!rows.length) return null;
  return Number(rows[0].price);
}
