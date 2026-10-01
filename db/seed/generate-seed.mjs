// Sinh dữ liệu mẫu cho db/init/06_seed.sql (chạy: node db/seed/generate-seed.mjs)
// Mô phỏng hoạt động cửa hàng từ 01/06/2026 đến 28/09/2026 theo thứ tự thời gian:
// chứng từ được tạo ở trạng thái Nháp rồi chuyển Hoàn thành để trigger tự
// cập nhật tồn kho và ghi LichSuBienDong, nên dữ liệu luôn nhất quán.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// PRNG cố định để mỗi lần sinh ra cùng một bộ dữ liệu
let seed = 20260601;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

// Mật khẩu mặc định của mọi tài khoản mẫu: 123456
const PASSWORD_HASH = '$2b$10$RsA3zEbd0e//GOlDUOqAEu6eYXc4AHoV.e8Fm2BT56euDXf8h0Etu';

const roles = [
  [1, 'ADMIN', 'Quản trị viên', 'Quản lý tài khoản, dữ liệu cơ bản; toàn quyền'],
  [2, 'KHO', 'Nhân viên kho', 'Nhập hàng, theo dõi tồn kho, kiểm kê và điều chỉnh'],
  [3, 'BANHANG', 'Nhân viên bán hàng', 'Quản lý khách hàng, lập hóa đơn bán hàng'],
];
const users = [
  [1, 'admin', 'Quản Trị Viên', 'admin@noithat.local', 1],
  [2, 'kho1', 'Trần Văn Kho', 'kho1@noithat.local', 2],
  [3, 'kho2', 'Lê Thị Hàng', 'kho2@noithat.local', 2],
  [4, 'banhang1', 'Nguyễn Thị Bán', 'banhang1@noithat.local', 3],
  [5, 'banhang2', 'Phạm Minh Khách', 'banhang2@noithat.local', 3],
];
const KHO = [2, 3];
const BANHANG = [4, 5];

const categories = [
  [1, 'Ghế', 'Ghế văn phòng, ghế ăn, ghế trang điểm'],
  [2, 'Bàn', 'Bàn làm việc, bàn ăn, bàn trà'],
  [3, 'Tủ', 'Tủ quần áo, tủ giày, tủ hồ sơ'],
  [4, 'Kệ', 'Kệ sách, kệ tivi, kệ trang trí'],
  [5, 'Giường', 'Giường ngủ các kích thước'],
  [6, 'Sofa', 'Sofa phòng khách'],
  [7, 'Nội thất khác', 'Gương, đèn, phụ kiện'],
];
const units = [[1, 'Cái'], [2, 'Bộ'], [3, 'Chiếc']];

// [MaSKU, Tên, MaDanhMuc, MaDonVi, GiaBan, MucTonToiThieu, GiaNhap]
const products = [
  ['GHE-VP-001', 'Ghế văn phòng lưới Ergo', 1, 3, 1850000, 5, 1200000],
  ['GHE-VP-002', 'Ghế giám đốc da cao cấp', 1, 3, 4500000, 3, 3100000],
  ['GHE-AN-001', 'Ghế ăn gỗ sồi', 1, 3, 950000, 8, 600000],
  ['GHE-TD-001', 'Ghế trang điểm nệm nhung', 1, 3, 1200000, 4, 750000],
  ['GHE-GL-001', 'Ghế gaming Pro', 1, 3, 3900000, 3, 2700000],
  ['BAN-LV-001', 'Bàn làm việc chân sắt 1m2', 2, 1, 2200000, 4, 1450000],
  ['BAN-LV-002', 'Bàn nâng hạ điện thông minh', 2, 1, 7900000, 2, 5600000],
  ['BAN-AN-001', 'Bộ bàn ăn 4 ghế gỗ tràm', 2, 2, 6500000, 2, 4300000],
  ['BAN-TR-001', 'Bàn trà mặt kính', 2, 1, 1650000, 3, 1000000],
  ['BAN-TD-001', 'Bàn trang điểm có gương', 2, 1, 2850000, 3, 1850000],
  ['TU-QA-001', 'Tủ quần áo 3 cánh MDF', 3, 1, 5200000, 2, 3500000],
  ['TU-QA-002', 'Tủ quần áo cửa lùa 1m8', 3, 1, 8900000, 2, 6200000],
  ['TU-GI-001', 'Tủ giày 4 tầng', 3, 1, 1450000, 4, 900000],
  ['TU-HS-001', 'Tủ hồ sơ sắt 2 cánh', 3, 1, 2600000, 2, 1750000],
  ['KE-SA-001', 'Kệ sách 5 tầng gỗ', 4, 1, 1350000, 4, 820000],
  ['KE-TV-001', 'Kệ tivi phòng khách 1m6', 4, 1, 3200000, 2, 2100000],
  ['KE-TT-001', 'Kệ trang trí treo tường', 4, 1, 450000, 10, 250000],
  ['GIU-001', 'Giường ngủ gỗ 1m6', 5, 3, 7500000, 2, 5000000],
  ['GIU-002', 'Giường tầng trẻ em', 5, 3, 6200000, 1, 4200000],
  ['SOF-001', 'Sofa băng 3 chỗ vải nỉ', 6, 2, 9800000, 1, 6800000],
  ['SOF-002', 'Sofa góc chữ L da', 6, 2, 15500000, 1, 11000000],
  ['KHAC-GU-001', 'Gương đứng toàn thân', 7, 3, 1100000, 4, 650000],
  ['KHAC-DE-001', 'Đèn cây đứng phòng khách', 7, 3, 890000, 4, 520000],
  ['KHAC-TH-001', 'Thảm trải sàn 1m6x2m3', 7, 3, 1250000, 3, 780000],
];

