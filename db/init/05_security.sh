#!/bin/bash
# =============================================================
# Tài khoản MySQL cho backend – nguyên tắc quyền tối thiểu.
# Không được ghi trực tiếp SoLuongTon, TrangThai/người xác nhận của chứng từ
# và LichSuBienDong: các thay đổi này chỉ đi qua stored procedure.
# File .sh được entrypoint của image mysql gọi khi khởi tạo lần đầu.
# =============================================================
set -e

APP_USER="${APP_DB_USER:-qltk_app}"
APP_PASS="${APP_DB_PASSWORD:?Thiếu biến APP_DB_PASSWORD}"

docker_process_sql --database=QLTonKhoNoiThat <<-EOSQL
  CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASS}';

  GRANT SELECT ON QLTonKhoNoiThat.* TO '${APP_USER}'@'%';
  GRANT EXECUTE ON QLTonKhoNoiThat.* TO '${APP_USER}'@'%';

  -- Danh mục dữ liệu cơ bản
  GRANT INSERT, UPDATE, DELETE ON QLTonKhoNoiThat.DanhMuc    TO '${APP_USER}'@'%';
  GRANT INSERT, UPDATE, DELETE ON QLTonKhoNoiThat.DonViTinh  TO '${APP_USER}'@'%';
  GRANT INSERT, UPDATE, DELETE ON QLTonKhoNoiThat.NhaCungCap TO '${APP_USER}'@'%';
  GRANT INSERT, UPDATE, DELETE ON QLTonKhoNoiThat.KhachHang  TO '${APP_USER}'@'%';
  GRANT INSERT, UPDATE         ON QLTonKhoNoiThat.NguoiDung  TO '${APP_USER}'@'%';

  -- Sản phẩm: thêm qua sp_ThemSanPham; sửa mọi cột trừ SoLuongTon
  GRANT UPDATE (TenSanPham, MaDanhMuc, MaDonVi, GiaBan, MucTonToiThieu, TrangThai)
    ON QLTonKhoNoiThat.SanPham TO '${APP_USER}'@'%';

  -- Chứng từ: tạo / sửa thông tin chung, không được đổi trạng thái
  GRANT INSERT (MaNCC, MaNguoiDung, GhiChu), UPDATE (MaNCC, GhiChu)
    ON QLTonKhoNoiThat.PhieuNhap TO '${APP_USER}'@'%';
  GRANT INSERT (MaKhachHang, MaNguoiDung, GhiChu), UPDATE (MaKhachHang, GhiChu)
    ON QLTonKhoNoiThat.HoaDon TO '${APP_USER}'@'%';
  GRANT INSERT (MaNguoiDung, GhiChu), UPDATE (GhiChu)
    ON QLTonKhoNoiThat.PhieuKiemKe TO '${APP_USER}'@'%';

  -- Chi tiết chứng từ (trigger chặn sửa khi chứng từ đã chốt)
  GRANT UPDATE (SoLuong, DonGiaNhap), DELETE ON QLTonKhoNoiThat.ChiTietPhieuNhap TO '${APP_USER}'@'%';
  GRANT UPDATE (SoLuong, DonGiaBan),  DELETE ON QLTonKhoNoiThat.ChiTietHoaDon    TO '${APP_USER}'@'%';
  GRANT INSERT (MaPhieuKiemKe, MaSanPham, SoLuongThucTe, LyDo), UPDATE (SoLuongThucTe, LyDo), DELETE
    ON QLTonKhoNoiThat.ChiTietKiemKe TO '${APP_USER}'@'%';
EOSQL

echo "Đã tạo tài khoản ứng dụng ${APP_USER}"
