import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db.js';
import { requireRole, ROLES } from '../middleware/auth.js';
import { HttpError, notFound } from '../lib/errors.js';
import { toInt, toStr } from '../lib/validate.js';

const router = Router();
router.use(requireRole(ROLES.ADMIN));

const SELECT_USER = `
  SELECT nd.MaNguoiDung, nd.TenDangNhap, nd.HoTen, nd.Email, nd.MaVaiTro, vt.KyHieu, vt.TenVaiTro, nd.TrangThai
    FROM NguoiDung nd JOIN VaiTro vt ON vt.MaVaiTro = nd.MaVaiTro`;

router.get('/roles', async (_req, res) => {
  res.json(await query('SELECT * FROM VaiTro ORDER BY MaVaiTro'));
});

router.get('/', async (_req, res) => {
  res.json(await query(`${SELECT_USER} ORDER BY nd.MaNguoiDung`));
});

router.post('/', async (req, res) => {
  const username = toStr(req.body.TenDangNhap, 'Tên đăng nhập', { required: true, max: 50 });
  const password = toStr(req.body.MatKhau, 'Mật khẩu', { required: true });
  if (password.length < 6) throw new HttpError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
  const result = await query(
    'INSERT INTO NguoiDung (TenDangNhap, MatKhau, HoTen, Email, MaVaiTro) VALUES (?, ?, ?, ?, ?)',
    [
      username,
      await bcrypt.hash(password, 10),
      toStr(req.body.HoTen, 'Họ tên', { required: true, max: 100 }),
      toStr(req.body.Email, 'Email', { max: 100 }),
      toInt(req.body.MaVaiTro, 'Vai trò'),
    ],
  );
  res.status(201).json(await queryOne(`${SELECT_USER} WHERE nd.MaNguoiDung = ?`, [result.insertId]));
});

router.put('/:id', async (req, res) => {
  const id = toInt(req.params.id, 'Mã người dùng');
  const status = toInt(req.body.TrangThai, 'Trạng thái');
  const role = toInt(req.body.MaVaiTro, 'Vai trò');
  if (id === req.user.id && (status !== 1 || role !== 1)) {
    throw new HttpError(400, 'Không thể tự khóa hoặc tự hạ quyền tài khoản đang đăng nhập');
  }
  const result = await query(
    'UPDATE NguoiDung SET HoTen = ?, Email = ?, MaVaiTro = ?, TrangThai = ? WHERE MaNguoiDung = ?',
    [toStr(req.body.HoTen, 'Họ tên', { required: true, max: 100 }), toStr(req.body.Email, 'Email', { max: 100 }), role, status ? 1 : 0, id],
  );
  if (!result.affectedRows) throw notFound('Người dùng');
  res.json(await queryOne(`${SELECT_USER} WHERE nd.MaNguoiDung = ?`, [id]));
});

router.post('/:id/reset-password', async (req, res) => {
  const password = toStr(req.body.MatKhau, 'Mật khẩu mới', { required: true });
  if (password.length < 6) throw new HttpError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
  const result = await query('UPDATE NguoiDung SET MatKhau = ? WHERE MaNguoiDung = ?', [await bcrypt.hash(password, 10), req.params.id]);
  if (!result.affectedRows) throw notFound('Người dùng');
  res.status(204).end();
});

export default router;
