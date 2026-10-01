# Deploy demo miễn phí

```
Trình duyệt ──► Render static site (React) ──/api/*──► Render web service (Node API) ──► Aiven (MySQL)
```

| Phần | Dịch vụ | Gói free | Lưu ý |
|---|---|---|---|
| Frontend | Render static site | Free | Không ngủ, chuyển tiếp `/api/*` sang backend (không cần CORS) |
| Backend | Render web service | Free | Ngủ sau 15 phút không có truy cập, lần đầu mở lại chờ ~1 phút |
| MySQL | Aiven | Free (1 GB) | Không cần thẻ |

Cả frontend và backend được tạo cùng lúc từ file `render.yaml` (Blueprint).
Làm theo thứ tự **Aiven → Render**.

## 1. Aiven – tạo MySQL

1. Đăng ký tại https://console.aiven.io/signup → **Create service** → **MySQL** → chọn gói **Free**.
2. Đợi trạng thái **Running**, mở tab **Overview** và ghi lại: `Host`, `Port`, `User` (avnadmin), `Password`.
3. Khởi tạo CSDL từ máy của bạn (cần Node 18+):

   ```bash
   cd backend && npm install
   DB_HOST=<host> DB_PORT=<port> DB_ADMIN_USER=avnadmin DB_ADMIN_PASSWORD=<password> DB_SSL=true \
   APP_DB_USER=qltk_app APP_DB_PASSWORD=<mật-khẩu-mới-cho-app> \
   node scripts/init-db.mjs
   ```

   Kết quả đúng kết thúc bằng `Hoàn tất: { SanPham: 24, HoaDon: 265, ... }`.

   - Nếu báo `ER_BINLOG_CREATE_ROUTINE_NEED_SUPER`: Aiven không cho tạo trigger bằng tài khoản này.
     Chuyển sang **phương án B** bên dưới (trigger là phần bắt buộc của hệ thống).
   - Nếu báo không tạo được tài khoản `qltk_app`: vẫn deploy được, khi đó ở bước 2 dùng `avnadmin` cho `DB_USER`.

## 2. Render – backend + frontend

1. Đăng ký https://dashboard.render.com/register bằng GitHub → **New +** → **Blueprint** → chọn repo `qltk-noithat`.
   Render đọc `render.yaml` và tạo 2 service: `qltk-backend` và `qltk-frontend`.
2. Điền biến môi trường được hỏi cho `qltk-backend`:

   | Biến | Giá trị |
   |---|---|
   | `DB_HOST`, `DB_PORT` | lấy từ Aiven |
   | `DB_USER`, `DB_PASSWORD` | `qltk_app` + mật khẩu đã đặt ở bước 1 |

   `JWT_SECRET` được Render tự sinh.
3. **Apply**, đợi cả 2 service ở trạng thái **Live**.
4. Mở `qltk-backend`, xem địa chỉ ở đầu trang:
   - Nếu đúng là `https://qltk-backend.onrender.com` → không cần làm gì.
   - Nếu khác (ví dụ `https://qltk-backend-ab12.onrender.com`) → mở `qltk-frontend` → **Redirects/Rewrites**,
     sửa dòng `/api/*` thành `https://qltk-backend-ab12.onrender.com/api/*` → **Save**.
5. Mở địa chỉ của `qltk-frontend` (dạng `https://qltk-frontend.onrender.com`) và đăng nhập.

## 3. Kiểm tra

- `https://<frontend>/api/health` phải trả `{"status":"ok"}` (đi qua luật chuyển tiếp tới backend).
- Lần đầu sau khi backend ngủ có thể chờ khoảng 1 phút.

## 4. Trước khi gửi link cho giảng viên

- Đăng nhập `admin` → **Tài khoản** → đặt lại mật khẩu cho các tài khoản mẫu (mật khẩu `123456` đang công khai trên GitHub).
- Mở web trước buổi demo vài phút để Render thức dậy.

## Phương án B – một máy ảo chạy docker-compose

Dùng khi Aiven không cho tạo trigger. Cần một máy ảo Linux có Docker
(Oracle Cloud Always Free hoặc AWS EC2 – đều cần thẻ để đăng ký):

```bash
git clone https://github.com/nhihuule1403/qltk-noithat.git && cd qltk-noithat
cp .env.example .env    # đổi mật khẩu, JWT_SECRET
docker compose up -d --build
```

Mở cổng 80 hoặc 8080 trong firewall / security group của máy ảo. **Không** mở cổng MySQL (3307) ra Internet.
Nếu không có máy ảo, có thể chạy trên laptop và mở ra Internet bằng Cloudflare Tunnel:
`cloudflared tunnel --url http://localhost:8080`.
