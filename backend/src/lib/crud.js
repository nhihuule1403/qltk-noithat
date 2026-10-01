import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { notFound, HttpError } from './errors.js';
import { toStr } from './validate.js';

/**
 * Router CRUD cho các bảng danh mục đơn giản.
 * fields: { TenCot: { label, required, max } }
 * search: các cột dùng cho tham số ?q=
 */
export function crudRouter({ table, pk, label, fields, search = [], orderBy, roles }) {
  const router = Router();
  const columns = Object.keys(fields);

  const readBody = (body, partial = false) => {
    const data = {};
    for (const [col, opt] of Object.entries(fields)) {
      if (partial && !(col in body)) continue;
      data[col] = toStr(body[col], opt.label, { required: opt.required, max: opt.max });
    }
    if (!Object.keys(data).length) throw new HttpError(400, 'Không có dữ liệu cập nhật');
    return data;
  };

  router.get('/', requireRole(...roles.read), async (req, res) => {
    const params = [];
    let where = '';
    if (req.query.q && search.length) {
      where = 'WHERE ' + search.map((c) => `${c} LIKE ?`).join(' OR ');
      search.forEach(() => params.push(`%${req.query.q}%`));
    }
    res.json(await query(`SELECT * FROM ${table} ${where} ORDER BY ${orderBy || pk}`, params));
  });

  router.get('/:id', requireRole(...roles.read), async (req, res) => {
    const row = await queryOne(`SELECT * FROM ${table} WHERE ${pk} = ?`, [req.params.id]);
    if (!row) throw notFound(label);
    res.json(row);
  });

  router.post('/', requireRole(...roles.write), async (req, res) => {
    const data = readBody(req.body);
    const result = await query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((c) => data[c]),
    );
    res.status(201).json(await queryOne(`SELECT * FROM ${table} WHERE ${pk} = ?`, [result.insertId]));
  });

  router.put('/:id', requireRole(...roles.write), async (req, res) => {
    const data = readBody(req.body, true);
    const cols = Object.keys(data);
    const result = await query(
      `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${pk} = ?`,
      [...cols.map((c) => data[c]), req.params.id],
    );
    if (!result.affectedRows) throw notFound(label);
    res.json(await queryOne(`SELECT * FROM ${table} WHERE ${pk} = ?`, [req.params.id]));
  });

  router.delete('/:id', requireRole(...roles.delete), async (req, res) => {
    const result = await query(`DELETE FROM ${table} WHERE ${pk} = ?`, [req.params.id]);
    if (!result.affectedRows) throw notFound(label);
    res.status(204).end();
  });

  return router;
}
