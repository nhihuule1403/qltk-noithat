import { Router } from 'express';
import { pool, query, queryOne } from '../db.js';
import { requireRole, ROLES } from '../middleware/auth.js';
import { notFound } from '../lib/errors.js';
import { toInt, toNumber, toStr } from '../lib/validate.js';

const { ADMIN, KHO, BANHANG } = ROLES;
const router = Router();

const SELECT_PRODUCT = `
  SELECT sp.*, dm.TenDanhMuc, dv.TenDonVi,
         (sp.SoLuongTon <= sp.MucTonToiThieu) AS TonThap
    FROM SanPham sp
    JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
    JOIN DonViTinh dv ON dv.MaDonVi = sp.MaDonVi`;

// Tra cứu theo tên / SKU / danh mục, lọc trạng thái và tồn thấp
router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.q) {
    where.push('(sp.TenSanPham LIKE ? OR sp.MaSKU LIKE ?)');
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  if (req.query.MaDanhMuc) {
    where.push('sp.MaDanhMuc = ?');
    params.push(req.query.MaDanhMuc);
  }
  if (req.query.TrangThai !== undefined && req.query.TrangThai !== '') {
    where.push('sp.TrangThai = ?');
    params.push(Number(req.query.TrangThai));
  }
  if (req.query.tonThap === 'true') where.push('sp.SoLuongTon <= sp.MucTonToiThieu');
  const sql = `${SELECT_PRODUCT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY sp.MaSKU`;
  res.json(await query(sql, params));
});

router.get('/:id', async (req, res) => {
  const row = await queryOne(`${SELECT_PRODUCT} WHERE sp.MaSanPham = ?`, [req.params.id]);
  if (!row) throw notFound('Sản phẩm');
  res.json(row);
});

// F2: tồn tại thời điểm bất kỳ
router.get('/:id/stock-at', requireRole(ADMIN, KHO, BANHANG), async (req, res) => {
  const time = toStr(req.query.time, 'Thời điểm', { required: true });
  const row = await queryOne('SELECT fn_TonKhoTaiThoiDiem(?, ?) AS SoLuongTon', [req.params.id, time]);
  res.json({ MaSanPham: Number(req.params.id), ThoiDiem: time, SoLuongTon: row.SoLuongTon });
});

// SP1: thêm sản phẩm (tồn ban đầu = 0)
router.post('/', requireRole(ADMIN), async (req, res) => {
  const b = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_ThemSanPham(?, ?, ?, ?, ?, ?, @MaMoi)', [
      toStr(b.TenSanPham, 'Tên sản phẩm', { required: true, max: 200 }),
      toStr(b.MaSKU, 'Mã SKU', { required: true, max: 50 }),
      toInt(b.MaDanhMuc, 'Danh mục'),
      toInt(b.MaDonVi, 'Đơn vị tính'),
      toNumber(b.GiaBan, 'Giá bán'),
      toInt(b.MucTonToiThieu ?? 0, 'Mức tồn tối thiểu', { min: 0 }),
    ]);
    const [[{ id }]] = await conn.query('SELECT @MaMoi AS id');
    res.status(201).json(await queryOne(`${SELECT_PRODUCT} WHERE sp.MaSanPham = ?`, [id]));
  } finally {
    conn.release();
  }
});

// Sửa thông tin sản phẩm (không sửa được SoLuongTon)
router.put('/:id', requireRole(ADMIN), async (req, res) => {
  const b = req.body;
  const result = await query(
    `UPDATE SanPham SET TenSanPham = ?, MaDanhMuc = ?, MaDonVi = ?, GiaBan = ?, MucTonToiThieu = ?, TrangThai = ?
      WHERE MaSanPham = ?`,
    [
      toStr(b.TenSanPham, 'Tên sản phẩm', { required: true, max: 200 }),
      toInt(b.MaDanhMuc, 'Danh mục'),
      toInt(b.MaDonVi, 'Đơn vị tính'),
      toNumber(b.GiaBan, 'Giá bán'),
      toInt(b.MucTonToiThieu, 'Mức tồn tối thiểu', { min: 0 }),
      b.TrangThai === 0 || b.TrangThai === false ? 0 : 1,
      req.params.id,
    ],
  );
  if (!result.affectedRows) throw notFound('Sản phẩm');
  res.json(await queryOne(`${SELECT_PRODUCT} WHERE sp.MaSanPham = ?`, [req.params.id]));
});

export default router;