const suppliers = [
  [1, 'Công ty TNHH Nội Thất Hòa Phát Miền Nam', 'KCN Tân Tạo, Bình Tân, TP.HCM', '02837501234', 'sales@hoaphat-mn.vn'],
  [2, 'Xưởng Gỗ Bình Dương', 'Thuận An, Bình Dương', '02743765432', 'lienhe@gobinhduong.vn'],
  [3, 'Công ty CP Sofa Việt', 'Quận 12, TP.HCM', '02836227788', 'order@sofaviet.vn'],
  [4, 'Nội Thất Văn Phòng Ergo', 'Quận 7, TP.HCM', '02854123456', 'b2b@ergo.vn'],
  [5, 'Phụ Kiện Trang Trí Mộc An', 'Thủ Đức, TP.HCM', '0909123456', 'mocan@gmail.com'],
];
// Nhà cung cấp chính theo danh mục
const supplierByCategory = { 1: [4, 1], 2: [1, 2], 3: [2, 1], 4: [2, 5], 5: [2], 6: [3], 7: [5] };

const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Huỳnh'];
const midNames = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Hữu', 'Thanh', 'Quốc', 'Thu'];
const firstNames = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hạnh', 'Khánh', 'Linh', 'Mai', 'Nam', 'Phúc', 'Quân', 'Tâm', 'Vy'];
const districts = ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Thủ Đức'];
const customers = [[1, 'Khách lẻ', null, null]];
for (let i = 2; i <= 30; i++) {
  customers.push([
    i,
    `${pick(lastNames)} ${pick(midNames)} ${pick(firstNames)}`,
    `09${String(10000000 + i * 7919).slice(-8)}`,
    `${randInt(1, 300)} đường số ${randInt(1, 40)}, ${pick(districts)}, TP.HCM`,
  ]);
}

// ---------- Mô phỏng ----------
const out = [];
const emit = (s) => out.push(s);
const stock = products.map(() => 0);
let poId = 0, invId = 0, ckId = 0;

const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const at = (day, h, m) => { const d = new Date(day); d.setUTCHours(h, m, 0, 0); return d; };

function purchaseOrder(day, lines, { status = 'COMPLETED', note = null } = {}) {
  const id = ++poId;
  const user = pick(KHO);
  const created = at(day, 8, randInt(0, 59));
  const supplier = pick(supplierByCategory[products[lines[0][0]][2]]);
  emit(`INSERT INTO PhieuNhap (MaPhieuNhap, MaNCC, MaNguoiDung, NgayNhap, GhiChu) VALUES (${id}, ${supplier}, ${user}, '${fmt(created)}', ${q(note)});`);
  for (const [p, qty] of lines) {
    const price = Math.round(products[p][6] * (0.95 + rand() * 0.1) / 1000) * 1000;
    emit(`INSERT INTO ChiTietPhieuNhap (MaPhieuNhap, MaSanPham, SoLuong, DonGiaNhap) VALUES (${id}, ${p + 1}, ${qty}, ${price});`);
  }
  if (status !== 'DRAFT') {
    emit(`UPDATE PhieuNhap SET TrangThai = '${status}', NguoiXacNhan = ${user}, NgayXacNhan = '${fmt(at(day, 10, randInt(0, 59)))}' WHERE MaPhieuNhap = ${id};`);
    if (status === 'COMPLETED') for (const [p, qty] of lines) stock[p] += qty;
  }
}

