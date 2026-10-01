import { HttpError } from './errors.js';

export function toInt(value, field, { required = true, min } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `Thiếu ${field}`);
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) throw new HttpError(400, `${field} phải là số nguyên`);
  if (min !== undefined && n < min) throw new HttpError(400, `${field} phải lớn hơn hoặc bằng ${min}`);
  return n;
}

export function toNumber(value, field, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `Thiếu ${field}`);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${field} phải là số`);
  return n;
}

export function toStr(value, field, { required = false, max } = {}) {
  const s = value === undefined || value === null ? '' : String(value).trim();
  if (!s) {
    if (required) throw new HttpError(400, `Thiếu ${field}`);
    return null;
  }
  if (max && s.length > max) throw new HttpError(400, `${field} tối đa ${max} ký tự`);
  return s;
}

export function toDate(value, field, { required = true } = {}) {
  if (!value) {
    if (required) throw new HttpError(400, `Thiếu ${field}`);
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, `${field} phải có dạng YYYY-MM-DD`);
  return value;
}

export function pagination(q) {
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}
