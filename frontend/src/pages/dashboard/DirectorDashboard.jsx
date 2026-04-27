import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api, formatApiErrorDetail } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificationPolling } from "../../hooks/useNotifications";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

// Leaflet marker fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function DirectorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useNotificationPolling();

  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [sales, setSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tab, setTab] = useState("overview");

  const [newWorker, setNewWorker] = useState({ name: "", email: "", password: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [s, a, sl, o, w, at] = await Promise.all([
        api.get("/stats"),
        api.get("/accounts"),
        api.get("/sales"),
        api.get("/orders"),
        api.get("/workers"),
        api.get("/attendance"),
      ]);
      setStats(s.data);
      setAccounts(a.data);
      setSales(sl.data);
      setOrders(o.data);
      setWorkers(w.data);
      setAttendance(at.data);
    } catch (e) {}
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  const addWorker = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/workers", newWorker);
      toast.success("Ishchi qo'shildi");
      setNewWorker({ name: "", email: "", password: "", phone: "" });
      await refresh();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const delWorker = async (id) => {
    try {
      await api.delete(`/workers/${id}`);
      toast.success("O'chirildi");
      await refresh();
    } catch (e) {}
  };

  const customers = accounts.filter((a) => a.role === "customer");
  const customersWithLoc = customers.filter((c) => c.lat && c.lng);
  const ordersWithLoc = orders.filter((o) => o.lat && o.lng);

  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1500px] mx-auto" data-testid="director-dashboard">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow">{t("director.title")}</div>
          <h1 className="font-serif text-4xl lg:text-5xl font-light tracking-tight mt-3">
            {user?.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { k: "overview", l: t("director.overview") },
            { k: "accounts", l: t("director.accounts") },
            { k: "sales", l: t("director.sales") },
            { k: "attendance", l: t("director.attendance") },
            { k: "map", l: t("director.map") },
            { k: "workers", l: t("director.workers") },
          ].map((x) => (
            <button
              key={x.k}
              data-testid={`director-tab-${x.k}`}
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

      {tab === "overview" && stats && (
        <div className="mt-10 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label={t("director.total_customers")} value={stats.totals.customers} />
            <StatCard icon={ShoppingBag} label={t("director.total_orders")} value={stats.totals.orders} />
            <StatCard icon={TrendingUp} label={t("director.total_sales")} value={stats.totals.sales} />
            <StatCard icon={Package} label="Mahsulotlar" value={stats.totals.products} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="eyebrow mb-4">{t("director.sales_per_day")}</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.sales_per_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#78716c" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#78716c" />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#c25e3e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="eyebrow mb-4">{t("director.sales_by_worker")}</div>
              {stats.sales_by_worker.length === 0 ? (
                <div className="text-stone-400 text-sm py-12 text-center">{t("director.no_data")}</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.sales_by_worker}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="worker_name" tick={{ fontSize: 11 }} stroke="#78716c" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#78716c" />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#c25e3e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="eyebrow mb-4">Yangi buyurtmalar</div>
              <div className="space-y-3">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex justify-between text-sm border-b border-stone-100 pb-2">
                    <div>
                      <div className="font-medium">{o.user_name}</div>
                      <div className="text-stone-500 text-xs">{o.product_name} ×{o.quantity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{(o.price * o.quantity).toLocaleString()}</div>
                      <div className="text-stone-400 text-xs">{new Date(o.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="text-stone-400 text-sm">Yo'q</div>}
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="eyebrow mb-4">So'nggi sotuvlar</div>
              <div className="space-y-3">
                {sales.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex justify-between text-sm border-b border-stone-100 pb-2">
                    <div>
                      <div className="font-medium">{s.customer_name}</div>
                      <div className="text-stone-500 text-xs">{s.product_name} · {s.worker_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{s.total.toLocaleString()}</div>
                      <div className="text-stone-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {sales.length === 0 && <div className="text-stone-400 text-sm">Yo'q</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <div className="mt-10 space-y-8">
          <div>
            <h2 className="eyebrow mb-3">{t("director.workers")} ({workers.length})</h2>
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-4 py-3 eyebrow">Ism</th>
                    <th className="text-left px-4 py-3 eyebrow">Email</th>
                    <th className="text-left px-4 py-3 eyebrow">Telefon</th>
                    <th className="text-left px-4 py-3 eyebrow">Yaratilgan</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w) => (
                    <tr key={w.id} className="border-b border-stone-100" data-testid={`account-worker-${w.id}`}>
                      <td className="px-4 py-3 font-medium">{w.name}</td>
                      <td className="px-4 py-3 text-stone-500">{w.email}</td>
                      <td className="px-4 py-3">{w.phone || "-"}</td>
                      <td className="px-4 py-3 text-stone-400 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="eyebrow mb-3">{t("director.customers")} ({customers.length})</h2>
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-4 py-3 eyebrow">Ism</th>
                    <th className="text-left px-4 py-3 eyebrow">Email</th>
                    <th className="text-left px-4 py-3 eyebrow">Telefon</th>
                    <th className="text-left px-4 py-3 eyebrow">{t("director.last_purchase")}</th>
                    <th className="text-left px-4 py-3 eyebrow">Lokatsiya</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-stone-100" data-testid={`account-customer-${c.id}`}>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-stone-500">{c.email}</td>
                      <td className="px-4 py-3">{c.phone || "-"}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.last_purchase
                          ? `${c.last_purchase.product_name} (${c.last_purchase.worker_name})`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-400">
                        {c.lat && c.lng ? `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "sales" && (
        <div className="mt-10 bg-white border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 eyebrow">Sana</th>
                <th className="text-left px-4 py-3 eyebrow">Sotuvchi</th>
                <th className="text-left px-4 py-3 eyebrow">Mijoz</th>
                <th className="text-left px-4 py-3 eyebrow">Telefon</th>
                <th className="text-left px-4 py-3 eyebrow">Mahsulot</th>
                <th className="text-left px-4 py-3 eyebrow">Sabab</th>
                <th className="text-right px-4 py-3 eyebrow">Jami</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-stone-100" data-testid={`director-sale-${s.id}`}>
                  <td className="px-4 py-3 text-xs text-stone-500">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{s.worker_name}</td>
                  <td className="px-4 py-3">{s.customer_name}</td>
                  <td className="px-4 py-3 text-stone-500">{s.customer_phone}</td>
                  <td className="px-4 py-3">{s.product_name} ×{s.quantity}</td>
                  <td className="px-4 py-3 text-stone-500 max-w-[220px] truncate">{s.reason}</td>
                  <td className="px-4 py-3 text-right font-medium">{s.total.toLocaleString()}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-stone-400 text-sm">{t("director.no_data")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "attendance" && (
        <div className="mt-10 bg-white border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 eyebrow">Sana</th>
                <th className="text-left px-4 py-3 eyebrow">Vaqt</th>
                <th className="text-left px-4 py-3 eyebrow">Ishchi</th>
                <th className="text-left px-4 py-3 eyebrow">Tur</th>
                <th className="text-left px-4 py-3 eyebrow">Status</th>
                <th className="text-left px-4 py-3 eyebrow">Lokatsiya</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.id} className="border-b border-stone-100" data-testid={`attendance-${a.id}`}>
                  <td className="px-4 py-3 text-xs">{new Date(a.timestamp).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{a.tashkent_time}</td>
                  <td className="px-4 py-3">{a.worker_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${a.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
                      {a.type === "in" ? "Keldi" : "Ketdi"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {a.is_late ? (
                      <span className="flex items-center gap-1 text-[#991b1b]"><AlertTriangle className="w-3.5 h-3.5" /> Kechikdi</span>
                    ) : a.is_early ? (
                      <span className="flex items-center gap-1 text-[#687157]"><Clock className="w-3.5 h-3.5" /> Erta</span>
                    ) : a.type === "in" ? (
                      <span className="flex items-center gap-1 text-stone-500"><CheckCircle2 className="w-3.5 h-3.5" /> Vaqtida</span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {a.lat && a.lng ? `${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}` : "-"}
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">{t("director.no_data")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "map" && (
        <div className="mt-10 bg-white border border-stone-200 rounded-lg p-2 overflow-hidden">
          <MapContainer
            center={[41.3111, 69.2797]}
            zoom={11}
            style={{ height: "70vh", width: "100%", borderRadius: "8px" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {ordersWithLoc.map((o) => (
              <Marker key={o.id} position={[o.lat, o.lng]}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{o.user_name}</div>
                    <div className="text-stone-500">{o.user_phone}</div>
                    <div className="mt-1">{o.product_name} ×{o.quantity}</div>
                    <div className="text-xs text-stone-400 mt-1">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="px-4 py-3 text-xs text-stone-500">
            Buyurtmalar: {ordersWithLoc.length} · Mijozlar lokatsiyasi: {customersWithLoc.length}
          </div>
        </div>
      )}

      {tab === "workers" && (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h2 className="font-serif text-2xl">{t("director.add_worker")}</h2>
            <p className="text-xs text-stone-500 mt-1">{t("director.max_workers")}: {workers.length}/4</p>
            <form onSubmit={addWorker} className="mt-6 space-y-4">
              <input data-testid="new-worker-name" required placeholder="Ism" value={newWorker.name}
                onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
              <input data-testid="new-worker-email" type="email" required placeholder="Email" value={newWorker.email}
                onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
              <input data-testid="new-worker-password" type="password" required placeholder="Parol" value={newWorker.password}
                onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
              <input data-testid="new-worker-phone" placeholder="Telefon" value={newWorker.phone}
                onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
              <button type="submit" disabled={busy || workers.length >= 4} data-testid="new-worker-submit"
                className="btn-brand px-6 py-3 text-[11px] uppercase tracking-[0.25em] flex items-center gap-2 disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> {t("director.add_worker")}
              </button>
            </form>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h2 className="font-serif text-2xl">{t("director.workers")}</h2>
            <div className="mt-4 space-y-3">
              {workers.map((w) => (
                <div key={w.id} className="flex justify-between items-center border-b border-stone-100 pb-3" data-testid={`worker-row-${w.id}`}>
                  <div>
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-stone-500">{w.email}</div>
                  </div>
                  <button onClick={() => delWorker(w.id)} data-testid={`delete-worker-${w.id}`}
                    className="text-stone-400 hover:text-[#991b1b]">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              {workers.length === 0 && <div className="text-stone-400 text-sm py-6 text-center">Hali ishchi yo'q</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
      </div>
      <div className="mt-4 eyebrow">{label}</div>
      <div className="font-serif text-4xl mt-1">{value}</div>
    </div>
  );
}
