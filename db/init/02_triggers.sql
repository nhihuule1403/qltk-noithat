-- =============================================================
-- Trigger – bảo đảm ràng buộc nghiệp vụ ngay tại tầng CSDL
-- MySQL chỉ hỗ trợ trigger theo dòng (FOR EACH ROW) và không có
-- INSTEAD OF, nên mỗi ràng buộc được tách thành BEFORE / AFTER.
-- =============================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QLTonKhoNoiThat;
DELIMITER $$

-- -------------------------------------------------------------
-- T1. Chi tiết phiếu nhập: chỉ sửa khi phiếu Nháp, cập nhật TongTien
-- -------------------------------------------------------------
CREATE TRIGGER trg_CTPN_BI BEFORE INSERT ON ChiTietPhieuNhap FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM PhieuNhap WHERE MaPhieuNhap = NEW.MaPhieuNhap) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của phiếu nhập đang ở trạng thái Nháp';
  END IF;
  IF (SELECT TrangThai FROM SanPham WHERE MaSanPham = NEW.MaSanPham) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sản phẩm đã ngừng kinh doanh';
  END IF;
END$$

CREATE TRIGGER trg_CTPN_BU BEFORE UPDATE ON ChiTietPhieuNhap FOR EACH ROW
BEGIN
  IF NEW.MaPhieuNhap <> OLD.MaPhieuNhap OR NEW.MaSanPham <> OLD.MaSanPham THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi phiếu hoặc sản phẩm của dòng chi tiết';
  END IF;
  IF (SELECT TrangThai FROM PhieuNhap WHERE MaPhieuNhap = OLD.MaPhieuNhap) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của phiếu nhập đang ở trạng thái Nháp';
  END IF;
END$$

CREATE TRIGGER trg_CTPN_BD BEFORE DELETE ON ChiTietPhieuNhap FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM PhieuNhap WHERE MaPhieuNhap = OLD.MaPhieuNhap) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của phiếu nhập đang ở trạng thái Nháp';
  END IF;
END$$

CREATE TRIGGER trg_CTPN_AI AFTER INSERT ON ChiTietPhieuNhap FOR EACH ROW
  UPDATE PhieuNhap
     SET TongTien = (SELECT COALESCE(SUM(ThanhTien), 0) FROM ChiTietPhieuNhap WHERE MaPhieuNhap = NEW.MaPhieuNhap)
   WHERE MaPhieuNhap = NEW.MaPhieuNhap$$

CREATE TRIGGER trg_CTPN_AU AFTER UPDATE ON ChiTietPhieuNhap FOR EACH ROW
  UPDATE PhieuNhap
     SET TongTien = (SELECT COALESCE(SUM(ThanhTien), 0) FROM ChiTietPhieuNhap WHERE MaPhieuNhap = NEW.MaPhieuNhap)
   WHERE MaPhieuNhap = NEW.MaPhieuNhap$$

CREATE TRIGGER trg_CTPN_AD AFTER DELETE ON ChiTietPhieuNhap FOR EACH ROW
  UPDATE PhieuNhap
     SET TongTien = (SELECT COALESCE(SUM(ThanhTien), 0) FROM ChiTietPhieuNhap WHERE MaPhieuNhap = OLD.MaPhieuNhap)
   WHERE MaPhieuNhap = OLD.MaPhieuNhap$$

-- -------------------------------------------------------------
-- T2. Chi tiết hóa đơn: chỉ sửa khi hóa đơn Nháp, không bán sản phẩm
--     ngừng kinh doanh, mặc định đơn giá = giá bán hiện tại, cập nhật TongTien
-- -------------------------------------------------------------
CREATE TRIGGER trg_CTHD_BI BEFORE INSERT ON ChiTietHoaDon FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM HoaDon WHERE MaHoaDon = NEW.MaHoaDon) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của hóa đơn đang ở trạng thái Nháp';
  END IF;
  IF (SELECT TrangThai FROM SanPham WHERE MaSanPham = NEW.MaSanPham) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sản phẩm đã ngừng kinh doanh';
  END IF;
  IF NEW.DonGiaBan IS NULL THEN
    SET NEW.DonGiaBan = (SELECT GiaBan FROM SanPham WHERE MaSanPham = NEW.MaSanPham);
  END IF;
