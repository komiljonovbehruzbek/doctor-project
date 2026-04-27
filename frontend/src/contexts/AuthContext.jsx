import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAccessToken } from "../lib/api";

const AuthCtx = createContext(null);

export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = not auth, object = auth
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (e) {
      setUser(false);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) setAccessToken(data.access_token);
    setUser(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data.access_token) setAccessToken(data.access_token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore
    }
    setAccessToken(null);
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh: fetchMe }}>
      {children}
    </AuthCtx.Provider>
  );
}
