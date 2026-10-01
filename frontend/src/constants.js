import dayjs from 'dayjs';

export const ROLE = { ADMIN: 'ADMIN', KHO: 'KHO', BANHANG: 'BANHANG' };

export const DOC_STATUS = {
  DRAFT: { label: 'Nháp', color: 'gold' },
  COMPLETED: { label: 'Hoàn thành', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};
export const CHECK_STATUS = { ...DOC_STATUS, COMPLETED: { label: 'Đã xác nhận', color: 'green' } };

export const MOVEMENT_TYPE = {
  IMPORT: { label: 'Nhập', color: 'blue' },
  EXPORT: { label: 'Xuất', color: 'volcano' },
  ADJUST: { label: 'Điều chỉnh', color: 'purple' },
};

export const STOCK_STATUS = {
  HET_HANG: { label: 'Hết hàng', color: 'red' },
  TON_THAP: { label: 'Tồn thấp', color: 'orange' },
  DU_HANG: { label: 'Đủ hàng', color: 'green' },
};

export const money = (v) => (v == null ? '' : `${Number(v).toLocaleString('vi-VN')} ₫`);
export const num = (v) => (v == null ? '' : Number(v).toLocaleString('vi-VN'));
export const dateTime = (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '');
export const date = (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '');