END$$

CREATE TRIGGER trg_CTHD_BU BEFORE UPDATE ON ChiTietHoaDon FOR EACH ROW
BEGIN
  IF NEW.MaHoaDon <> OLD.MaHoaDon OR NEW.MaSanPham <> OLD.MaSanPham THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi hóa đơn hoặc sản phẩm của dòng chi tiết';
  END IF;
  IF (SELECT TrangThai FROM HoaDon WHERE MaHoaDon = OLD.MaHoaDon) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của hóa đơn đang ở trạng thái Nháp';
  END IF;
END$$

CREATE TRIGGER trg_CTHD_BD BEFORE DELETE ON ChiTietHoaDon FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM HoaDon WHERE MaHoaDon = OLD.MaHoaDon) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của hóa đơn đang ở trạng thái Nháp';
  END IF;
END$$

CREATE TRIGGER trg_CTHD_AI AFTER INSERT ON ChiTietHoaDon FOR EACH ROW
  UPDATE HoaDon
     SET TongTien = (SELECT COALESCE(SUM(ThanhTien), 0) FROM ChiTietHoaDon WHERE MaHoaDon = NEW.MaHoaDon)
   WHERE MaHoaDon = NEW.MaHoaDon$$

CREATE TRIGGER trg_CTHD_AU AFTER UPDATE ON ChiTietHoaDon FOR EACH ROW
  UPDATE HoaDon
     SET TongTien = (SELECT COALESCE(SUM(ThanhTien), 0) FROM ChiTietHoaDon WHERE MaHoaDon = NEW.MaHoaDon)
   WHERE MaHoaDon = NEW.MaHoaDon$$

CREATE TRIGGER trg_CTHD_AD AFTER DELETE ON ChiTietHoaDon FOR EACH ROW
  UPDATE HoaDon
     SET TongTien = (SELECT COALESCE(SUM(ThanhTien), 0) FROM ChiTietHoaDon WHERE MaHoaDon = OLD.MaHoaDon)
   WHERE MaHoaDon = OLD.MaHoaDon$$

-- -------------------------------------------------------------
-- T3. Chi tiết kiểm kê: SoLuongHeThong luôn lấy từ tồn hiện tại
--     (người dùng không tự nhập được), chỉ sửa khi phiếu Nháp
-- -------------------------------------------------------------
CREATE TRIGGER trg_CTKK_BI BEFORE INSERT ON ChiTietKiemKe FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM PhieuKiemKe WHERE MaPhieuKiemKe = NEW.MaPhieuKiemKe) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của phiếu kiểm kê đang ở trạng thái Nháp';
  END IF;
  SET NEW.SoLuongHeThong = COALESCE((SELECT SoLuongTon FROM SanPham WHERE MaSanPham = NEW.MaSanPham), 0);
END$$

CREATE TRIGGER trg_CTKK_BU BEFORE UPDATE ON ChiTietKiemKe FOR EACH ROW
BEGIN
  IF NEW.MaPhieuKiemKe <> OLD.MaPhieuKiemKe OR NEW.MaSanPham <> OLD.MaSanPham THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không được đổi phiếu hoặc sản phẩm của dòng chi tiết';
  END IF;
  IF (SELECT TrangThai FROM PhieuKiemKe WHERE MaPhieuKiemKe = OLD.MaPhieuKiemKe) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của phiếu kiểm kê đang ở trạng thái Nháp';
  END IF;
  SET NEW.SoLuongHeThong = (SELECT SoLuongTon FROM SanPham WHERE MaSanPham = NEW.MaSanPham);
END$$

CREATE TRIGGER trg_CTKK_BD BEFORE DELETE ON ChiTietKiemKe FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM PhieuKiemKe WHERE MaPhieuKiemKe = OLD.MaPhieuKiemKe) <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chỉ được sửa chi tiết của phiếu kiểm kê đang ở trạng thái Nháp';
  END IF;
END$$

