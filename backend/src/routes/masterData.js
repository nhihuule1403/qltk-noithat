import { crudRouter } from '../lib/crud.js';
import { ROLES } from '../middleware/auth.js';

const { ADMIN, KHO, BANHANG } = ROLES;
const ALL = [ADMIN, KHO, BANHANG];

export const categoriesRouter = crudRouter({
  table: 'DanhMuc', pk: 'MaDanhMuc', label: 'Danh mục', orderBy: 'TenDanhMuc',
  fields: {
    TenDanhMuc: { label: 'Tên danh mục', required: true, max: 100 },
    MoTa: { label: 'Mô tả', max: 255 },
  },
  search: ['TenDanhMuc'],
  roles: { read: ALL, write: [ADMIN], delete: [ADMIN] },
});

export const unitsRouter = crudRouter({
  table: 'DonViTinh', pk: 'MaDonVi', label: 'Đơn vị tính', orderBy: 'TenDonVi',
  fields: { TenDonVi: { label: 'Tên đơn vị', required: true, max: 50 } },
  roles: { read: ALL, write: [ADMIN], delete: [ADMIN] },
});

export const suppliersRouter = crudRouter({
  table: 'NhaCungCap', pk: 'MaNCC', label: 'Nhà cung cấp', orderBy: 'TenNCC',
  fields: {
    TenNCC: { label: 'Tên nhà cung cấp', required: true, max: 200 },
    DiaChi: { label: 'Địa chỉ', max: 300 },
    SoDienThoai: { label: 'Số điện thoại', max: 20 },
    Email: { label: 'Email', max: 100 },
  },
  search: ['TenNCC', 'SoDienThoai', 'Email'],
  roles: { read: [ADMIN, KHO], write: [ADMIN, KHO], delete: [ADMIN] },
});
