import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { toStr } from '../lib/validate.js';

const router = Router();

router.post('/login', async (req, res) => {
  const username = toStr(req.body.TenDangNhap, 'Tên đăng nhập', { required: true });
  const password = toStr(req.body.MatKhau, 'Mật khẩu', { required: true });

  const user = await queryOne(
    `SELECT nd.MaNguoiDung, nd.TenDangNhap, nd.MatKhau, nd.HoTen, nd.TrangThai, vt.KyHieu, vt.TenVaiTro
       FROM NguoiDung nd JOIN VaiTro vt ON vt.MaVaiTro = nd.MaVaiTro
      WHERE nd.TenDangNhap = ?`,
    [username],
  );
  // Không tiết lộ sai tên đăng nhập hay sai mật khẩu
  const ok = user && user.TrangThai === 1 && (await bcrypt.compare(password, user.MatKhau));
  if (!ok) throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng');

  res.json({
    token: signToken(user),
    user: { MaNguoiDung: user.MaNguoiDung, TenDangNhap: user.TenDangNhap, HoTen: user.HoTen, VaiTro: user.KyHieu, TenVaiTro: user.TenVaiTro },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await queryOne(
    `SELECT nd.MaNguoiDung, nd.TenDangNhap, nd.HoTen, nd.Email, vt.KyHieu AS VaiTro, vt.TenVaiTro
       FROM NguoiDung nd JOIN VaiTro vt ON vt.MaVaiTro = nd.MaVaiTro WHERE nd.MaNguoiDung = ?`,
    [req.user.id],
  );
  res.json(user);
});

router.post('/change-password', authenticate, async (req, res) => {
  const oldPass = toStr(req.body.MatKhauCu, 'Mật khẩu cũ', { required: true });
  const newPass = toStr(req.body.MatKhauMoi, 'Mật khẩu mới', { required: true });
  if (newPass.length < 6) throw new HttpError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự');
  const user = await queryOne('SELECT MatKhau FROM NguoiDung WHERE MaNguoiDung = ?', [req.user.id]);
  if (!(await bcrypt.compare(oldPass, user.MatKhau))) throw new HttpError(400, 'Mật khẩu cũ không đúng');
  await query('UPDATE NguoiDung SET MatKhau = ? WHERE MaNguoiDung = ?', [await bcrypt.hash(newPass, 10), req.user.id]);
  res.status(204).end();
});

export default router;
