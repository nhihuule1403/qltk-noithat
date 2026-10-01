import { Router } from 'express';
import { callProc, query, queryOne } from '../db.js';
import { requireRole, ROLES } from '../middleware/auth.js';
import { toCsv } from '../lib/csv.js';
import { toDate, toInt } from '../lib/validate.js';

const { ADMIN, KHO, BANHANG } = ROLES;
const router = Router();

const range = (q) => [toDate(q.tuNgay, 'Từ ngày'), toDate(q.denNgay, 'Đến ngày')];

// Trả JSON, hoặc CSV khi có ?format=csv (thay cho bcp ở báo cáo)
const send = (res, req, rows, columns, filename) => {
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(toCsv(rows, columns));
  }
  res.json(rows);
};

router.get('/dashboard', async (req, res) => {
  const [tonKho, homNay, thang, chungTuNhap] = await Promise.all([
    queryOne(`SELECT COUNT(*) AS SoSanPham, COALESCE(SUM(SoLuongTon), 0) AS TongTon,
                     COALESCE(SUM(GiaTriTon), 0) AS GiaTriTon,
                     SUM(TinhTrang = 'TON_THAP') AS SoTonThap, SUM(TinhTrang = 'HET_HANG') AS SoHetHang
                FROM vw_BaoCaoTonKhoHienTai`),
    queryOne(`SELECT COUNT(*) AS SoHoaDon, COALESCE(SUM(TongTien), 0) AS DoanhThu
                FROM HoaDon WHERE TrangThai = 'COMPLETED' AND DATE(NgayXacNhan) = CURDATE()`),
    queryOne(`SELECT COUNT(*) AS SoHoaDon, COALESCE(SUM(TongTien), 0) AS DoanhThu
                FROM HoaDon WHERE TrangThai = 'COMPLETED' AND NgayXacNhan >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`),
    queryOne(`SELECT (SELECT COUNT(*) FROM PhieuNhap WHERE TrangThai = 'DRAFT') AS PhieuNhapNhap,
                     (SELECT COUNT(*) FROM HoaDon WHERE TrangThai = 'DRAFT') AS HoaDonNhap,
                     (SELECT COUNT(*) FROM PhieuKiemKe WHERE TrangThai = 'DRAFT') AS KiemKeNhap`),
  ]);
  const canhBao = await query(
    `SELECT * FROM vw_BaoCaoTonKhoHienTai WHERE TinhTrang <> 'DU_HANG'
      ORDER BY SoLuongTon - MucTonToiThieu, MaSKU`,
  );
  const doanhThu30Ngay = req.user.role === KHO ? [] : await query(
    `SELECT DATE(NgayXacNhan) AS Ngay, COUNT(*) AS SoHoaDon, SUM(TongTien) AS DoanhThu
       FROM HoaDon
      WHERE TrangThai = 'COMPLETED' AND NgayXacNhan >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY DATE(NgayXacNhan) ORDER BY Ngay`,
  );
  res.json({ tonKho, homNay, thang, chungTuNhap, canhBao, doanhThu30Ngay });
});

// R1. Tồn kho hiện tại
router.get('/inventory', async (req, res) => {
  const rows = await query('SELECT * FROM vw_BaoCaoTonKhoHienTai ORDER BY TenDanhMuc, MaSKU');
  send(res, req, rows, [
    { key: 'MaSKU', title: 'Mã SKU' }, { key: 'TenSanPham', title: 'Tên sản phẩm' },
    { key: 'TenDanhMuc', title: 'Danh mục' }, { key: 'TenDonVi', title: 'Đơn vị' },
    { key: 'SoLuongTon', title: 'Tồn' }, { key: 'MucTonToiThieu', title: 'Mức tối thiểu' },
    { key: 'GiaBan', title: 'Giá bán' }, { key: 'GiaTriTon', title: 'Giá trị tồn' }, { key: 'TinhTrang', title: 'Tình trạng' },
  ], 'bao-cao-ton-kho');
});

// R2. Nhập – xuất – tồn
router.get('/stock-summary', requireRole(ADMIN, KHO), async (req, res) => {
  const rows = await callProc('sp_BaoCaoNhapXuatTon', range(req.query));
  send(res, req, rows, [
    { key: 'MaSKU', title: 'Mã SKU' }, { key: 'TenSanPham', title: 'Tên sản phẩm' }, { key: 'TenDanhMuc', title: 'Danh mục' },
    { key: 'TonDauKy', title: 'Tồn đầu kỳ' }, { key: 'Nhap', title: 'Nhập' }, { key: 'Xuat', title: 'Xuất' },
    { key: 'DieuChinh', title: 'Điều chỉnh' }, { key: 'TonCuoiKy', title: 'Tồn cuối kỳ' },
  ], 'nhap-xuat-ton');
});

// R3. Doanh số theo tháng
router.get('/revenue', requireRole(ADMIN, BANHANG), async (req, res) => {
  const rows = await callProc('sp_BaoCaoDoanhThuTheoThang', range(req.query));
  send(res, req, rows, [
    { key: 'Thang', title: 'Tháng' }, { key: 'SoHoaDon', title: 'Số hóa đơn' },
    { key: 'SoLuongBan', title: 'Số lượng bán' }, { key: 'DoanhThu', title: 'Doanh thu' },
  ], 'doanh-thu-theo-thang');
});

// R4. Sản phẩm bán chạy
router.get('/best-sellers', requireRole(ADMIN, BANHANG), async (req, res) => {
  const top = toInt(req.query.top ?? 10, 'Top', { min: 1 });
  const rows = await callProc('sp_BaoCaoSanPhamBanChay', [...range(req.query), top]);
  send(res, req, rows, [
    { key: 'Hang', title: 'Hạng' }, { key: 'MaSKU', title: 'Mã SKU' }, { key: 'TenSanPham', title: 'Tên sản phẩm' },
    { key: 'SoLuongBan', title: 'Số lượng bán' }, { key: 'DoanhThu', title: 'Doanh thu' },
  ], 'san-pham-ban-chay');
});

// R5. Nhập hàng theo nhà cung cấp
router.get('/purchases-by-supplier', requireRole(ADMIN, KHO), async (req, res) => {
  const rows = await callProc('sp_BaoCaoNhapTheoNCC', range(req.query));
  send(res, req, rows, [
    { key: 'TenNCC', title: 'Nhà cung cấp' }, { key: 'SoPhieu', title: 'Số phiếu' },
    { key: 'TongSoLuong', title: 'Tổng số lượng' }, { key: 'TongTienNhap', title: 'Tổng tiền nhập' }, { key: 'TyTrong', title: 'Tỷ trọng (%)' },
  ], 'nhap-hang-theo-ncc');
});

// C1. Đề xuất nhập hàng
router.get('/reorder-suggestions', requireRole(ADMIN, KHO), async (_req, res) => {
  res.json(await callProc('sp_DeXuatNhapHang'));
});

// C2. Đối soát tồn kho
router.get('/reconciliation', requireRole(ADMIN), async (_req, res) => {
  res.json(await callProc('sp_DoiSoatTonKho'));
});

export default router;
