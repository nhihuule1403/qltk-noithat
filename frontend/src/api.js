import axios from 'axios';

export const TOKEN_KEY = 'qltk_token';

export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* bỏ qua khi trình duyệt chặn storage */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
  },
};

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) onUnauthorized();
    return Promise.reject(err);
  },
);

export const errorMessage = (err) => err.response?.data?.message || err.message || 'Đã có lỗi xảy ra';

// Tải file CSV từ API báo cáo (kèm token)
export async function downloadCsv(url, params, filename) {
  const res = await api.get(url, { params: { ...params, format: 'csv' }, responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(res.data);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