function invoice(day, lines, { status = 'COMPLETED', customer = null } = {}) {
  const id = ++invId;
  const user = pick(BANHANG);
  const hour = randInt(9, 19);
  const cust = customer ?? (rand() < 0.35 ? 1 : randInt(2, customers.length));
  emit(`INSERT INTO HoaDon (MaHoaDon, MaKhachHang, MaNguoiDung, NgayBan) VALUES (${id}, ${cust}, ${user}, '${fmt(at(day, hour, randInt(0, 30)))}');`);
  for (const [p, qty] of lines) {
    emit(`INSERT INTO ChiTietHoaDon (MaHoaDon, MaSanPham, SoLuong, DonGiaBan) VALUES (${id}, ${p + 1}, ${qty}, ${products[p][4]});`);
  }
  if (status !== 'DRAFT') {
    emit(`UPDATE HoaDon SET TrangThai = '${status}', NguoiXacNhan = ${user}, NgayXacNhan = '${fmt(at(day, hour, randInt(31, 59)))}' WHERE MaHoaDon = ${id};`);
    if (status === 'COMPLETED') for (const [p, qty] of lines) stock[p] -= qty;
  }
}

function inventoryCheck(day, note, { status = 'COMPLETED', opening = false } = {}) {
  const id = ++ckId;
  const user = pick(KHO);
  emit(`INSERT INTO PhieuKiemKe (MaPhieuKiemKe, MaNguoiDung, NgayKiemKe, GhiChu) VALUES (${id}, ${user}, '${fmt(at(day, 17, 0))}', ${q(note)});`);
  products.forEach((pr, p) => {
    let actual = stock[p];
    let reason = null;
    if (opening) {
      actual = pr[5] * 2 + randInt(0, 4);
      reason = 'Tồn đầu kỳ khi đưa hệ thống vào sử dụng';
    } else if (rand() < 0.12 && stock[p] > 0) {
      const diff = rand() < 0.75 ? -1 : 1;
      actual = stock[p] + diff;
      reason = diff < 0 ? pick(['Hư hỏng khi vận chuyển nội bộ', 'Thất lạc, chưa xác định nguyên nhân', 'Trầy xước, chuyển hàng trưng bày'])
                        : 'Nhập kho thiếu chứng từ đợt trước';
    }
    emit(`INSERT INTO ChiTietKiemKe (MaPhieuKiemKe, MaSanPham, SoLuongThucTe, LyDo) VALUES (${id}, ${p + 1}, ${actual}, ${q(reason)});`);
    if (status === 'COMPLETED') stock[p] = actual;
  });
  if (status === 'COMPLETED') {
    emit(`UPDATE PhieuKiemKe SET TrangThai = 'COMPLETED', NguoiXacNhan = ${user}, NgayXacNhan = '${fmt(at(day, 17, 45))}' WHERE MaPhieuKiemKe = ${id};`);
  }
}

// Tồn đầu kỳ bằng phiếu kiểm kê ngày đầu tiên
inventoryCheck(new Date('2026-06-01'), 'Kiểm kê đầu kỳ', { opening: true });

const start = new Date('2026-06-02');
const end = new Date('2026-09-28');
// Vài mặt hàng ngừng bổ sung cuối kỳ để có cảnh báo tồn thấp
const stopRestock = new Set([1, 4, 6, 12, 16, 20]);

