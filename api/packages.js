import { setCorsHeaders, requireAdmin, isAdminRequest } from '../lib/adminAuth.js';
import { ensureDb } from '../lib/db.js';
import { sendError } from '../lib/apiError.js';
import { validateNetwork } from '../lib/validate.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await ensureDb();

    if (req.method === 'GET') {
      const packages = isAdminRequest(req)
        ? await db`SELECT * FROM packages ORDER BY network, price ASC`
        : await db`
            SELECT * FROM packages
            WHERE active = true
            ORDER BY network, price ASC
          `;
      return res.status(200).json(packages);
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const { package_id, network, size, validity, price } = req.body ?? {};
      const validNetwork = validateNetwork(network);
      const pkgSize = String(size ?? '').trim();
      const pkgValidity = String(validity ?? '').trim();
      const pkgPrice = Number(price);
      if (!package_id || !validNetwork || !pkgSize || !pkgValidity || !Number.isFinite(pkgPrice) || pkgPrice <= 0) {
        return res.status(400).json({ error: 'Invalid package payload' });
      }

      const result = await db`
        INSERT INTO packages (package_id, network, size, validity, price, active)
        VALUES (${package_id}, ${validNetwork}, ${pkgSize}, ${pkgValidity}, ${pkgPrice}, true)
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (req.method === 'PATCH') {
      if (!requireAdmin(req, res)) return;
      const { package_id, size, validity, price } = req.body ?? {};
      const pkgSize = String(size ?? '').trim();
      const pkgValidity = String(validity ?? '').trim();
      const pkgPrice = Number(price);
      if (!package_id || !pkgSize || !pkgValidity || !Number.isFinite(pkgPrice) || pkgPrice <= 0) {
        return res.status(400).json({ error: 'Invalid package update payload' });
      }

      const result = await db`
        UPDATE packages
        SET size = ${pkgSize}, validity = ${pkgValidity}, price = ${pkgPrice}, updated_at = NOW()
        WHERE package_id = ${package_id}
        RETURNING *
      `;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Package not found' });
      }
      return res.status(200).json(result[0]);
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const { package_id } = req.body ?? {};
      if (!package_id) {
        return res.status(400).json({ error: 'package_id is required' });
      }
      await db`
        UPDATE packages SET active = false, updated_at = NOW()
        WHERE package_id = ${package_id}
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return sendError(res, error, 'packages');
  }
}
