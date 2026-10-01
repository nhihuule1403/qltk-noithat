import express, { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { crudRouter } from '../lib/crud.js';
import { requireRole, ROLES } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { parseCsv } from '../lib/csv.js';

const { ADMIN, BANHANG } = ROLES;
const router = Router();

/**
 * Import danh sách khách hàng từ CSV (UTF-8), cột: TenKhachHang, SoDienThoai, DiaChi.
 * Làm sạch khoảng trắng, bỏ dòng thiếu tên, bỏ khách trùng số điện thoại
 * (trùng trong file hoặc đã có trong CSDL) – tương đương BULK INSERT + bảng tạm ở báo cáo.
 */
router.post('/import', requireRole(ADMIN, BANHANG), express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }), async (req, res) => {
  if (typeof req.body !== 'string' || !req.body.trim()) throw new HttpError(400, 'File CSV rỗng');
  const rows = parseCsv(req.body);
  const header = rows.shift().map((h) => h.trim());
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const [iTen, iSdt, iDiaChi] = [idx('TenKhachHang'), idx('SoDienThoai'), idx('DiaChi')];
  if (iTen < 0) throw new HttpError(400, 'File CSV phải có cột TenKhachHang');

  const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
  const existing = new Set(
    (await query('SELECT SoDienThoai FROM KhachHang WHERE SoDienThoai IS NOT NULL')).map((r) => r.SoDienThoai),
  );

  const toInsert = [];
  const skipped = [];
  rows.forEach((r, i) => {
    const ten = clean(r[iTen]);
    const sdt = iSdt >= 0 ? clean(r[iSdt]).replace(/[^\d+]/g, '') || null : null;
    const diaChi = iDiaChi >= 0 ? clean(r[iDiaChi]) || null : null;
    const line = i + 2;
    if (!ten) return skipped.push({ dong: line, lyDo: 'Thiếu tên khách hàng' });
    if (sdt && existing.has(sdt)) return skipped.push({ dong: line, lyDo: `Trùng số điện thoại ${sdt}` });
    if (sdt) existing.add(sdt);
    toInsert.push([ten.slice(0, 200), sdt, diaChi?.slice(0, 300) ?? null]);
  });

  if (toInsert.length) {
    await withTransaction((conn) =>
      conn.query('INSERT INTO KhachHang (TenKhachHang, SoDienThoai, DiaChi) VALUES ?', [toInsert]),
    );
  }
  res.json({ daThem: toInsert.length, boQua: skipped });
});

router.use(
  crudRouter({
    table: 'KhachHang', pk: 'MaKhachHang', label: 'Khách hàng', orderBy: 'MaKhachHang',
    fields: {
      TenKhachHang: { label: 'Tên khách hàng', required: true, max: 200 },
      SoDienThoai: { label: 'Số điện thoại', max: 20 },
      DiaChi: { label: 'Địa chỉ', max: 300 },
    },
    search: ['TenKhachHang', 'SoDienThoai'],
    roles: { read: [ADMIN, BANHANG], write: [ADMIN, BANHANG], delete: [ADMIN] },
  }),
);

export default router;