-- -------------------------------------------------------------
-- T4. Phiếu nhập: Nháp → Hoàn thành thì cộng tồn và ghi lịch sử.
--     Chứng từ đã chốt (Hoàn thành / Đã hủy) không được sửa hay xóa.
-- -------------------------------------------------------------
CREATE TRIGGER trg_PhieuNhap_BU BEFORE UPDATE ON PhieuNhap FOR EACH ROW
BEGIN
  IF OLD.TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu nhập đã chốt, không được sửa';
  END IF;
  IF NEW.TrangThai <> 'DRAFT' THEN
    IF NEW.NguoiXacNhan IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Thiếu người xác nhận phiếu nhập';
    END IF;
    IF NEW.NgayXacNhan IS NULL THEN
      SET NEW.NgayXacNhan = NOW();
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_PhieuNhap_AU AFTER UPDATE ON PhieuNhap FOR EACH ROW
BEGIN
  IF OLD.TrangThai = 'DRAFT' AND NEW.TrangThai = 'COMPLETED' THEN
    -- Mỗi sản phẩm xuất hiện tối đa một dòng/phiếu (uq_CTPN) nên cập nhật theo JOIN là an toàn
    UPDATE SanPham sp
      JOIN ChiTietPhieuNhap ct ON ct.MaSanPham = sp.MaSanPham
       SET sp.SoLuongTon = sp.SoLuongTon + ct.SoLuong
     WHERE ct.MaPhieuNhap = NEW.MaPhieuNhap;

    INSERT INTO LichSuBienDong
      (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonSauBienDong, MaPhieuNhap, MaNguoiDung, NgayBienDong, GhiChu)
    SELECT ct.MaSanPham, 'IMPORT', ct.SoLuong, sp.SoLuongTon, NEW.MaPhieuNhap,
           NEW.NguoiXacNhan, NEW.NgayXacNhan, CONCAT('Phiếu nhập #', NEW.MaPhieuNhap)
      FROM ChiTietPhieuNhap ct
      JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
     WHERE ct.MaPhieuNhap = NEW.MaPhieuNhap;
  END IF;
END$$

CREATE TRIGGER trg_PhieuNhap_BD BEFORE DELETE ON PhieuNhap FOR EACH ROW
BEGIN
  IF OLD.TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu nhập đã chốt, không được xóa';
  END IF;
END$$

-- -------------------------------------------------------------
-- T5. Hóa đơn: không bán vượt tồn; Nháp → Hoàn thành thì trừ tồn, ghi lịch sử
-- -------------------------------------------------------------
CREATE TRIGGER trg_HoaDon_BU BEFORE UPDATE ON HoaDon FOR EACH ROW
BEGIN
  IF OLD.TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hóa đơn đã chốt, không được sửa';
  END IF;
  IF NEW.TrangThai <> 'DRAFT' THEN
    IF NEW.NguoiXacNhan IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Thiếu người xác nhận hóa đơn';
    END IF;
    IF NEW.NgayXacNhan IS NULL THEN
      SET NEW.NgayXacNhan = NOW();
    END IF;
  END IF;
  IF NEW.TrangThai = 'COMPLETED' AND EXISTS (
       SELECT 1 FROM ChiTietHoaDon ct JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
        WHERE ct.MaHoaDon = NEW.MaHoaDon AND ct.SoLuong > sp.SoLuongTon) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không đủ tồn kho để hoàn tất hóa đơn';
  END IF;
END$$

CREATE TRIGGER trg_HoaDon_AU AFTER UPDATE ON HoaDon FOR EACH ROW
BEGIN
  IF OLD.TrangThai = 'DRAFT' AND NEW.TrangThai = 'COMPLETED' THEN
    UPDATE SanPham sp
      JOIN ChiTietHoaDon ct ON ct.MaSanPham = sp.MaSanPham
       SET sp.SoLuongTon = sp.SoLuongTon - ct.SoLuong
     WHERE ct.MaHoaDon = NEW.MaHoaDon;

    INSERT INTO LichSuBienDong
      (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonSauBienDong, MaHoaDon, MaNguoiDung, NgayBienDong, GhiChu)
    SELECT ct.MaSanPham, 'EXPORT', -ct.SoLuong, sp.SoLuongTon, NEW.MaHoaDon,
           NEW.NguoiXacNhan, NEW.NgayXacNhan, CONCAT('Hóa đơn #', NEW.MaHoaDon)
      FROM ChiTietHoaDon ct
      JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
     WHERE ct.MaHoaDon = NEW.MaHoaDon;
  END IF;
