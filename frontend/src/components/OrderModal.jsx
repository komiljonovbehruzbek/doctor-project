import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import { MapPin, CheckCircle2, Loader2 } from "lucide-react";

export default function OrderModal({ open, onClose, product }) {
  const { user, register } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState("register"); // register | login | order
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (user && user !== false && open) {
      setMode("order");
    }
  }, [user, open]);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Brauzeringiz lokatsiyani qo'llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success(t("order.location_captured"));
      },
      () => {
        setLocating(false);
        toast.error("Lokatsiya olinmadi");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({
        email,
        password,
        name,
        phone,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      setMode("order");
      toast.success("Akkaunt yaratildi");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/orders", {
        product_id: product.id,
        quantity: qty,
        note,
        address,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      toast.success(t("order.success"));
      onClose();
      // reset
      setNote("");
      setAddress("");
      setQty(1);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-white border-stone-200 rounded-none p-0" data-testid="order-modal">
        <div className="aspect-[16/8] bg-stone-100 overflow-hidden">
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-8">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl font-light tracking-tight">
              {mode === "order" ? t("order.title") : t("order.register_first")}
            </DialogTitle>
          </DialogHeader>
          <p className="eyebrow mt-2">{product.name} · {product.price.toLocaleString()} UZS</p>

          {mode === "register" && (
            <form onSubmit={submitRegister} className="mt-6 space-y-5">
              <input
                data-testid="order-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("order.name")}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base placeholder-stone-400"
              />
              <input
                data-testid="order-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("order.email")}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base placeholder-stone-400"
              />
              <input
                data-testid="order-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t("order.password")}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base placeholder-stone-400"
              />
              <input
                data-testid="order-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder={t("order.phone")}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base placeholder-stone-400"
              />

              <button
                type="button"
                data-testid="order-location-btn"
                onClick={captureLocation}
                className="flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-stone-700 hover:text-[#c25e3e]"
              >
                {locating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : coords ? (
                  <CheckCircle2 className="w-4 h-4 text-[#687157]" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                {coords ? t("order.location_captured") : t("order.get_location")}
              </button>

              <button
                type="submit"
                disabled={busy}
                data-testid="order-register-submit"
                className="w-full btn-brand py-4 text-[12px] uppercase tracking-[0.25em] font-medium disabled:opacity-50"
              >
                {busy ? "..." : t("order.place_order")}
              </button>

              <div className="text-center text-xs text-stone-500">
                {t("order.already_have")}{" "}
                <button type="button" onClick={() => setMode("login")} className="text-[#c25e3e] underline-offset-2 hover:underline">
                  {t("order.sign_in")}
                </button>
              </div>
            </form>
          )}

          {mode === "login" && <LoginInModal onSwitch={() => setMode("register")} onLoggedIn={() => setMode("order")} />}

          {mode === "order" && (
            <form onSubmit={submitOrder} className="mt-6 space-y-5">
              <div className="flex gap-4 items-center">
                <label className="eyebrow">{t("order.quantity")}</label>
                <input
                  data-testid="order-qty-input"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-20 bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-2 outline-none text-base"
                />
              </div>
              <input
                data-testid="order-address-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("order.address")}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base placeholder-stone-400"
              />
              <textarea
                data-testid="order-note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("order.note")}
                rows={3}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base placeholder-stone-400 resize-none"
              />
              <button
                type="button"
                onClick={captureLocation}
                data-testid="order-location-btn-2"
                className="flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-stone-700 hover:text-[#c25e3e]"
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : coords ? <CheckCircle2 className="w-4 h-4 text-[#687157]" /> : <MapPin className="w-4 h-4" />}
                {coords ? t("order.location_captured") : t("order.get_location")}
              </button>

              <div className="flex justify-between text-sm py-3 border-t border-stone-200">
                <span className="text-stone-500">Jami</span>
                <span className="font-medium">{(product.price * qty).toLocaleString()} UZS</span>
              </div>

              <button
                type="submit"
                disabled={busy}
                data-testid="order-submit-btn"
                className="w-full btn-brand py-4 text-[12px] uppercase tracking-[0.25em] font-medium disabled:opacity-50"
              >
                {busy ? "..." : t("order.place_order")}
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoginInModal({ onSwitch, onLoggedIn }) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      onLoggedIn();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <input
        data-testid="modal-login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder={t("auth.email")}
        className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base"
      />
      <input
        data-testid="modal-login-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder={t("auth.password")}
        className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none text-base"
      />
      <button
        type="submit"
        disabled={busy}
        data-testid="modal-login-submit"
        className="w-full btn-brand py-4 text-[12px] uppercase tracking-[0.25em] font-medium disabled:opacity-50"
      >
        {busy ? "..." : t("auth.submit_login")}
      </button>
      <div className="text-center text-xs text-stone-500">
        {t("auth.no_account")}{" "}
        <button type="button" onClick={onSwitch} className="text-[#c25e3e] hover:underline">
          {t("auth.register_here")}
        </button>
      </div>
    </form>
  );
}
