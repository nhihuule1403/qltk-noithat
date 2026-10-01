-- =============================================================
-- Báo cáo R1–R5. Chỉ tính chứng từ đã hoàn thành.
-- Tham số ngày là DATE; khoảng thời gian tính là [TuNgay, DenNgay + 1 ngày).
-- =============================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QLTonKhoNoiThat;

-- R1. Tồn kho hiện tại
CREATE VIEW vw_BaoCaoTonKhoHienTai AS
SELECT sp.MaSanPham, sp.MaSKU, sp.TenSanPham, dm.TenDanhMuc, dv.TenDonVi,
       sp.SoLuongTon, sp.MucTonToiThieu, sp.GiaBan,
       sp.SoLuongTon * sp.GiaBan AS GiaTriTon,
       CASE WHEN sp.SoLuongTon = 0 THEN 'HET_HANG'
            WHEN sp.SoLuongTon <= sp.MucTonToiThieu THEN 'TON_THAP'
            ELSE 'DU_HANG' END AS TinhTrang
  FROM SanPham sp
  JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
  JOIN DonViTinh dv ON dv.MaDonVi = sp.MaDonVi
 WHERE sp.TrangThai = 1;

DELIMITER $$

-- R2. Nhập – xuất – tồn theo khoảng thời gian (thay cho F3 fn_NhapXuatTon:
--     MySQL không có hàm trả về bảng)
CREATE PROCEDURE sp_BaoCaoNhapXuatTon(IN p_TuNgay DATE, IN p_DenNgay DATE)
BEGIN
  DECLARE v_Tu DATETIME DEFAULT p_TuNgay;
  DECLARE v_Den DATETIME DEFAULT DATE_ADD(p_DenNgay, INTERVAL 1 DAY);

  SELECT x.MaSanPham, x.MaSKU, x.TenSanPham, x.TenDanhMuc,
         x.TonDauKy, x.Nhap, x.Xuat, x.DieuChinh,
         x.TonDauKy + x.Nhap - x.Xuat + x.DieuChinh AS TonCuoiKy
    FROM (
      SELECT sp.MaSanPham, sp.MaSKU, sp.TenSanPham, dm.TenDanhMuc,
             sp.SoLuongTon - COALESCE(SUM(CASE WHEN ls.NgayBienDong >= v_Tu THEN ls.SoLuongThayDoi END), 0) AS TonDauKy,
             COALESCE(SUM(CASE WHEN ls.LoaiBienDong = 'IMPORT' AND ls.NgayBienDong >= v_Tu AND ls.NgayBienDong < v_Den
                               THEN ls.SoLuongThayDoi END), 0) AS Nhap,
             COALESCE(SUM(CASE WHEN ls.LoaiBienDong = 'EXPORT' AND ls.NgayBienDong >= v_Tu AND ls.NgayBienDong < v_Den
                               THEN -ls.SoLuongThayDoi END), 0) AS Xuat,
             COALESCE(SUM(CASE WHEN ls.LoaiBienDong = 'ADJUST' AND ls.NgayBienDong >= v_Tu AND ls.NgayBienDong < v_Den
                               THEN ls.SoLuongThayDoi END), 0) AS DieuChinh
        FROM SanPham sp
        JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
        LEFT JOIN LichSuBienDong ls ON ls.MaSanPham = sp.MaSanPham
       GROUP BY sp.MaSanPham, sp.MaSKU, sp.TenSanPham, dm.TenDanhMuc, sp.SoLuongTon
    ) x
   ORDER BY x.TenDanhMuc, x.MaSKU;
END$$

-- R3. Doanh số bán hàng theo tháng
CREATE PROCEDURE sp_BaoCaoDoanhThuTheoThang(IN p_TuNgay DATE, IN p_DenNgay DATE)
BEGIN
  SELECT DATE_FORMAT(hd.NgayXacNhan, '%Y-%m') AS Thang,
         COUNT(DISTINCT hd.MaHoaDon) AS SoHoaDon,
         SUM(ct.SoLuong) AS SoLuongBan,
         SUM(ct.ThanhTien) AS DoanhThu
    FROM HoaDon hd JOIN ChiTietHoaDon ct ON ct.MaHoaDon = hd.MaHoaDon
   WHERE hd.TrangThai = 'COMPLETED'
     AND hd.NgayXacNhan >= p_TuNgay AND hd.NgayXacNhan < DATE_ADD(p_DenNgay, INTERVAL 1 DAY)
   GROUP BY Thang
   ORDER BY Thang;
END$$

-- R4. Sản phẩm bán chạy (RANK giữ đồng hạng)
CREATE PROCEDURE sp_BaoCaoSanPhamBanChay(IN p_TuNgay DATE, IN p_DenNgay DATE, IN p_Top INT)
BEGIN
  SELECT * FROM (
    SELECT RANK() OVER (ORDER BY SUM(ct.SoLuong) DESC) AS Hang,
           sp.MaSanPham, sp.MaSKU, sp.TenSanPham,
           SUM(ct.SoLuong) AS SoLuongBan, SUM(ct.ThanhTien) AS DoanhThu
      FROM HoaDon hd
      JOIN ChiTietHoaDon ct ON ct.MaHoaDon = hd.MaHoaDon
      JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
     WHERE hd.TrangThai = 'COMPLETED'
       AND hd.NgayXacNhan >= p_TuNgay AND hd.NgayXacNhan < DATE_ADD(p_DenNgay, INTERVAL 1 DAY)
     GROUP BY sp.MaSanPham, sp.MaSKU, sp.TenSanPham
  ) x
  WHERE x.Hang <= COALESCE(p_Top, 10)
  ORDER BY x.Hang, x.MaSKU;
END$$

-- R5. Nhập hàng theo nhà cung cấp
CREATE PROCEDURE sp_BaoCaoNhapTheoNCC(IN p_TuNgay DATE, IN p_DenNgay DATE)
BEGIN
  SELECT x.*, ROUND(x.TongTienNhap * 100 / NULLIF(SUM(x.TongTienNhap) OVER (), 0), 2) AS TyTrong
    FROM (
      SELECT ncc.MaNCC, ncc.TenNCC,
             COUNT(DISTINCT pn.MaPhieuNhap) AS SoPhieu,
             SUM(ct.SoLuong) AS TongSoLuong,
             SUM(ct.ThanhTien) AS TongTienNhap
        FROM PhieuNhap pn
        JOIN NhaCungCap ncc ON ncc.MaNCC = pn.MaNCC
        JOIN ChiTietPhieuNhap ct ON ct.MaPhieuNhap = pn.MaPhieuNhap
       WHERE pn.TrangThai = 'COMPLETED'
         AND pn.NgayXacNhan >= p_TuNgay AND pn.NgayXacNhan < DATE_ADD(p_DenNgay, INTERVAL 1 DAY)
       GROUP BY ncc.MaNCC, ncc.TenNCC
    ) x
   ORDER BY x.TongTienNhap DESC;
END$$

DELIMITER ;
