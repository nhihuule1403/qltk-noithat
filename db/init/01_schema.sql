-- =============================================================
-- QLTonKhoNoiThat – Lược đồ CSDL (MySQL 8.4)
-- =============================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS QLTonKhoNoiThat
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QLTonKhoNoiThat;

-- ---------- Bảng độc lập ----------

CREATE TABLE DanhMuc (
  MaDanhMuc   INT AUTO_INCREMENT PRIMARY KEY,
  TenDanhMuc  VARCHAR(100) NOT NULL UNIQUE,
  MoTa        VARCHAR(255)
);

CREATE TABLE DonViTinh (
  MaDonVi   INT AUTO_INCREMENT PRIMARY KEY,
  TenDonVi  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE NhaCungCap (
  MaNCC        INT AUTO_INCREMENT PRIMARY KEY,
  TenNCC       VARCHAR(200) NOT NULL,
  DiaChi       VARCHAR(300),
  SoDienThoai  VARCHAR(20),
  Email        VARCHAR(100)
);

CREATE TABLE KhachHang (
  MaKhachHang   INT AUTO_INCREMENT PRIMARY KEY,
  TenKhachHang  VARCHAR(200) NOT NULL,
  SoDienThoai   VARCHAR(20) UNIQUE,          -- NULL được phép (Khách lẻ)
  DiaChi        VARCHAR(300)
);

CREATE TABLE VaiTro (
  MaVaiTro   INT AUTO_INCREMENT PRIMARY KEY,
  KyHieu     VARCHAR(20) NOT NULL UNIQUE,    -- ADMIN | KHO | BANHANG (dùng trong code)
  TenVaiTro  VARCHAR(50) NOT NULL UNIQUE,
  MoTa       VARCHAR(255)
);

-- ---------- Bảng phụ thuộc ----------

CREATE TABLE NguoiDung (
  MaNguoiDung  INT AUTO_INCREMENT PRIMARY KEY,
  TenDangNhap  VARCHAR(50)  NOT NULL UNIQUE,
  MatKhau      VARCHAR(255) NOT NULL,        -- chuỗi băm bcrypt
  HoTen        VARCHAR(100) NOT NULL,
  Email        VARCHAR(100),
  MaVaiTro     INT NOT NULL,
  TrangThai    TINYINT(1) NOT NULL DEFAULT 1, -- 1: hoạt động, 0: khóa
  FOREIGN KEY (MaVaiTro) REFERENCES VaiTro(MaVaiTro)
);

CREATE TABLE SanPham (
  MaSanPham       INT AUTO_INCREMENT PRIMARY KEY,
  TenSanPham      VARCHAR(200) NOT NULL,
  MaSKU           VARCHAR(50)  NOT NULL UNIQUE,
  MaDanhMuc       INT NOT NULL,
  MaDonVi         INT NOT NULL,
  GiaBan          DECIMAL(18,2) NOT NULL,
  SoLuongTon      INT NOT NULL DEFAULT 0,
  MucTonToiThieu  INT NOT NULL DEFAULT 0,
  TrangThai       TINYINT(1) NOT NULL DEFAULT 1, -- 1: đang kinh doanh, 0: ngừng
  NgayTao         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_SanPham_GiaBan     CHECK (GiaBan > 0),
  CONSTRAINT ck_SanPham_SoLuongTon CHECK (SoLuongTon >= 0),
  CONSTRAINT ck_SanPham_MucTon     CHECK (MucTonToiThieu >= 0),
  FOREIGN KEY (MaDanhMuc) REFERENCES DanhMuc(MaDanhMuc),
  FOREIGN KEY (MaDonVi)   REFERENCES DonViTinh(MaDonVi)
);

CREATE TABLE PhieuNhap (
  MaPhieuNhap   INT AUTO_INCREMENT PRIMARY KEY,
  MaNCC         INT NOT NULL,
  MaNguoiDung   INT NOT NULL,                 -- người lập
  NgayNhap      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TrangThai     VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  TongTien      DECIMAL(18,2) NOT NULL DEFAULT 0,
  GhiChu        VARCHAR(500),
  NguoiXacNhan  INT NULL,
  NgayXacNhan   DATETIME NULL,
  CONSTRAINT ck_PhieuNhap_TrangThai CHECK (TrangThai IN ('DRAFT','COMPLETED','CANCELLED')),
  FOREIGN KEY (MaNCC)        REFERENCES NhaCungCap(MaNCC),
  FOREIGN KEY (MaNguoiDung)  REFERENCES NguoiDung(MaNguoiDung),
  FOREIGN KEY (NguoiXacNhan) REFERENCES NguoiDung(MaNguoiDung)
);

CREATE TABLE ChiTietPhieuNhap (
  MaChiTietNhap  INT AUTO_INCREMENT PRIMARY KEY,
  MaPhieuNhap    INT NOT NULL,
  MaSanPham      INT NOT NULL,
  SoLuong        INT NOT NULL,
  DonGiaNhap     DECIMAL(18,2) NOT NULL,
  ThanhTien      DECIMAL(18,2) GENERATED ALWAYS AS (SoLuong * DonGiaNhap) STORED,
  CONSTRAINT uq_CTPN UNIQUE (MaPhieuNhap, MaSanPham),
  CONSTRAINT ck_CTPN_SoLuong CHECK (SoLuong > 0),
  CONSTRAINT ck_CTPN_DonGia  CHECK (DonGiaNhap > 0),
  FOREIGN KEY (MaPhieuNhap) REFERENCES PhieuNhap(MaPhieuNhap),
  FOREIGN KEY (MaSanPham)   REFERENCES SanPham(MaSanPham)
);

CREATE TABLE HoaDon (
  MaHoaDon      INT AUTO_INCREMENT PRIMARY KEY,
  MaKhachHang   INT NOT NULL,
  MaNguoiDung   INT NOT NULL,                 -- nhân viên lập
  NgayBan       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TrangThai     VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  TongTien      DECIMAL(18,2) NOT NULL DEFAULT 0,
  GhiChu        VARCHAR(500),
  NguoiXacNhan  INT NULL,
  NgayXacNhan   DATETIME NULL,
  CONSTRAINT ck_HoaDon_TrangThai CHECK (TrangThai IN ('DRAFT','COMPLETED','CANCELLED')),
  FOREIGN KEY (MaKhachHang)  REFERENCES KhachHang(MaKhachHang),
  FOREIGN KEY (MaNguoiDung)  REFERENCES NguoiDung(MaNguoiDung),
  FOREIGN KEY (NguoiXacNhan) REFERENCES NguoiDung(MaNguoiDung)
);

CREATE TABLE ChiTietHoaDon (
  MaChiTietBan  INT AUTO_INCREMENT PRIMARY KEY,
  MaHoaDon      INT NOT NULL,
  MaSanPham     INT NOT NULL,
  SoLuong       INT NOT NULL,
  DonGiaBan     DECIMAL(18,2) NOT NULL,
  ThanhTien     DECIMAL(18,2) GENERATED ALWAYS AS (SoLuong * DonGiaBan) STORED,
  CONSTRAINT uq_CTHD UNIQUE (MaHoaDon, MaSanPham),
  CONSTRAINT ck_CTHD_SoLuong CHECK (SoLuong > 0),
  CONSTRAINT ck_CTHD_DonGia  CHECK (DonGiaBan > 0),
  FOREIGN KEY (MaHoaDon)  REFERENCES HoaDon(MaHoaDon),
  FOREIGN KEY (MaSanPham) REFERENCES SanPham(MaSanPham)
);

CREATE TABLE PhieuKiemKe (
  MaPhieuKiemKe  INT AUTO_INCREMENT PRIMARY KEY,
  MaNguoiDung    INT NOT NULL,                -- người lập
  NgayKiemKe     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TrangThai      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  GhiChu         VARCHAR(500),
  NguoiXacNhan   INT NULL,
  NgayXacNhan    DATETIME NULL,
  CONSTRAINT ck_PhieuKiemKe_TrangThai CHECK (TrangThai IN ('DRAFT','COMPLETED','CANCELLED')),
  FOREIGN KEY (MaNguoiDung)  REFERENCES NguoiDung(MaNguoiDung),
  FOREIGN KEY (NguoiXacNhan) REFERENCES NguoiDung(MaNguoiDung)
);

CREATE TABLE ChiTietKiemKe (
  MaChiTietKiemKe  INT AUTO_INCREMENT PRIMARY KEY,
  MaPhieuKiemKe    INT NOT NULL,
  MaSanPham        INT NOT NULL,
  SoLuongHeThong   INT NOT NULL DEFAULT 0,    -- trigger điền khi thêm, SP chốt lại khi xác nhận
  SoLuongThucTe    INT NULL,                  -- NULL = chưa đếm
  ChenhLech        INT GENERATED ALWAYS AS (SoLuongThucTe - SoLuongHeThong) STORED,
  LyDo             VARCHAR(300),
  CONSTRAINT uq_CTKK UNIQUE (MaPhieuKiemKe, MaSanPham),
  CONSTRAINT ck_CTKK_ThucTe CHECK (SoLuongThucTe IS NULL OR SoLuongThucTe >= 0),
  FOREIGN KEY (MaPhieuKiemKe) REFERENCES PhieuKiemKe(MaPhieuKiemKe),
  FOREIGN KEY (MaSanPham)     REFERENCES SanPham(MaSanPham)
);

CREATE TABLE LichSuBienDong (
  MaBienDong      INT AUTO_INCREMENT PRIMARY KEY,
  MaSanPham       INT NOT NULL,
  LoaiBienDong    VARCHAR(20) NOT NULL,
  SoLuongThayDoi  INT NOT NULL,               -- dương: tăng, âm: giảm
  TonSauBienDong  INT NOT NULL,
  MaPhieuNhap     INT NULL,
  MaHoaDon        INT NULL,
  MaPhieuKiemKe   INT NULL,
  MaNguoiDung     INT NOT NULL,               -- người xác nhận chứng từ
  NgayBienDong    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  GhiChu          VARCHAR(300),
  CONSTRAINT ck_LSBD_Loai CHECK (LoaiBienDong IN ('IMPORT','EXPORT','ADJUST')),
  -- Mỗi biến động gắn với đúng một chứng từ, khớp với loại biến động
  CONSTRAINT ck_LSBD_ChungTu CHECK (
       (LoaiBienDong = 'IMPORT' AND MaPhieuNhap IS NOT NULL AND MaHoaDon IS NULL AND MaPhieuKiemKe IS NULL)
    OR (LoaiBienDong = 'EXPORT' AND MaHoaDon IS NOT NULL AND MaPhieuNhap IS NULL AND MaPhieuKiemKe IS NULL)
    OR (LoaiBienDong = 'ADJUST' AND MaPhieuKiemKe IS NOT NULL AND MaPhieuNhap IS NULL AND MaHoaDon IS NULL)
  ),
  FOREIGN KEY (MaSanPham)     REFERENCES SanPham(MaSanPham),
  FOREIGN KEY (MaPhieuNhap)   REFERENCES PhieuNhap(MaPhieuNhap),
  FOREIGN KEY (MaHoaDon)      REFERENCES HoaDon(MaHoaDon),
  FOREIGN KEY (MaPhieuKiemKe) REFERENCES PhieuKiemKe(MaPhieuKiemKe),
  FOREIGN KEY (MaNguoiDung)   REFERENCES NguoiDung(MaNguoiDung),
  INDEX ix_LSBD_SanPham_Ngay (MaSanPham, NgayBienDong),
  INDEX ix_LSBD_Ngay (NgayBienDong)
);

CREATE INDEX ix_HoaDon_TrangThai_Ngay    ON HoaDon (TrangThai, NgayXacNhan);
CREATE INDEX ix_PhieuNhap_TrangThai_Ngay ON PhieuNhap (TrangThai, NgayXacNhan);
