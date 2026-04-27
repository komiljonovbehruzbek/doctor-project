import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";

export default function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/questions", form);
      toast.success(t("contact.success"));
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 sm:px-12 lg:px-20 py-24" data-testid="contact-page">
      <div className="max-w-[900px] mx-auto">
        <div className="eyebrow">{t("nav.contact")}</div>
        <h1 className="font-serif text-5xl sm:text-6xl font-light tracking-tight mt-6">
          {t("contact.title")}
        </h1>
        <p className="mt-5 text-stone-600">{t("contact.sub")}</p>

        <form onSubmit={submit} className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
          <input
            data-testid="contact-name"
            placeholder={t("contact.name")}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none"
          />
          <input
            data-testid="contact-email"
            type="email"
            placeholder={t("contact.email")}
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none"
          />
          <input
            data-testid="contact-phone"
            placeholder={t("contact.phone")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none md:col-span-2"
          />
          <textarea
            data-testid="contact-message"
            placeholder={t("contact.message")}
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none md:col-span-2 resize-none"
          />
          <button
            type="submit"
            disabled={busy}
            data-testid="contact-submit"
            className="md:col-span-2 btn-brand py-4 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50"
          >
            {busy ? "..." : t("contact.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
