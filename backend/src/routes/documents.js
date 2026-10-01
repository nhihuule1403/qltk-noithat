import { documentRouter, userColumns, userJoins } from '../lib/documentRouter.js';
import { ROLES } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { toInt, toNumber, toStr } from '../lib/validate.js';

const { ADMIN, KHO, BANHANG } = ROLES;

// ---------- Phiếu nhập ----------
export const purchaseOrdersRouter = documentRouter({
  table: 'PhieuNhap', pk: 'MaPhieuNhap', label: 'Phiếu nhập', loai: 'PhieuNhap',
  roles: [ADMIN, KHO], dateCol: 'NgayNhap', filters: ['MaNCC'],
  lineTable: 'ChiTietPhieuNhap', linePk: 'MaChiTietNhap',
  confirmProc: 'sp_XacNhanPhieuNhap',
  selectHeader: `
    SELECT d.*, ncc.TenNCC, ${userColumns},
           (SELECT COUNT(*) FROM ChiTietPhieuNhap c WHERE c.MaPhieuNhap = d.MaPhieuNhap) AS SoDong
      FROM PhieuNhap d
      JOIN NhaCungCap ncc ON ncc.MaNCC = d.MaNCC ${userJoins}`,
  selectLines: `
    SELECT ct.*, sp.MaSKU, sp.TenSanPham, dv.TenDonVi
      FROM ChiTietPhieuNhap ct
      JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
      JOIN DonViTinh dv ON dv.MaDonVi = sp.MaDonVi`,
  readHeader: (b) => ({
    MaNCC: toInt(b.MaNCC, 'Nhà cung cấp'),
    GhiChu: toStr(b.GhiChu, 'Ghi chú', { max: 500 }),
  }),
  addLine: (conn, id, b) =>
    conn.query('CALL sp_ThemChiTietPhieuNhap(?, ?, ?, ?)', [
      id, toInt(b.MaSanPham, 'Sản phẩm'), toInt(b.SoLuong, 'Số lượng'), toNumber(b.DonGiaNhap, 'Đơn giá nhập'),
    ]),
  readLineUpdate: (b) => ({
    SoLuong: toInt(b.SoLuong, 'Số lượng'),
    DonGiaNhap: toNumber(b.DonGiaNhap, 'Đơn giá nhập'),
  }),
});

// ---------- Hóa đơn bán hàng ----------
export const salesInvoicesRouter = documentRouter({
  table: 'HoaDon', pk: 'MaHoaDon', label: 'Hóa đơn', loai: 'HoaDon',
  roles: [ADMIN, BANHANG], dateCol: 'NgayBan', filters: ['MaKhachHang'],
  lineTable: 'ChiTietHoaDon', linePk: 'MaChiTietBan',
  confirmProc: 'sp_XacNhanHoaDon',
  selectHeader: `
    SELECT d.*, kh.TenKhachHang, kh.SoDienThoai, ${userColumns},
           (SELECT COUNT(*) FROM ChiTietHoaDon c WHERE c.MaHoaDon = d.MaHoaDon) AS SoDong
      FROM HoaDon d
      JOIN KhachHang kh ON kh.MaKhachHang = d.MaKhachHang ${userJoins}`,
  selectLines: `
    SELECT ct.*, sp.MaSKU, sp.TenSanPham, sp.SoLuongTon, dv.TenDonVi
      FROM ChiTietHoaDon ct
      JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
      JOIN DonViTinh dv ON dv.MaDonVi = sp.MaDonVi`,
  readHeader: (b) => ({
    MaKhachHang: toInt(b.MaKhachHang ?? 1, 'Khách hàng'),
    GhiChu: toStr(b.GhiChu, 'Ghi chú', { max: 500 }),
  }),
  addLine: (conn, id, b) =>
    conn.query('CALL sp_ThemChiTietHoaDon(?, ?, ?, ?)', [
      id, toInt(b.MaSanPham, 'Sản phẩm'), toInt(b.SoLuong, 'Số lượng'), toNumber(b.DonGiaBan, 'Đơn giá bán', { required: false }),
    ]),
  readLineUpdate: (b) => ({
    SoLuong: toInt(b.SoLuong, 'Số lượng'),
    DonGiaBan: toNumber(b.DonGiaBan, 'Đơn giá bán'),
  }),
});

// ---------- Phiếu kiểm kê ----------
export const inventoryChecksRouter = documentRouter({
  table: 'PhieuKiemKe', pk: 'MaPhieuKiemKe', label: 'Phiếu kiểm kê', loai: 'PhieuKiemKe',
  roles: [ADMIN, KHO], dateCol: 'NgayKiemKe',
  lineTable: 'ChiTietKiemKe', linePk: 'MaChiTietKiemKe',
  confirmProc: 'sp_XacNhanPhieuKiemKe',
  selectHeader: `
    SELECT d.*, ${userColumns},
           (SELECT COUNT(*) FROM ChiTietKiemKe c WHERE c.MaPhieuKiemKe = d.MaPhieuKiemKe) AS SoDong,
           (SELECT COUNT(*) FROM ChiTietKiemKe c WHERE c.MaPhieuKiemKe = d.MaPhieuKiemKe AND c.ChenhLech <> 0) AS SoDongLech
      FROM PhieuKiemKe d ${userJoins}`,
  selectLines: `
    SELECT ct.*, sp.MaSKU, sp.TenSanPham, sp.SoLuongTon AS TonHienTai, dv.TenDonVi, dm.TenDanhMuc
      FROM ChiTietKiemKe ct
      JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
      JOIN DonViTinh dv ON dv.MaDonVi = sp.MaDonVi
      JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc`,
  readHeader: (b) => ({ GhiChu: toStr(b.GhiChu, 'Ghi chú', { max: 500 }) }),
  // Khi tạo phiếu: tự thêm toàn bộ sản phẩm đang kinh doanh (hoặc theo danh mục)
  afterCreate: async (conn, id, b) => {
    if (!b.ThemTatCa && !b.MaDanhMuc) return;
    const params = [id, id];
    let filter = '';
    if (b.MaDanhMuc) {
      filter = 'AND sp.MaDanhMuc = ?';
      params.splice(1, 0, toInt(b.MaDanhMuc, 'Danh mục'));
    }
    await conn.query(
      `INSERT INTO ChiTietKiemKe (MaPhieuKiemKe, MaSanPham)
       SELECT ?, sp.MaSanPham FROM SanPham sp
        WHERE sp.TrangThai = 1 ${filter}
          AND NOT EXISTS (SELECT 1 FROM ChiTietKiemKe c WHERE c.MaPhieuKiemKe = ? AND c.MaSanPham = sp.MaSanPham)
        ORDER BY sp.MaSKU`,
      params,
    );
  },
  addLine: (conn, id, b) =>
    conn.query('INSERT INTO ChiTietKiemKe (MaPhieuKiemKe, MaSanPham, SoLuongThucTe, LyDo) VALUES (?, ?, ?, ?)', [
      id, toInt(b.MaSanPham, 'Sản phẩm'),
      toInt(b.SoLuongThucTe, 'Số lượng thực tế', { required: false, min: 0 }),
      toStr(b.LyDo, 'Lý do', { max: 300 }),
    ]),
  readLineUpdate: (b) => {
    if (!('SoLuongThucTe' in b)) throw new HttpError(400, 'Thiếu số lượng thực tế');
    return {
      SoLuongThucTe: toInt(b.SoLuongThucTe, 'Số lượng thực tế', { required: false, min: 0 }),
      LyDo: toStr(b.LyDo, 'Lý do', { max: 300 }),
    };
  },
});