END$$

CREATE TRIGGER trg_HoaDon_BD BEFORE DELETE ON HoaDon FOR EACH ROW
BEGIN
  IF OLD.TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hóa đơn đã chốt, không được xóa';
  END IF;
END$$

-- -------------------------------------------------------------
-- T6. Phiếu kiểm kê: Nháp → Hoàn thành thì đưa tồn về số thực tế,
--     ghi lịch sử "Điều chỉnh" cho các dòng có chênh lệch
-- -------------------------------------------------------------
CREATE TRIGGER trg_PhieuKiemKe_BU BEFORE UPDATE ON PhieuKiemKe FOR EACH ROW
BEGIN
  IF OLD.TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu kiểm kê đã chốt, không được sửa';
  END IF;
  IF NEW.TrangThai <> 'DRAFT' THEN
    IF NEW.NguoiXacNhan IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Thiếu người xác nhận phiếu kiểm kê';
    END IF;
    IF NEW.NgayXacNhan IS NULL THEN
      SET NEW.NgayXacNhan = NOW();
    END IF;
  END IF;
  IF NEW.TrangThai = 'COMPLETED' AND EXISTS (
       SELECT 1 FROM ChiTietKiemKe WHERE MaPhieuKiemKe = NEW.MaPhieuKiemKe AND SoLuongThucTe IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Còn sản phẩm chưa nhập số lượng thực tế';
  END IF;
END$$

CREATE TRIGGER trg_PhieuKiemKe_AU AFTER UPDATE ON PhieuKiemKe FOR EACH ROW
BEGIN
  IF OLD.TrangThai = 'DRAFT' AND NEW.TrangThai = 'COMPLETED' THEN
    -- Ghi lịch sử trước (dùng tồn hiện tại để tính lượng thay đổi), rồi mới cập nhật tồn
    INSERT INTO LichSuBienDong
      (MaSanPham, LoaiBienDong, SoLuongThayDoi, TonSauBienDong, MaPhieuKiemKe, MaNguoiDung, NgayBienDong, GhiChu)
    SELECT ct.MaSanPham, 'ADJUST', ct.SoLuongThucTe - sp.SoLuongTon, ct.SoLuongThucTe, NEW.MaPhieuKiemKe,
           NEW.NguoiXacNhan, NEW.NgayXacNhan,
           LEFT(CONCAT('Kiểm kê #', NEW.MaPhieuKiemKe, COALESCE(CONCAT(': ', ct.LyDo), '')), 300)
      FROM ChiTietKiemKe ct
      JOIN SanPham sp ON sp.MaSanPham = ct.MaSanPham
     WHERE ct.MaPhieuKiemKe = NEW.MaPhieuKiemKe
       AND ct.SoLuongThucTe <> sp.SoLuongTon;

    UPDATE SanPham sp
      JOIN ChiTietKiemKe ct ON ct.MaSanPham = sp.MaSanPham
       SET sp.SoLuongTon = ct.SoLuongThucTe
     WHERE ct.MaPhieuKiemKe = NEW.MaPhieuKiemKe
       AND ct.SoLuongThucTe <> sp.SoLuongTon;
  END IF;
END$$

CREATE TRIGGER trg_PhieuKiemKe_BD BEFORE DELETE ON PhieuKiemKe FOR EACH ROW
BEGIN
  IF OLD.TrangThai <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phiếu kiểm kê đã chốt, không được xóa';
  END IF;
END$$

-- -------------------------------------------------------------
-- T7. Lịch sử biến động chỉ được ghi thêm, không được sửa / xóa
-- -------------------------------------------------------------
CREATE TRIGGER trg_LSBD_BU BEFORE UPDATE ON LichSuBienDong FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lịch sử biến động tồn kho không được sửa';
END$$

CREATE TRIGGER trg_LSBD_BD BEFORE DELETE ON LichSuBienDong FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lịch sử biến động tồn kho không được xóa';
END$$

DELIMITER ;
