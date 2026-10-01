-- =============================================================
-- Function, stored procedure nghiệp vụ và cursor
-- Các SP chạy với quyền người định nghĩa (SQL SECURITY DEFINER) nên
-- tài khoản ứng dụng không có quyền ghi SoLuongTon / TrangThai chứng từ
-- vẫn thực hiện được nghiệp vụ thông qua SP (tương đương ownership chaining).
-- =============================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QLTonKhoNoiThat;
DELIMITER $$

-- -------------------------------------------------------------
-- F2. Tồn kho của một sản phẩm tại thời điểm bất kỳ
--     = tồn hiện tại − tổng biến động xảy ra sau thời điểm đó
-- -------------------------------------------------------------
CREATE FUNCTION fn_TonKhoTaiThoiDiem(p_MaSanPham INT, p_ThoiDiem DATETIME)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_Ton INT;
  SELECT sp.SoLuongTon - COALESCE((SELECT SUM(SoLuongThayDoi) FROM LichSuBienDong
                                    WHERE MaSanPham = p_MaSanPham AND NgayBienDong > p_ThoiDiem), 0)
    INTO v_Ton
    FROM SanPham sp WHERE sp.MaSanPham = p_MaSanPham;
  RETURN v_Ton;
END$$

-- -------------------------------------------------------------
-- Thủ tục nội bộ: kiểm tra người dùng đang hoạt động và có vai trò hợp lệ
-- p_VaiTro: danh sách ký hiệu vai trò, ví dụ 'ADMIN,KHO'
-- -------------------------------------------------------------
CREATE PROCEDURE sp_KiemTraQuyen(IN p_MaNguoiDung INT, IN p_VaiTro VARCHAR(100))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM NguoiDung nd JOIN VaiTro vt ON vt.MaVaiTro = nd.MaVaiTro
                  WHERE nd.MaNguoiDung = p_MaNguoiDung AND nd.TrangThai = 1
                    AND FIND_IN_SET(vt.KyHieu, p_VaiTro) > 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người dùng không có quyền thực hiện thao tác này';
  END IF;
END$$

-- -------------------------------------------------------------
-- SP1. Thêm sản phẩm (tồn ban đầu = 0, chỉ tăng qua phiếu nhập / kiểm kê)
-- -------------------------------------------------------------
CREATE PROCEDURE sp_ThemSanPham(
  IN p_TenSanPham VARCHAR(200), IN p_MaSKU VARCHAR(50), IN p_MaDanhMuc INT, IN p_MaDonVi INT,
  IN p_GiaBan DECIMAL(18,2), IN p_MucTonToiThieu INT, OUT p_MaSanPhamMoi INT)
BEGIN
  IF p_TenSanPham IS NULL OR TRIM(p_TenSanPham) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tên sản phẩm không được để trống';
  END IF;
  IF p_MaSKU IS NULL OR TRIM(p_MaSKU) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã SKU không được để trống';
  END IF;
  IF EXISTS (SELECT 1 FROM SanPham WHERE MaSKU = TRIM(p_MaSKU)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã SKU đã tồn tại';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM DanhMuc WHERE MaDanhMuc = p_MaDanhMuc) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Danh mục không hợp lệ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM DonViTinh WHERE MaDonVi = p_MaDonVi) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn vị tính không hợp lệ';
  END IF;
  IF p_GiaBan IS NULL OR p_GiaBan <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Giá bán phải lớn hơn 0';
  END IF;
  IF p_MucTonToiThieu IS NULL OR p_MucTonToiThieu < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mức tồn tối thiểu phải lớn hơn hoặc bằng 0';
  END IF;

  INSERT INTO SanPham (TenSanPham, MaSKU, MaDanhMuc, MaDonVi, GiaBan, SoLuongTon, MucTonToiThieu)
  VALUES (TRIM(p_TenSanPham), TRIM(p_MaSKU), p_MaDanhMuc, p_MaDonVi, p_GiaBan, 0, p_MucTonToiThieu);
  SET p_MaSanPhamMoi = LAST_INSERT_ID();
END$$

-- -------------------------------------------------------------
-- SP2. Thêm dòng vào phiếu nhập Nháp; sản phẩm đã có thì cộng dồn số lượng
-- -------------------------------------------------------------
CREATE PROCEDURE sp_ThemChiTietPhieuNhap(
  IN p_MaPhieuNhap INT, IN p_MaSanPham INT, IN p_SoLuong INT, IN p_DonGiaNhap DECIMAL(18,2))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM PhieuNhap WHERE MaPhieuNhap = p_MaPhieuNhap AND TrangThai = 'DRAFT') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu nhập không tồn tại hoặc không còn ở trạng thái Nháp';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM SanPham WHERE MaSanPham = p_MaSanPham AND TrangThai = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh';
  END IF;
  IF p_SoLuong IS NULL OR p_SoLuong <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng phải lớn hơn 0';
  END IF;
  IF p_DonGiaNhap IS NULL OR p_DonGiaNhap <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn giá nhập phải lớn hơn 0';
  END IF;

  INSERT INTO ChiTietPhieuNhap (MaPhieuNhap, MaSanPham, SoLuong, DonGiaNhap)
  VALUES (p_MaPhieuNhap, p_MaSanPham, p_SoLuong, p_DonGiaNhap) AS moi
  ON DUPLICATE KEY UPDATE SoLuong = ChiTietPhieuNhap.SoLuong + moi.SoLuong,
                          DonGiaNhap = moi.DonGiaNhap;
