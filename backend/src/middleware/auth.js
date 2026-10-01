import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { queryOne } from '../db.js';
import { HttpError } from '../lib/errors.js';

export const ROLES = { ADMIN: 'ADMIN', KHO: 'KHO', BANHANG: 'BANHANG' };

export function signToken(user) {
  return jwt.sign({ id: user.MaNguoiDung, role: user.KyHieu, name: user.HoTen }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Xác thực JWT và kiểm tra tài khoản vẫn đang hoạt động
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Vui lòng đăng nhập'));

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(new HttpError(401, 'Phiên đăng nhập đã hết hạn'));
  }

  const user = await queryOne(
    `SELECT nd.MaNguoiDung, nd.HoTen, nd.TrangThai, vt.KyHieu
       FROM NguoiDung nd JOIN VaiTro vt ON vt.MaVaiTro = nd.MaVaiTro
      WHERE nd.MaNguoiDung = ?`,
    [payload.id],
  );
  if (!user || user.TrangThai !== 1) return next(new HttpError(401, 'Tài khoản đã bị khóa'));

  req.user = { id: user.MaNguoiDung, role: user.KyHieu, name: user.HoTen };
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(new HttpError(403, 'Bạn không có quyền thực hiện chức năng này'));
  }
  next();
};
