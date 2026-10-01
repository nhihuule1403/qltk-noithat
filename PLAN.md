# Kế hoạch – Web quản lý tồn kho cửa hàng nội thất (Nhóm 1)

Stack: React (Vite + Ant Design) · Node.js (Express 5) · MySQL 8.4 · Docker Compose

## Quyết định thiết kế

| Vấn đề | Quyết định |
|---|---|
| Logic tồn kho | Nằm trong MySQL (stored procedure + trigger). Node chỉ gọi `CALL sp_...` và trả lỗi `SIGNAL` về client. |
| Mã trạng thái | Lưu mã không dấu: `DRAFT` / `COMPLETED` / `CANCELLED`; biến động `IMPORT` / `EXPORT` / `ADJUST`. Frontend hiển thị tiếng Việt. |
| Chứng từ gốc của biến động | 3 cột FK có thể NULL (`MaPhieuNhap`, `MaHoaDon`, `MaPhieuKiemKe`) + CHECK đúng một cột có giá trị (thay cho MaChungTu đa hình). |
| Người chịu trách nhiệm | Chứng từ có `NguoiXacNhan`, `NgayXacNhan`; `LichSuBienDong` có `MaNguoiDung`. |
| Hủy chứng từ | Thêm trạng thái `CANCELLED` (chỉ hủy được khi còn `DRAFT`). |
| Tồn đầu kỳ | Dùng phiếu kiểm kê đầu kỳ (sản phẩm mới tồn = 0). |
| Khách lẻ | Bản ghi KhachHang mã 1 "Khách lẻ". |
| Mật khẩu | bcrypt ở Node (bỏ `fn_BamMatKhau` SHA2). |
| Phân quyền | JWT + middleware theo vai trò ở Node. Tài khoản MySQL của ứng dụng (`qltk_app`) chỉ được cấp quyền tối thiểu: không được ghi `SoLuongTon`, `TrangThai` chứng từ, `LichSuBienDong` — chỉ thay đổi được qua SP (`SQL SECURITY DEFINER`, tương đương ownership chaining). |
| Kiểm kê | Số lượng hệ thống được chốt lại tại thời điểm **xác nhận**. |
| Đồng thời | SP xác nhận dùng transaction + `SELECT ... FOR UPDATE` trên SanPham. |
| Ngoài phạm vi | Trả hàng, nhiều kho, biến thể sản phẩm. |

## Giai đoạn

1. **CSDL + Docker** – `db/init/*.sql` (schema, trigger, function, SP, view báo cáo, phân quyền, seed), `docker-compose.yml`.
2. **Backend** – auth (JWT), CRUD danh mục/đơn vị/sản phẩm/NCC/khách hàng/người dùng, phiếu nhập, hóa đơn, kiểm kê, lịch sử biến động, 5 báo cáo + đề xuất nhập hàng + đối soát tồn.
3. **Frontend** – đăng nhập, menu theo vai trò, các màn hình tương ứng, dashboard cảnh báo tồn thấp, xuất CSV.
4. **Kiểm thử end-to-end** – chạy compose, đi hết luồng nhập → bán → kiểm kê → báo cáo.
5. **Deploy demo** – AWS EC2 + docker-compose, hoặc Vercel + Render + Aiven.

## Ánh xạ với báo cáo

| Báo cáo (chương 4) | Bản MySQL |
|---|---|
| SP1–SP5 | `sp_ThemSanPham`, `sp_ThemChiTietPhieuNhap`, `sp_XacNhanPhieuNhap`, `sp_XacNhanHoaDon`, `sp_XacNhanPhieuKiemKe` (+ `sp_HuyChungTu`) |
| T1–T5 | trigger BEFORE/AFTER theo dòng (MySQL không có INSTEAD OF, không có trigger theo tập) |
| F1 fn_BamMatKhau | bỏ, thay bằng bcrypt ở Node |
| F2 fn_TonKhoTaiThoiDiem | giữ nguyên |
| F3 fn_NhapXuatTon | MySQL không có hàm trả về bảng → gộp vào `sp_BaoCaoNhapXuatTon` |
| C1, C2 | `sp_DeXuatNhapHang`, `sp_DoiSoatTonKho` (cursor) |
| R1–R5 | `vw_BaoCaoTonKhoHienTai` + 4 SP báo cáo |
| BULK INSERT / bcp / FOR JSON | import CSV khách hàng & xuất CSV qua web |
| BACKUP / RESTORE | `db/backup.sh` (mysqldump, kiểm tra file, giữ 7 ngày, cron mỗi giờ) + `db/restore.sh` |
