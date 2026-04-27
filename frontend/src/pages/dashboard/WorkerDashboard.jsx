import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, formatApiErrorDetail } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import {
  Clock,
  PlayCircle,
  StopCircle,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
} from "lucide-react";

export default function WorkerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [today, setToday] = useState({ in: null, out: null });
  const [sales, setSales] = useState([]);
  const [reminders, setReminders] = useState({ due: [], upcoming: [] });
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("home");
  const [busy, setBusy] = useState(false);

  // sale form
  const [sale, setSale] = useState({
    customer_name: "",
    customer_phone: "",
    product_id: "",
    quantity: 1,
    reason: "",
  });

  const refresh = async () => {
    try {
      const [t1, s1, r1, p1] = await Promise.all([
        api.get("/attendance/today"),
        api.get("/sales"),
        api.get("/reminders"),
        api.get("/products"),
      ]);
      setToday(t1.data);
      setSales(s1.data);
      setReminders(r1.data);
      setProducts(p1.data);
    } catch (e) {}
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleClock = async (kind) => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.post(`/attendance/${kind === "in" ? "clock-in" : "clock-out"}`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          if (kind === "in") {
            if (data.is_late) toast.warning("Kechikdingiz - direktorga xabar yuborildi");
            else if (data.is_early) toast.success("Erta keldingiz - direktorga xabar yuborildi");
            else toast.success("Ish boshlandi");
          } else {
            toast.success("Ish tugatildi");
          }
          await refresh();
        } catch (err) {
          toast.error(formatApiErrorDetail(err.response?.data?.detail));
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        toast.error("Lokatsiya olinmadi");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitSale = async (e) => {
    e.preventDefault();
    const product = products.find((p) => p.id === sale.product_id);
    if (!product) return toast.error("Mahsulotni tanlang");
    setBusy(true);
    try {
      await api.post("/sales", {
        customer_name: sale.customer_name,
        customer_phone: sale.customer_phone,
        product_id: product.id,
        product_name: product.name,
        quantity: sale.quantity,
        price: product.price,
        reason: sale.reason,
      });
      toast.success("Sotuv qo'shildi");
      setSale({ customer_name: "", customer_phone: "", product_id: "", quantity: 1, reason: "" });
      await refresh();
      setTab("sales");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const markReminder = async (sid) => {
    try {
      await api.post(`/reminders/${sid}/done`);
      toast.success("Bajarildi");
      await refresh();
    } catch (e) {}
  };

  const todaySalesCount = sales.filter((s) => {
    const d = new Date(s.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1400px] mx-auto" data-testid="worker-dashboard">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow">{t("worker.title")}</div>
          <h1 className="font-serif text-4xl lg:text-5xl font-light tracking-tight mt-3">
            Salom, {user?.name}
          </h1>
        </div>
        <div className="flex gap-2">
          {[
            { k: "home", l: "Asosiy" },
            { k: "sales", l: t("worker.my_sales") },
            { k: "add", l: t("worker.add_sale") },
            { k: "reminders", l: t("worker.reminders") },
          ].map((x) => (
            <button
              key={x.k}
              data-testid={`worker-tab-${x.k}`}
              onClick={() => setTab(x.k)}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.2em] border ${
                tab === x.k ? "bg-[#1c1917] text-white border-[#1c1917]" : "border-stone-300 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {x.l}
            </button>
          ))}
        </div>
      </div>

      {tab === "home" && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-stone-200 rounded-lg p-10 flex flex-col items-center justify-center">
            <Clock className="w-10 h-10 text-stone-400 mb-4" strokeWidth={1.5} />
            <div className="eyebrow text-center">Ish vaqti: 08:00 — 20:00</div>
            <div className="font-serif text-3xl mt-2 mb-8 text-center">
              {today.in
                ? today.out
                  ? "Ish bugun tugagan"
                  : `Ish boshlandi: ${today.in.tashkent_time}`
                : "Hali ishga kelmagansiz"}
            </div>
            {!today.in && (
              <button
                onClick={() => handleClock("in")}
                disabled={busy}
                data-testid="clock-in-btn"
                className="pulse-ring w-44 h-44 rounded-full bg-[#c25e3e] hover:bg-[#a64d32] text-white flex flex-col items-center justify-center transition-colors disabled:opacity-50"
              >
                <PlayCircle className="w-12 h-12 mb-2" strokeWidth={1.5} />
                <div className="text-[11px] uppercase tracking-[0.25em]">{t("worker.clock_in")}</div>
              </button>
            )}
            {today.in && !today.out && (
              <button
                onClick={() => handleClock("out")}
                disabled={busy}
                data-testid="clock-out-btn"
                className="w-44 h-44 rounded-full bg-[#1c1917] text-white flex flex-col items-center justify-center hover:bg-[#3a3633] transition-colors disabled:opacity-50"
              >
                <StopCircle className="w-12 h-12 mb-2" strokeWidth={1.5} />
                <div className="text-[11px] uppercase tracking-[0.25em]">{t("worker.clock_out")}</div>
              </button>
            )}
            {today.in && today.out && (
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#687157]" strokeWidth={1.5} />
                Ish tugagan: {today.out.tashkent_time}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-6">
            <div>
              <div className="eyebrow">{t("worker.sales_today")}</div>
              <div className="font-serif text-5xl mt-2">{todaySalesCount}</div>
            </div>
            <div>
              <div className="eyebrow">{t("worker.reminders")}</div>
              <div className="font-serif text-5xl mt-2 text-[#c25e3e]">{reminders.due.length}</div>
              {reminders.due.length > 0 && (
                <button onClick={() => setTab("reminders")} className="mt-3 text-xs text-[#c25e3e] uppercase tracking-widest">
                  Ko'rish →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "sales" && (
        <div className="mt-10">
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 eyebrow">Mijoz</th>
                  <th className="text-left px-4 py-3 eyebrow">Tel</th>
                  <th className="text-left px-4 py-3 eyebrow">Mahsulot</th>
                  <th className="text-left px-4 py-3 eyebrow">Sabab</th>
                  <th className="text-right px-4 py-3 eyebrow">Jami</th>
                  <th className="text-right px-4 py-3 eyebrow">Sana</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100" data-testid={`sale-row-${s.id}`}>
                    <td className="px-4 py-3">{s.customer_name}</td>
                    <td className="px-4 py-3 text-stone-500">{s.customer_phone}</td>
                    <td className="px-4 py-3">{s.product_name} ×{s.quantity}</td>
                    <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">{s.reason}</td>
                    <td className="px-4 py-3 text-right font-medium">{s.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-stone-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">Hali sotuv yo'q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "add" && (
        <div className="mt-10 max-w-2xl bg-white border border-stone-200 rounded-lg p-8">
          <h2 className="font-serif text-3xl">{t("worker.add_sale")}</h2>
          <form onSubmit={submitSale} className="mt-6 space-y-5">
            <input data-testid="sale-customer-name" required placeholder={t("worker.customer_name")} value={sale.customer_name}
              onChange={(e) => setSale({ ...sale, customer_name: e.target.value })}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
            <input data-testid="sale-customer-phone" required placeholder={t("worker.customer_phone")} value={sale.customer_phone}
              onChange={(e) => setSale({ ...sale, customer_phone: e.target.value })}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
            <select data-testid="sale-product-select" required value={sale.product_id}
              onChange={(e) => setSale({ ...sale, product_id: e.target.value })}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none">
              <option value="">{t("worker.product")}...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString()} UZS</option>
              ))}
            </select>
            <input data-testid="sale-quantity-input" type="number" min={1} required value={sale.quantity}
              onChange={(e) => setSale({ ...sale, quantity: parseInt(e.target.value) || 1 })}
              className="w-32 bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none"
              placeholder={t("worker.quantity")} />
            <textarea data-testid="sale-reason-input" required placeholder={t("worker.reason")} value={sale.reason}
              onChange={(e) => setSale({ ...sale, reason: e.target.value })} rows={3}
              className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none resize-none" />
            <button type="submit" disabled={busy} data-testid="sale-submit-btn"
              className="btn-brand px-8 py-3 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50">
              {busy ? "..." : t("worker.save")}
            </button>
          </form>
        </div>
      )}

      {tab === "reminders" && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="eyebrow text-[#c25e3e] mb-4">{t("worker.due_now")} · {reminders.due.length}</h3>
            <div className="space-y-3">
              {reminders.due.map((r) => (
                <div key={r.id} className="bg-white border border-[#c25e3e]/30 rounded-lg p-5" data-testid={`reminder-due-${r.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{r.customer_name}</div>
                      <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-1">
                        <Phone className="w-3 h-3" /> {r.customer_phone}
                      </div>
                      <div className="text-xs mt-2">{r.product_name}</div>
                      <div className="text-xs text-stone-500 mt-1">{r.reason}</div>
                    </div>
                    <button onClick={() => markReminder(r.id)} data-testid={`reminder-done-${r.id}`}
                      className="text-[10px] uppercase tracking-widest btn-brand px-3 py-2">
                      {t("worker.mark_done")}
                    </button>
                  </div>
                </div>
              ))}
              {reminders.due.length === 0 && <div className="text-stone-400 text-sm">Yo'q</div>}
            </div>
          </div>
          <div>
            <h3 className="eyebrow mb-4">{t("worker.upcoming")} · {reminders.upcoming.length}</h3>
            <div className="space-y-3">
              {reminders.upcoming.map((r) => (
                <div key={r.id} className="bg-stone-50 border border-stone-200 rounded-lg p-5" data-testid={`reminder-upcoming-${r.id}`}>
                  <div className="font-medium">{r.customer_name}</div>
                  <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {new Date(r.follow_up_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs mt-2">{r.product_name}</div>
                </div>
              ))}
              {reminders.upcoming.length === 0 && <div className="text-stone-400 text-sm">Yo'q</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