for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
  const day = new Date(d);
  const late = day >= new Date('2026-09-01');

  // Nhập hàng: các sản phẩm dưới 1,5 lần mức tối thiểu, gom theo danh mục
  if (day.getUTCDay() === 1 || day.getUTCDay() === 4) {
    const need = products.map((pr, p) => p).filter((p) => stock[p] <= products[p][5] * 1.5 && !(late && stopRestock.has(p)));
    const byCat = {};
    for (const p of need) (byCat[products[p][2]] ??= []).push(p);
    for (const ps of Object.values(byCat)) {
      purchaseOrder(day, ps.map((p) => [p, products[p][5] * 3 - stock[p] + randInt(0, 3)]));
    }
  }

  // Bán hàng: 1–4 hóa đơn/ngày, cuối tuần nhiều hơn
  const n = randInt(1, day.getUTCDay() === 0 || day.getUTCDay() === 6 ? 5 : 3);
  for (let i = 0; i < n; i++) {
    const lines = [];
    const k = randInt(1, 3);
    for (let j = 0; j < k; j++) {
      const p = randInt(0, products.length - 1);
      if (lines.some(([x]) => x === p)) continue;
      const qty = Math.min(products[p][4] > 5000000 ? 1 : randInt(1, 3), stock[p]);
      if (qty > 0) lines.push([p, qty]);
    }
    if (lines.length) invoice(day, lines);
  }

  // Kiểm kê cuối tháng
  const tomorrow = new Date(day); tomorrow.setUTCDate(day.getUTCDate() + 1);
  if (tomorrow.getUTCDate() === 1) inventoryCheck(day, `Kiểm kê cuối tháng ${day.getUTCMonth() + 1}/2026`);
}

// Một số chứng từ còn dang dở để demo
const lastDay = new Date('2026-09-29');
purchaseOrder(lastDay, [[1, 6], [6, 4]], { status: 'DRAFT', note: 'Chờ nhà cung cấp xác nhận giá' });
purchaseOrder(lastDay, [[20, 2]], { status: 'CANCELLED', note: 'Nhà cung cấp hết hàng' });
invoice(lastDay, [[0, 2], [14, 1]], { status: 'DRAFT', customer: 2 });

// ---------- Ghi file ----------
const header = [];
const h = (s) => header.push(s);
h('-- =============================================================');
h('-- Dữ liệu mẫu – SINH TỰ ĐỘNG bởi db/seed/generate-seed.mjs, không sửa tay');
h('-- Tài khoản: admin / kho1 / kho2 / banhang1 / banhang2, mật khẩu 123456');
h('-- =============================================================');
h('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;');
h('USE QLTonKhoNoiThat;');
h('SET time_zone = \'+07:00\';');
h('');
h('INSERT INTO VaiTro (MaVaiTro, KyHieu, TenVaiTro, MoTa) VALUES');
h(roles.map((r) => `  (${r[0]}, ${q(r[1])}, ${q(r[2])}, ${q(r[3])})`).join(',\n') + ';');
h('INSERT INTO NguoiDung (MaNguoiDung, TenDangNhap, MatKhau, HoTen, Email, MaVaiTro) VALUES');
h(users.map((u) => `  (${u[0]}, ${q(u[1])}, ${q(PASSWORD_HASH)}, ${q(u[2])}, ${q(u[3])}, ${u[4]})`).join(',\n') + ';');
h('INSERT INTO DanhMuc (MaDanhMuc, TenDanhMuc, MoTa) VALUES');
h(categories.map((c) => `  (${c[0]}, ${q(c[1])}, ${q(c[2])})`).join(',\n') + ';');
h('INSERT INTO DonViTinh (MaDonVi, TenDonVi) VALUES');
h(units.map((u) => `  (${u[0]}, ${q(u[1])})`).join(',\n') + ';');
h('INSERT INTO SanPham (MaSanPham, MaSKU, TenSanPham, MaDanhMuc, MaDonVi, GiaBan, MucTonToiThieu, NgayTao) VALUES');
h(products.map((p, i) => `  (${i + 1}, ${q(p[0])}, ${q(p[1])}, ${p[2]}, ${p[3]}, ${p[4]}, ${p[5]}, '2026-06-01 07:00:00')`).join(',\n') + ';');
h('INSERT INTO NhaCungCap (MaNCC, TenNCC, DiaChi, SoDienThoai, Email) VALUES');
h(suppliers.map((s) => `  (${s[0]}, ${s.slice(1).map(q).join(', ')})`).join(',\n') + ';');
h('INSERT INTO KhachHang (MaKhachHang, TenKhachHang, SoDienThoai, DiaChi) VALUES');
h(customers.map((c) => `  (${c[0]}, ${q(c[1])}, ${q(c[2])}, ${q(c[3])})`).join(',\n') + ';');
h('');
h('-- ---------- Nghiệp vụ theo thời gian ----------');

const target = fileURLToPath(new URL('../init/06_seed.sql', import.meta.url));
writeFileSync(target, header.concat(out).join('\n') + '\n');
console.log(`Đã ghi ${target}: ${poId} phiếu nhập, ${invId} hóa đơn, ${ckId} phiếu kiểm kê`);
