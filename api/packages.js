import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      package_id TEXT UNIQUE NOT NULL,
      network TEXT NOT NULL,
      size TEXT NOT NULL,
      validity TEXT NOT NULL,
      price NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

async function seedDefaultPackages() {
  const existing = await sql`SELECT COUNT(*) as count FROM packages`;
  if (parseInt(existing[0].count) > 0) return;

  const defaultPackages = [
    { package_id: 'mtn-1gb', network: 'MTN', size: '1GB', validity: 'Non Expiry', price: 4.50 },
    { package_id: 'mtn-2gb', network: 'MTN', size: '2GB', validity: 'Non Expiry', price: 9.00 },
    { package_id: 'mtn-3gb', network: 'MTN', size: '3GB', validity: 'Non Expiry', price: 13.00 },
    { package_id: 'mtn-4gb', network: 'MTN', size: '4GB', validity: 'Non Expiry', price: 17.00 },
    { package_id: 'mtn-5gb', network: 'MTN', size: '5GB', validity: 'Non Expiry', price: 21.00 },
    { package_id: 'mtn-6gb', network: 'MTN', size: '6GB', validity: 'Non Expiry', price: 25.00 },
    { package_id: 'mtn-7gb', network: 'MTN', size: '7GB', validity: 'Non Expiry', price: 29.00 },
    { package_id: 'mtn-8gb', network: 'MTN', size: '8GB', validity: 'Non Expiry', price: 33.50 },
    { package_id: 'mtn-9gb', network: 'MTN', size: '9GB', validity: 'Non Expiry', price: 38.00 },
    { package_id: 'mtn-10gb', network: 'MTN', size: '10GB', validity: 'Non Expiry', price: 40.00 },
    { package_id: 'mtn-12gb', network: 'MTN', size: '12GB', validity: 'Non Expiry', price: 49.00 },
    { package_id: 'mtn-15gb', network: 'MTN', size: '15GB', validity: 'Non Expiry', price: 60.00 },
    { package_id: 'mtn-20gb', network: 'MTN', size: '20GB', validity: 'Non Expiry', price: 80.00 },
    { package_id: 'mtn-25gb', network: 'MTN', size: '25GB', validity: 'Non Expiry', price: 98.00 },
    { package_id: 'mtn-30gb', network: 'MTN', size: '30GB', validity: 'Non Expiry', price: 112.00 },
    { package_id: 'mtn-40gb', network: 'MTN', size: '40GB', validity: 'Non Expiry', price: 156.00 },
    { package_id: 'mtn-50gb', network: 'MTN', size: '50GB', validity: 'Non Expiry', price: 190.00 },
    { package_id: 'mtn-100gb', network: 'MTN', size: '100GB', validity: 'Non Expiry', price: 379.00 }
  ];

  for (const pkg of defaultPackages) {
    await sql`
      INSERT INTO packages (package_id, network, size, validity, price)
      VALUES (${pkg.package_id}, ${pkg.network}, ${pkg.size}, ${pkg.validity}, ${pkg.price})
      ON CONFLICT (package_id) DO NOTHING
    `;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDB();
    await seedDefaultPackages();

    // GET - fetch all packages for storefront and admin
    if (req.method === 'GET') {
      const packages = await sql`
        SELECT * FROM packages ORDER BY network, price ASC
      `;
      return res.status(200).json(packages);
    }

    // POST - add new package from admin panel
    if (req.method === 'POST') {
      const { package_id, network, size, validity, price } = req.body;
      const result = await sql`
        INSERT INTO packages (package_id, network, size, validity, price)
        VALUES (${package_id}, ${network}, ${size}, ${validity}, ${price})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    // PATCH - update existing package price or details from admin panel
    if (req.method === 'PATCH') {
      const { package_id, size, validity, price } = req.body;
      const result = await sql`
        UPDATE packages
        SET size = ${size}, validity = ${validity}, price = ${price}, updated_at = NOW()
        WHERE package_id = ${package_id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    // DELETE - remove a package from admin panel
    if (req.method === 'DELETE') {
      const { package_id } = req.body;
      await sql`DELETE FROM packages WHERE package_id = ${package_id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message });
  }
}
