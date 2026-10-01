# Quản lý tồn kho cửa hàng nội thất – Nhóm 1

Web quản lý tồn kho cho đồ án môn Quản lý thông tin.
React (Vite + Ant Design) · Node.js (Express 5) · MySQL 8.4 · Docker Compose.

## Chạy nhanh bằng Docker

```bash
cp .env.example .env        # đổi mật khẩu trong .env
docker compose up -d --build   # bản cũ: docker-compose up -d --build
```

- Web: http://localhost:8080
- API: http://localhost:4000/api/health
- MySQL: `localhost:3307` (root / `MYSQL_ROOT_PASSWORD`)

Lần chạy đầu tiên, MySQL tự chạy các script trong `db/init/`: tạo bảng, trigger, stored procedure,
báo cáo, tài khoản ứng dụng và dữ liệu mẫu (06/2026 – 09/2026). Muốn tạo lại CSDL từ đầu:

```bash
docker compose down -v && docker compose up -d
```

### Tài khoản mẫu (mật khẩu `123456`)

| Tài khoản | Vai trò |
|---|---|
| `admin` | Quản trị viên |
| `kho1`, `kho2` | Nhân viên kho |
| `banhang1`, `banhang2` | Nhân viên bán hàng |

## Chạy khi phát triển

```bash
docker compose up -d db                 # chỉ chạy MySQL
cd backend && cp .env.example .env && npm install && npm run dev    # http://localhost:4000
cd frontend && npm install && npm run dev                           # http://localhost:5173 (proxy /api → 4000)
```

## Cấu trúc

```
db/
  init/01_schema.sql       14 bảng, ràng buộc CHECK / UNIQUE / FK
  init/02_triggers.sql     T1–T7: chặn sửa chứng từ đã chốt, cập nhật tồn, ghi lịch sử
  init/03_procedures.sql   F2, SP1–SP5, hủy chứng từ, C1–C2 (cursor)
  init/04_reports.sql      R1 (view) + R2–R5 (stored procedure)
  init/05_security.sh      tài khoản MySQL quyền tối thiểu cho backend
  init/06_seed.sql         dữ liệu mẫu (sinh bởi db/seed/generate-seed.mjs)
  backup.sh / restore.sh   sao lưu, khôi phục
backend/src/
  routes/                  API theo chức năng
  lib/documentRouter.js    API dùng chung cho phiếu nhập / hóa đơn / phiếu kiểm kê
  middleware/auth.js       JWT + phân quyền theo vai trò
frontend/src/
  pages/                   các màn hình
  components/              layout, bảng CRUD, chi tiết chứng từ dùng chung
```

## Nguyên tắc nghiệp vụ

- Tồn kho **chỉ thay đổi qua chứng từ** (phiếu nhập, hóa đơn, phiếu kiểm kê) khi chuyển từ Nháp sang Hoàn thành.
  Tài khoản MySQL của backend không có quyền ghi cột `SoLuongTon`, `TrangThai` chứng từ hay bảng `LichSuBienDong`;
  các thao tác này chỉ đi qua stored procedure (`SQL SECURITY DEFINER`).
- Mỗi thay đổi tồn được ghi vào `LichSuBienDong`, kèm chứng từ gốc và người xác nhận. Lịch sử không sửa / xóa được.
- Hóa đơn không hoàn tất được nếu bán vượt tồn. SP xác nhận khóa dòng sản phẩm (`SELECT ... FOR UPDATE`) nên hai người bán cùng lúc không làm âm kho.
- Kiểm kê chốt số lượng hệ thống tại thời điểm xác nhận; dòng có chênh lệch bắt buộc ghi lý do.
- Tồn đầu kỳ được nhập bằng một phiếu kiểm kê (sản phẩm mới luôn có tồn = 0).
- Mã trạng thái lưu không dấu: `DRAFT` / `COMPLETED` / `CANCELLED`, biến động `IMPORT` / `EXPORT` / `ADJUST`.

Chi tiết các quyết định thiết kế và ánh xạ với báo cáo: xem [PLAN.md](PLAN.md).

## API chính

| Nhóm | Endpoint |
|---|---|
| Đăng nhập | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Danh mục | `/api/categories`, `/api/units`, `/api/suppliers`, `/api/customers` (+ `POST /import` CSV) |
| Sản phẩm | `GET/POST /api/products`, `PUT /api/products/:id`, `GET /api/products/:id/stock-at?time=` |
| Chứng từ | `/api/purchase-orders`, `/api/sales-invoices`, `/api/inventory-checks` — `GET`, `POST`, `PUT /:id`, `POST/PUT/DELETE /:id/lines[/:lineId]`, `POST /:id/confirm`, `POST /:id/cancel` |
| Lịch sử | `GET /api/stock-movements` |
| Báo cáo | `/api/reports/inventory`, `stock-summary`, `revenue`, `best-sellers`, `purchases-by-supplier` (`?tuNgay=&denNgay=`, thêm `&format=csv` để xuất file), `reorder-suggestions`, `reconciliation`, `dashboard` |
| Tài khoản | `/api/users` (chỉ Quản trị viên) |

## Sao lưu

```bash
./db/backup.sh                                   # tạo backups/qltk_<thời gian>.sql.gz
./db/restore.sh backups/qltk_20260930_230000.sql.gz
```

Đặt cron chạy `backup.sh` mỗi giờ để dữ liệu mất tối đa khoảng một giờ (file cũ hơn 7 ngày tự xóa).

## Ghi chú

- Lỗi `docker-credential-desktop.exe not installed` trên WSL: xóa dòng `"credsStore": "desktop.exe"` trong `~/.docker/config.json`
  (hoặc bật lại tích hợp WSL của Docker Desktop).
- Sửa dữ liệu mẫu: chỉnh `db/seed/generate-seed.mjs`, chạy `node db/seed/generate-seed.mjs`, rồi tạo lại CSDL.