END$$

-- -------------------------------------------------------------
-- Thêm dòng vào hóa đơn Nháp; đơn giá NULL = giá bán hiện tại; cộng dồn nếu trùng
-- -------------------------------------------------------------
CREATE PROCEDURE sp_ThemChiTietHoaDon(
  IN p_MaHoaDon INT, IN p_MaSanPham INT, IN p_SoLuong INT, IN p_DonGiaBan DECIMAL(18,2))
BEGIN
  DECLARE v_Gia DECIMAL(18,2);
  IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE MaHoaDon = p_MaHoaDon AND TrangThai = 'DRAFT') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hóa đơn không tồn tại hoặc không còn ở trạng thái Nháp';
  END IF;
  SELECT GiaBan INTO v_Gia FROM SanPham WHERE MaSanPham = p_MaSanPham AND TrangThai = 1;
  IF v_Gia IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh';
  END IF;
  IF p_SoLuong IS NULL OR p_SoLuong <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng phải lớn hơn 0';
  END IF;
  IF p_DonGiaBan IS NOT NULL AND p_DonGiaBan <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn giá bán phải lớn hơn 0';
  END IF;

  INSERT INTO ChiTietHoaDon (MaHoaDon, MaSanPham, SoLuong, DonGiaBan)
  VALUES (p_MaHoaDon, p_MaSanPham, p_SoLuong, COALESCE(p_DonGiaBan, v_Gia)) AS moi
  ON DUPLICATE KEY UPDATE SoLuong = ChiTietHoaDon.SoLuong + moi.SoLuong,
                          DonGiaBan = moi.DonGiaBan;
END$$

-- -------------------------------------------------------------
-- SP3. Xác nhận phiếu nhập → trigger T4 cộng tồn
-- -------------------------------------------------------------
CREATE PROCEDURE sp_XacNhanPhieuNhap(IN p_MaPhieuNhap INT, IN p_MaNguoiDung INT)
BEGIN
  DECLARE v_TrangThai VARCHAR(20);
  DECLARE v_Dem INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  CALL sp_KiemTraQuyen(p_MaNguoiDung, 'ADMIN,KHO');

  START TRANSACTION;
  SELECT TrangThai INTO v_TrangThai FROM PhieuNhap WHERE MaPhieuNhap = p_MaPhieuNhap FOR UPDATE;
  IF v_TrangThai IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy phiếu nhập';
  END IF;
  IF v_TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu nhập không còn ở trạng thái Nháp';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ChiTietPhieuNhap WHERE MaPhieuNhap = p_MaPhieuNhap) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu nhập chưa có sản phẩm nào';
  END IF;

  -- Khóa các dòng sản phẩm liên quan để tránh cập nhật tồn đồng thời
  SELECT COUNT(*) INTO v_Dem FROM SanPham
   WHERE MaSanPham IN (SELECT MaSanPham FROM ChiTietPhieuNhap WHERE MaPhieuNhap = p_MaPhieuNhap)
   FOR UPDATE;

  UPDATE PhieuNhap
     SET TrangThai = 'COMPLETED', NguoiXacNhan = p_MaNguoiDung, NgayXacNhan = NOW()
   WHERE MaPhieuNhap = p_MaPhieuNhap;
  COMMIT;
END$$

