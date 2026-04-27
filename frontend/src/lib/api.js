import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
});

// Attach Bearer fallback if cookie isn't sent (cross-site cookie blockers)
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("aura_access_token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export const setAccessToken = (token) => {
  if (token) localStorage.setItem("aura_access_token", token);
  else localStorage.removeItem("aura_access_token");
};

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Xatolik yuz berdi. Qayta urinib ko'ring.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const API_BASE = `${BASE}/api`;
