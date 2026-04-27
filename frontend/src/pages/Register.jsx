import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import { MapPin, CheckCircle2, Loader2 } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const captureLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ ...form, lat: coords?.lat, lng: coords?.lng });
      toast.success("Akkaunt yaratildi");
      nav("/");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]" data-testid="register-page">
      <div className="flex items-center justify-center p-6 lg:p-20 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <div className="eyebrow">{t("auth.register_title")}</div>
          <h1 className="font-serif text-5xl font-light tracking-tight mt-4">Join Aura</h1>
          <form onSubmit={submit} className="mt-12 space-y-6">
            <input data-testid="register-name-input" required placeholder={t("auth.name")} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base" />
            <input data-testid="register-email-input" type="email" required placeholder={t("auth.email")} value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base" />
            <input data-testid="register-password-input" type="password" required placeholder={t("auth.password")} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base" />
            <input data-testid="register-phone-input" type="tel" required placeholder={t("auth.phone")} value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base" />

            <button type="button" data-testid="register-location-btn" onClick={captureLocation}
              className="flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-stone-700 hover:text-[#c25e3e]">
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : coords ? <CheckCircle2 className="w-4 h-4 text-[#687157]" /> : <MapPin className="w-4 h-4" />}
              {coords ? t("order.location_captured") : t("order.get_location")}
            </button>

            <button type="submit" disabled={busy} data-testid="register-submit-btn"
              className="w-full btn-brand py-4 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50">
              {busy ? "..." : t("auth.submit_register")}
            </button>

            <div className="text-sm text-stone-500 text-center">
              {t("auth.have_account")}{" "}
              <Link to="/login" className="text-[#c25e3e] hover:underline">
                {t("auth.login_here")}
              </Link>
            </div>
          </form>
        </div>
      </div>
      <div className="hidden lg:block grain bg-[#e7e1d8] order-1 lg:order-2 relative">
        <img src="https://images.unsplash.com/photo-1773015806006-addf313bda7a?crop=entropy&cs=srgb&fm=jpg&q=85" alt="" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
}
