import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, storage, TOKEN_KEY } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!storage.get(TOKEN_KEY));

  const logout = useCallback(() => {
    storage.remove(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!storage.get(TOKEN_KEY)) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (TenDangNhap, MatKhau) => {
    const res = await api.post('/auth/login', { TenDangNhap, MatKhau });
    storage.set(TOKEN_KEY, res.data.token);
    setUser(res.data.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, hasRole: (...roles) => !!user && roles.includes(user.VaiTro) }),
    [user, loading, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
