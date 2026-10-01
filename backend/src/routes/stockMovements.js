import { Router } from 'express';
import { query } from '../db.js';
import { requireRole, ROLES } from '../middleware/auth.js';
import { pagination, toDate } from '../lib/validate.js';

const router = Router();
router.use(requireRole(ROLES.ADMIN, ROLES.KHO));

router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.MaSanPham) { where.push('ls.MaSanPham = ?'); params.push(req.query.MaSanPham); }
  if (req.query.LoaiBienDong) { where.push('ls.LoaiBienDong = ?'); params.push(req.query.LoaiBienDong); }
  if (req.query.tuNgay) { where.push('ls.NgayBienDong >= ?'); params.push(toDate(req.query.tuNgay, 'Từ ngày')); }
  if (req.query.denNgay) {
    where.push('ls.NgayBienDong < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(toDate(req.query.denNgay, 'Đến ngày'));
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const { page, pageSize, offset } = pagination(req.query);
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM LichSuBienDong ls ${whereSql}`, params);
  const items = await query(
    `SELECT ls.*, sp.MaSKU, sp.TenSanPham, nd.HoTen AS TenNguoiDung
       FROM LichSuBienDong ls
       JOIN SanPham sp ON sp.MaSanPham = ls.MaSanPham
       JOIN NguoiDung nd ON nd.MaNguoiDung = ls.MaNguoiDung
       ${whereSql}
      ORDER BY ls.NgayBienDong DESC, ls.MaBienDong DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  res.json({ items, total, page, pageSize });
});

export default router;
