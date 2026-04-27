import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      const target = loc.state?.from || (
        u.role === "director" ? "/director" :
        u.role === "admin" ? "/admin" :
        u.role === "worker" ? "/worker" : "/"
      );
      nav(target, { replace: true });
      toast.success("Xush kelibsiz, " + (u.name || ""));
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]" data-testid="login-page">
      <div className="hidden lg:block grain bg-[#e7e1d8] relative">
        <img src="https://images.unsplash.com/photo-1613526513504-e8585909d91c?crop=entropy&cs=srgb&fm=jpg&q=85" alt="" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="flex items-center justify-center p-6 lg:p-20">
        <div className="w-full max-w-md">
          <div className="eyebrow">{t("auth.login_title")}</div>
          <h1 className="font-serif text-5xl font-light tracking-tight mt-4">Welcome back</h1>
          <form onSubmit={submit} className="mt-12 space-y-6">
            <input
              data-testid="login-email-input"
              type="email"
              required
              placeholder={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base"
            />
            <input
              data-testid="login-password-input"
              type="password"
              required
              placeholder={t("auth.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base"
            />
            <button
              type="submit"
              disabled={busy}
              data-testid="login-submit-btn"
              className="w-full btn-brand py-4 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50"
            >
              {busy ? "..." : t("auth.submit_login")}
            </button>
            <div className="text-sm text-stone-500 text-center">
              {t("auth.no_account")}{" "}
              <Link to="/register" className="text-[#c25e3e] hover:underline">
                {t("auth.register_here")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