-- -------------------------------------------------------------
-- SP4. Xác nhận hóa đơn: kiểm tra trước tồn kho, liệt kê mã hàng không đủ
--      → trigger T5 trừ tồn
-- -------------------------------------------------------------
CREATE PROCEDURE sp_XacNhanHoaDon(IN p_MaHoaDon INT, IN p_MaNguoiDung INT)
BEGIN
  DECLARE v_TrangThai VARCHAR(20);
  DECLARE v_Dem INT;
  DECLARE v_Thieu TEXT;
  DECLARE v_ThongBao VARCHAR(128);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  CALL sp_KiemTraQuyen(p_MaNguoiDung, 'ADMIN,BANHANG');

  START TRANSACTION;
  SELECT TrangThai INTO v_TrangThai FROM HoaDon WHERE MaHoaDon = p_MaHoaDon FOR UPDATE;
  IF v_TrangThai IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy hóa đơn';
  END IF;
  IF v_TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hóa đơn không còn ở trạng thái Nháp';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ChiTietHoaDon WHERE MaHoaDon = p_MaHoaDon) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hóa đơn chưa có sản phẩm nào';
  END IF;

  SELECT COUNT(*) INTO v_Dem FROM SanPham
   WHERE MaSanPham IN (SELECT MaSanPham FROM ChiTietHoaDon WHERE MaHoaDon = p_MaHoaDon)
   FOR UPDATE;

  IF EXISTS (SELECT 1 FROM ChiTietHoaDon ct JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
              WHERE ct.MaHoaDon = p_MaHoaDon AND sp.TrangThai = 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hóa đơn có sản phẩm đã ngừng kinh doanh';
  END IF;

  SELECT GROUP_CONCAT(CONCAT(sp.MaSKU, ' (còn ', sp.SoLuongTon, ', cần ', ct.SoLuong, ')') SEPARATOR '; ')
    INTO v_Thieu
    FROM ChiTietHoaDon ct JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
   WHERE ct.MaHoaDon = p_MaHoaDon AND ct.SoLuong > sp.SoLuongTon;
  IF v_Thieu IS NOT NULL THEN
    SET v_ThongBao = LEFT(CONCAT('Không đủ tồn: ', v_Thieu), 128);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_ThongBao;
  END IF;

  UPDATE HoaDon
     SET TrangThai = 'COMPLETED', NguoiXacNhan = p_MaNguoiDung, NgayXacNhan = NOW()
   WHERE MaHoaDon = p_MaHoaDon;
  COMMIT;
END$$

-- -------------------------------------------------------------
-- SP5. Xác nhận phiếu kiểm kê: chốt lại số lượng hệ thống tại thời điểm
--      xác nhận, yêu cầu lý do cho dòng chênh lệch → trigger T6 điều chỉnh tồn
-- -------------------------------------------------------------
CREATE PROCEDURE sp_XacNhanPhieuKiemKe(IN p_MaPhieuKiemKe INT, IN p_MaNguoiDung INT)
BEGIN
  DECLARE v_TrangThai VARCHAR(20);
  DECLARE v_Dem INT;
  DECLARE v_ThieuLyDo TEXT;
  DECLARE v_ThongBao VARCHAR(128);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  CALL sp_KiemTraQuyen(p_MaNguoiDung, 'ADMIN,KHO');

  START TRANSACTION;
  SELECT TrangThai INTO v_TrangThai FROM PhieuKiemKe WHERE MaPhieuKiemKe = p_MaPhieuKiemKe FOR UPDATE;
  IF v_TrangThai IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy phiếu kiểm kê';
  END IF;
  IF v_TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu kiểm kê không còn ở trạng thái Nháp';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ChiTietKiemKe WHERE MaPhieuKiemKe = p_MaPhieuKiemKe) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu kiểm kê chưa có sản phẩm nào';
  END IF;
  IF EXISTS (SELECT 1 FROM ChiTietKiemKe WHERE MaPhieuKiemKe = p_MaPhieuKiemKe AND SoLuongThucTe IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Còn sản phẩm chưa nhập số lượng thực tế';
  END IF;

  SELECT COUNT(*) INTO v_Dem FROM SanPham
   WHERE MaSanPham IN (SELECT MaSanPham FROM ChiTietKiemKe WHERE MaPhieuKiemKe = p_MaPhieuKiemKe)
   FOR UPDATE;

  -- Chốt số lượng hệ thống tại thời điểm xác nhận
  UPDATE ChiTietKiemKe ct JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
     SET ct.SoLuongHeThong = sp.SoLuongTon
   WHERE ct.MaPhieuKiemKe = p_MaPhieuKiemKe;

  SELECT GROUP_CONCAT(sp.MaSKU SEPARATOR ', ') INTO v_ThieuLyDo
    FROM ChiTietKiemKe ct JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
   WHERE ct.MaPhieuKiemKe = p_MaPhieuKiemKe AND ct.ChenhLech <> 0
     AND (ct.LyDo IS NULL OR TRIM(ct.LyDo) = '');
  IF v_ThieuLyDo IS NOT NULL THEN
    SET v_ThongBao = LEFT(CONCAT('Cần ghi lý do chênh lệch cho: ', v_ThieuLyDo), 128);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_ThongBao;
  END IF;

  UPDATE PhieuKiemKe
     SET TrangThai = 'COMPLETED', NguoiXacNhan = p_MaNguoiDung, NgayXacNhan = NOW()
   WHERE MaPhieuKiemKe = p_MaPhieuKiemKe;
  COMMIT;
END$$

-- -------------------------------------------------------------
-- Hủy chứng từ đang Nháp. p_Loai: 'PhieuNhap' | 'HoaDon' | 'PhieuKiemKe'
-- -------------------------------------------------------------
CREATE PROCEDURE sp_HuyChungTu(IN p_Loai VARCHAR(20), IN p_MaChungTu INT, IN p_MaNguoiDung INT)
BEGIN
  DECLARE v_TrangThai VARCHAR(20);

  IF p_Loai = 'PhieuNhap' THEN
    CALL sp_KiemTraQuyen(p_MaNguoiDung, 'ADMIN,KHO');
    SELECT TrangThai INTO v_TrangThai FROM PhieuNhap WHERE MaPhieuNhap = p_MaChungTu;
  ELSEIF p_Loai = 'HoaDon' THEN
    CALL sp_KiemTraQuyen(p_MaNguoiDung, 'ADMIN,BANHANG');
    SELECT TrangThai INTO v_TrangThai FROM HoaDon WHERE MaHoaDon = p_MaChungTu;
  ELSEIF p_Loai = 'PhieuKiemKe' THEN
    CALL sp_KiemTraQuyen(p_MaNguoiDung, 'ADMIN,KHO');
    SELECT TrangThai INTO v_TrangThai FROM PhieuKiemKe WHERE MaPhieuKiemKe = p_MaChungTu;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loại chứng từ không hợp lệ';
  END IF;

  IF v_TrangThai IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không tìm thấy chứng từ';
  END IF;
  IF v_TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ hủy được chứng từ đang ở trạng thái Nháp';
  END IF;

  IF p_Loai = 'PhieuNhap' THEN
    UPDATE PhieuNhap SET TrangThai = 'CANCELLED', NguoiXacNhan = p_MaNguoiDung, NgayXacNhan = NOW()
     WHERE MaPhieuNhap = p_MaChungTu;
  ELSEIF p_Loai = 'HoaDon' THEN
    UPDATE HoaDon SET TrangThai = 'CANCELLED', NguoiXacNhan = p_MaNguoiDung, NgayXacNhan = NOW()
     WHERE MaHoaDon = p_MaChungTu;
  ELSE
    UPDATE PhieuKiemKe SET TrangThai = 'CANCELLED', NguoiXacNhan = p_MaNguoiDung, NgayXacNhan = NOW()
     WHERE MaPhieuKiemKe = p_MaChungTu;
  END IF;
END$$

-- -------------------------------------------------------------
-- C1. Đề xuất nhập hàng (cursor): sản phẩm đang kinh doanh có tồn ≤ mức tối thiểu,
--     đề xuất số lượng để tồn đạt gấp đôi mức tối thiểu, lấy NCC + đơn giá lần nhập gần nhất
-- -------------------------------------------------------------
CREATE PROCEDURE sp_DeXuatNhapHang()
BEGIN
  DECLARE v_Xong INT DEFAULT 0;
  DECLARE v_MaSanPham, v_Ton, v_MucTon, v_MaNCC INT;
  DECLARE v_DonGia DECIMAL(18,2);

  DECLARE cur CURSOR FOR
    SELECT MaSanPham, SoLuongTon, MucTonToiThieu
      FROM SanPham
     WHERE TrangThai = 1 AND SoLuongTon <= MucTonToiThieu
     ORDER BY (MucTonToiThieu - SoLuongTon) DESC;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_Xong = 1;

  DROP TEMPORARY TABLE IF EXISTS tmp_DeXuat;
  CREATE TEMPORARY TABLE tmp_DeXuat (
    ThuTu INT AUTO_INCREMENT PRIMARY KEY,
    MaSanPham INT, SoLuongTon INT, MucTonToiThieu INT, SoLuongDeXuat INT,
    MaNCC INT NULL, DonGiaGanNhat DECIMAL(18,2) NULL, ChiPhiDuKien DECIMAL(18,2) NULL
  );

  OPEN cur;
  doc_tung_dong: LOOP
    FETCH cur INTO v_MaSanPham, v_Ton, v_MucTon;
    IF v_Xong = 1 THEN LEAVE doc_tung_dong; END IF;

    SET v_MaNCC = NULL, v_DonGia = NULL;
    SELECT pn.MaNCC, ct.DonGiaNhap INTO v_MaNCC, v_DonGia
      FROM ChiTietPhieuNhap ct JOIN PhieuNhap pn ON pn.MaPhieuNhap = ct.MaPhieuNhap
     WHERE ct.MaSanPham = v_MaSanPham AND pn.TrangThai = 'COMPLETED'
     ORDER BY pn.NgayXacNhan DESC, pn.MaPhieuNhap DESC
     LIMIT 1;
    SET v_Xong = 0;  -- SELECT INTO không có dòng sẽ kích hoạt handler NOT FOUND

    INSERT INTO tmp_DeXuat (MaSanPham, SoLuongTon, MucTonToiThieu, SoLuongDeXuat, MaNCC, DonGiaGanNhat, ChiPhiDuKien)
    VALUES (v_MaSanPham, v_Ton, v_MucTon, GREATEST(v_MucTon * 2 - v_Ton, 1), v_MaNCC, v_DonGia,
            v_DonGia * GREATEST(v_MucTon * 2 - v_Ton, 1));
  END LOOP;
  CLOSE cur;

  SELECT d.ThuTu, d.MaSanPham, sp.MaSKU, sp.TenSanPham, d.SoLuongTon, d.MucTonToiThieu,
         d.SoLuongDeXuat, d.MaNCC, ncc.TenNCC, d.DonGiaGanNhat, d.ChiPhiDuKien
    FROM tmp_DeXuat d
    JOIN SanPham sp ON sp.MaSanPham = d.MaSanPham
    LEFT JOIN NhaCungCap ncc ON ncc.MaNCC = d.MaNCC
   ORDER BY d.ThuTu;
  DROP TEMPORARY TABLE tmp_DeXuat;
END$$

-- -------------------------------------------------------------
-- C2. Đối soát tồn kho (cursor): so sánh SoLuongTon với TonSauBienDong
--     của bản ghi lịch sử mới nhất (sản phẩm chưa có lịch sử thì kỳ vọng tồn = 0).
--     Lệch nghĩa là tồn đã bị sửa trực tiếp, không qua chứng từ.
-- -------------------------------------------------------------
CREATE PROCEDURE sp_DoiSoatTonKho()
BEGIN
  DECLARE v_Xong INT DEFAULT 0;
  DECLARE v_MaSanPham, v_Ton, v_TonLichSu INT;

  DECLARE cur CURSOR FOR SELECT MaSanPham, SoLuongTon FROM SanPham ORDER BY MaSanPham;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_Xong = 1;

  DROP TEMPORARY TABLE IF EXISTS tmp_SaiLech;
  CREATE TEMPORARY TABLE tmp_SaiLech (MaSanPham INT, SoLuongTon INT, TonTheoLichSu INT);

  OPEN cur;
  doc_tung_dong: LOOP
    FETCH cur INTO v_MaSanPham, v_Ton;
    IF v_Xong = 1 THEN LEAVE doc_tung_dong; END IF;

    SET v_TonLichSu = NULL;
    SELECT TonSauBienDong INTO v_TonLichSu
      FROM LichSuBienDong WHERE MaSanPham = v_MaSanPham
     ORDER BY MaBienDong DESC LIMIT 1;
    SET v_Xong = 0;

    IF v_Ton <> COALESCE(v_TonLichSu, 0) THEN
      INSERT INTO tmp_SaiLech VALUES (v_MaSanPham, v_Ton, COALESCE(v_TonLichSu, 0));
    END IF;
  END LOOP;
  CLOSE cur;

  SELECT t.MaSanPham, sp.MaSKU, sp.TenSanPham, t.SoLuongTon, t.TonTheoLichSu,
         t.SoLuongTon - t.TonTheoLichSu AS ChenhLech
    FROM tmp_SaiLech t JOIN SanPham sp ON sp.MaSanPham = t.MaSanPham;
  DROP TEMPORARY TABLE tmp_SaiLech;
END$$

DELIMITER ;
