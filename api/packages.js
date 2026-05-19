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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDB();

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
