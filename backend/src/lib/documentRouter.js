import { Router } from 'express';
import { pool, query, queryOne, withTransaction } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { HttpError, notFound } from './errors.js';
import { pagination, toDate, toInt } from './validate.js';

/**
 * Router dùng chung cho 3 loại chứng từ (phiếu nhập, hóa đơn, phiếu kiểm kê):
 * danh sách, chi tiết, tạo, sửa thông tin chung, thêm / sửa / xóa dòng, xác nhận, hủy.
 * Toàn bộ kiểm tra trạng thái và cập nhật tồn kho nằm ở trigger / stored procedure.
 */
export function documentRouter(cfg) {
  const router = Router();
  router.use(requireRole(...cfg.roles));

  const loadDocument = async (id) => {
    const doc = await queryOne(`${cfg.selectHeader} WHERE d.${cfg.pk} = ?`, [id]);
    if (!doc) throw notFound(cfg.label);
    doc.ChiTiet = await query(`${cfg.selectLines} WHERE ct.${cfg.pk} = ? ORDER BY ct.${cfg.linePk}`, [id]);
    return doc;
  };

  const assertLineBelongs = async (id, lineId) => {
    const row = await queryOne(`SELECT 1 FROM ${cfg.lineTable} WHERE ${cfg.linePk} = ? AND ${cfg.pk} = ?`, [lineId, id]);
    if (!row) throw notFound('Dòng chi tiết');
  };

  router.get('/', async (req, res) => {
    const where = [];
    const params = [];
    if (req.query.TrangThai) {
      where.push('d.TrangThai = ?');
      params.push(req.query.TrangThai);
    }
    if (req.query.tuNgay) {
      where.push(`d.${cfg.dateCol} >= ?`);
      params.push(toDate(req.query.tuNgay, 'Từ ngày'));
    }
    if (req.query.denNgay) {
      where.push(`d.${cfg.dateCol} < DATE_ADD(?, INTERVAL 1 DAY)`);
      params.push(toDate(req.query.denNgay, 'Đến ngày'));
    }
    for (const f of cfg.filters ?? []) {
      if (req.query[f]) {
        where.push(`d.${f} = ?`);
        params.push(req.query[f]);
      }
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { pageSize, offset, page } = pagination(req.query);
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM ${cfg.table} d ${whereSql}`, params);
    const items = await query(
      `${cfg.selectHeader} ${whereSql} ORDER BY d.${cfg.pk} DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    res.json({ items, total, page, pageSize });
  });

  router.get('/:id', async (req, res) => {
    res.json(await loadDocument(req.params.id));
  });

  // Tạo chứng từ Nháp (có thể kèm danh sách dòng)
  router.post('/', async (req, res) => {
    const header = cfg.readHeader(req.body);
    const cols = Object.keys(header);
    const id = await withTransaction(async (conn) => {
      const [result] = await conn.query(
        `INSERT INTO ${cfg.table} (${[...cols, 'MaNguoiDung'].join(', ')}) VALUES (${[...cols, 'MaNguoiDung'].map(() => '?').join(', ')})`,
        [...cols.map((c) => header[c]), req.user.id],
      );
      if (cfg.afterCreate) await cfg.afterCreate(conn, result.insertId, req.body);
      for (const line of req.body.ChiTiet ?? []) await cfg.addLine(conn, result.insertId, line);
      return result.insertId;
    });
    res.status(201).json(await loadDocument(id));
  });

  router.put('/:id', async (req, res) => {
    const header = cfg.readHeader(req.body);
    const cols = Object.keys(header);
    const result = await query(
      `UPDATE ${cfg.table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${cfg.pk} = ?`,
      [...cols.map((c) => header[c]), req.params.id],
    );
    if (!result.affectedRows) throw notFound(cfg.label);
    res.json(await loadDocument(req.params.id));
  });

  router.post('/:id/lines', async (req, res) => {
    await cfg.addLine(pool, toInt(req.params.id, `Mã ${cfg.label.toLowerCase()}`), req.body);
    res.status(201).json(await loadDocument(req.params.id));
  });

  // Lưu nhiều dòng một lần (dùng cho bảng nhập liệu)
  router.put('/:id/lines', async (req, res) => {
    if (!Array.isArray(req.body)) throw new HttpError(400, 'Dữ liệu phải là danh sách dòng');
    await withTransaction(async (conn) => {
      for (const line of req.body) {
        const lineId = toInt(line[cfg.linePk], 'Mã dòng');
        const data = cfg.readLineUpdate(line);
        const cols = Object.keys(data);
        const [r] = await conn.query(
          `UPDATE ${cfg.lineTable} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${cfg.linePk} = ? AND ${cfg.pk} = ?`,
          [...cols.map((c) => data[c]), lineId, req.params.id],
        );
        if (!r.affectedRows) throw notFound('Dòng chi tiết');
      }
    });
    res.json(await loadDocument(req.params.id));
  });

  router.put('/:id/lines/:lineId', async (req, res) => {
    await assertLineBelongs(req.params.id, req.params.lineId);
    const data = cfg.readLineUpdate(req.body);
    const cols = Object.keys(data);
    await query(
      `UPDATE ${cfg.lineTable} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${cfg.linePk} = ?`,
      [...cols.map((c) => data[c]), req.params.lineId],
    );
    res.json(await loadDocument(req.params.id));
  });

  router.delete('/:id/lines/:lineId', async (req, res) => {
    await assertLineBelongs(req.params.id, req.params.lineId);
    await query(`DELETE FROM ${cfg.lineTable} WHERE ${cfg.linePk} = ?`, [req.params.lineId]);
    res.json(await loadDocument(req.params.id));
  });

  router.post('/:id/confirm', async (req, res) => {
    await query(`CALL ${cfg.confirmProc}(?, ?)`, [toInt(req.params.id, 'Mã chứng từ'), req.user.id]);
    res.json(await loadDocument(req.params.id));
  });

  router.post('/:id/cancel', async (req, res) => {
    await query('CALL sp_HuyChungTu(?, ?, ?)', [cfg.loai, toInt(req.params.id, 'Mã chứng từ'), req.user.id]);
    res.json(await loadDocument(req.params.id));
  });

  return router;
}

// Cột chung của phần đầu chứng từ: người lập, người xác nhận
export const userColumns = `
  nl.HoTen AS TenNguoiLap, xn.HoTen AS TenNguoiXacNhan`;
export const userJoins = `
  JOIN NguoiDung nl ON nl.MaNguoiDung = d.MaNguoiDung
  LEFT JOIN NguoiDung xn ON xn.MaNguoiDung = d.NguoiXacNhan`;
