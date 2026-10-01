# Deploy demo miễn phí

```
Trình duyệt ──► Vercel (React)  ──►  Render (Node API)  ──►  Aiven (MySQL)
```

| Phần | Dịch vụ | Gói free | Lưu ý |
|---|---|---|---|
| Frontend | Vercel | Hobby | Build từ thư mục `frontend` |
| Backend | Render | Free web service | Ngủ sau 15 phút không có truy cập, lần đầu mở lại chờ ~1 phút |
| MySQL | Aiven | Free (1 GB) | Không cần thẻ |

Làm theo thứ tự **Aiven → Render → Vercel**, vì bước sau cần địa chỉ của bước trước.

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

## 2. Render – chạy backend

1. Đăng ký https://dashboard.render.com bằng GitHub → **New** → **Blueprint** → chọn repo `qltk-noithat`.
   Render đọc file `render.yaml` và tạo service `qltk-backend`.
2. Điền biến môi trường được hỏi:

   | Biến | Giá trị |
   |---|---|
   | `DB_HOST`, `DB_PORT` | lấy từ Aiven |
   | `DB_USER`, `DB_PASSWORD` | `qltk_app` + mật khẩu đã đặt ở bước 1 |
   | `CORS_ORIGIN` | tạm để `*`, sửa sau khi có domain Vercel |

   `JWT_SECRET` được Render tự sinh.
3. Đợi deploy xong, mở `https://<tên-service>.onrender.com/api/health` → phải thấy `{"status":"ok"}`.

## 3. Vercel – chạy frontend

1. Đăng ký https://vercel.com bằng GitHub → **Add New** → **Project** → chọn repo `qltk-noithat`.
2. **Root Directory**: `frontend`. Framework tự nhận là Vite.
3. **Environment Variables**: `VITE_API_URL` = `https://<tên-service>.onrender.com/api`
4. **Deploy**. Xong sẽ có địa chỉ dạng `https://qltk-noithat.vercel.app`.
5. Quay lại Render, đổi `CORS_ORIGIN` thành đúng địa chỉ Vercel đó (không có dấu `/` ở cuối) rồi lưu, Render sẽ tự deploy lại.

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
