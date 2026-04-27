import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, formatApiErrorDetail } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificationPolling } from "../../hooks/useNotifications";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X, CheckCircle2 } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useNotificationPolling();

  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [news, setNews] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [editProduct, setEditProduct] = useState(null);
  const [editNews, setEditNews] = useState(null);

  const refresh = async () => {
    const [p, n, q] = await Promise.all([
      api.get("/products"),
      api.get("/news"),
      api.get("/questions").catch(() => ({ data: [] })),
    ]);
    setProducts(p.data);
    setNews(n.data);
    setQuestions(q.data);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1500px] mx-auto" data-testid="admin-dashboard">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow">{t("admin.title")}</div>
          <h1 className="font-serif text-4xl lg:text-5xl font-light tracking-tight mt-3">
            {user?.name}
          </h1>
        </div>
        <div className="flex gap-2">
          {[
            { k: "products", l: t("admin.products") },
            { k: "news", l: t("admin.news") },
            { k: "questions", l: t("admin.questions") + ` (${questions.filter(q => !q.answered).length})` },
          ].map((x) => (
            <button
              key={x.k}
              data-testid={`admin-tab-${x.k}`}
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

      {tab === "products" && (
        <div className="mt-10">
          <div className="flex justify-between mb-6">
            <h2 className="font-serif text-3xl">{t("admin.products")}</h2>
            <button
              data-testid="add-product-btn"
              onClick={() => setEditProduct({ name: "", description: "", price: 0, image_url: "", category: "skincare", in_stock: true })}
              className="btn-brand px-4 py-2 text-[11px] uppercase tracking-[0.25em] flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> {t("admin.add_product")}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <div key={p.id} className="bg-white border border-stone-200 rounded-lg overflow-hidden" data-testid={`admin-product-${p.id}`}>
                <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-stone-500">{p.category}</div>
                  <div className="text-sm mt-2">{p.price.toLocaleString()} UZS</div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setEditProduct(p)} data-testid={`edit-product-${p.id}`}
                      className="text-xs px-3 py-1.5 border border-stone-300 hover:bg-stone-100 flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> Tahrir
                    </button>
                    <button onClick={async () => {
                      if (!window.confirm("O'chirish?")) return;
                      await api.delete(`/products/${p.id}`);
                      toast.success("O'chirildi");
                      refresh();
                    }} data-testid={`delete-product-${p.id}`}
                      className="text-xs px-3 py-1.5 border border-stone-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> O'chir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "news" && (
        <div className="mt-10">
          <div className="flex justify-between mb-6">
            <h2 className="font-serif text-3xl">{t("admin.news")}</h2>
            <button
              data-testid="add-news-btn"
              onClick={() => setEditNews({ title: "", content: "", image_url: "" })}
              className="btn-brand px-4 py-2 text-[11px] uppercase tracking-[0.25em] flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> {t("admin.add_news")}
            </button>
          </div>
          <div className="space-y-5">
            {news.map((n) => (
              <div key={n.id} className="bg-white border border-stone-200 rounded-lg p-5 flex gap-5" data-testid={`admin-news-${n.id}`}>
                {n.image_url && <img src={n.image_url} className="w-32 h-24 object-cover" alt="" />}
                <div className="flex-1">
                  <div className="font-medium text-lg">{n.title}</div>
                  <p className="text-sm text-stone-600 mt-2 line-clamp-2">{n.content}</p>
                </div>
                <div className="flex gap-2 self-start">
                  <button onClick={() => setEditNews(n)} className="text-xs px-3 py-1.5 border border-stone-300 hover:bg-stone-100">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm("O'chirish?")) return;
                    await api.delete(`/news/${n.id}`);
                    refresh();
                  }} className="text-xs px-3 py-1.5 border border-stone-300 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "questions" && (
        <div className="mt-10 space-y-4">
          {questions.map((q) => (
            <div key={q.id} className={`bg-white border rounded-lg p-5 ${q.answered ? "border-stone-200 opacity-70" : "border-[#c25e3e]/30"}`} data-testid={`question-${q.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{q.name}</div>
                  <div className="text-xs text-stone-500">{q.email} {q.phone && `· ${q.phone}`}</div>
                </div>
                <div className="text-xs text-stone-400">{new Date(q.created_at).toLocaleString()}</div>
              </div>
              <p className="text-sm text-stone-700 mt-3">{q.message}</p>
              {!q.answered && (
                <button onClick={async () => {
                  await api.post(`/questions/${q.id}/answer`);
                  toast.success("Belgilandi");
                  refresh();
                }} data-testid={`mark-answered-${q.id}`}
                  className="mt-4 text-[10px] uppercase tracking-widest btn-brand px-3 py-2 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t("admin.mark_answered")}
                </button>
              )}
            </div>
          ))}
          {questions.length === 0 && <div className="text-stone-400 text-sm py-12 text-center">Hali savol yo'q</div>}
        </div>
      )}

      {editProduct && <ProductEditor product={editProduct} onClose={() => setEditProduct(null)} onSaved={refresh} />}
      {editNews && <NewsEditor item={editNews} onClose={() => setEditNews(null)} onSaved={refresh} />}
    </div>
  );
}

function ProductEditor({ product, onClose, onSaved }) {
  const [form, setForm] = useState(product);
  const [busy, setBusy] = useState(false);
  const isEdit = !!product.id;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        image_url: form.image_url,
        category: form.category,
        in_stock: form.in_stock,
      };
      if (isEdit) await api.put(`/products/${product.id}`, payload);
      else await api.post("/products", payload);
      toast.success("Saqlandi");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()} data-testid="product-editor">
        <div className="flex justify-between items-start mb-6">
          <h3 className="font-serif text-2xl">{isEdit ? "Tahrirlash" : "Yangi mahsulot"}</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input required placeholder="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="product-name-input"
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
          <textarea required placeholder="Tavsif" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            data-testid="product-desc-input" rows={3}
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none resize-none" />
          <input required type="number" placeholder="Narx" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
            data-testid="product-price-input"
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
          <input required placeholder="Rasm URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            data-testid="product-image-input"
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            data-testid="product-category-input"
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none">
            <option value="skincare">Skincare</option>
            <option value="cleanser">Cleanser</option>
            <option value="set">Set</option>
            <option value="fragrance">Fragrance</option>
            <option value="mask">Mask</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
              data-testid="product-instock-input" />
            Sotuvda bor
          </label>
          <button type="submit" disabled={busy} data-testid="product-save-btn"
            className="btn-brand px-6 py-3 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50">
            {busy ? "..." : "Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}

function NewsEditor({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item);
  const [busy, setBusy] = useState(false);
  const isEdit = !!item.id;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { title: form.title, content: form.content, image_url: form.image_url };
      if (isEdit) await api.put(`/news/${item.id}`, payload);
      else await api.post("/news", payload);
      toast.success("Saqlandi");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()} data-testid="news-editor">
        <div className="flex justify-between items-start mb-6">
          <h3 className="font-serif text-2xl">{isEdit ? "Tahrirlash" : "Yangi yangilik"}</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input required placeholder="Sarlavha" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            data-testid="news-title-input"
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
          <textarea required placeholder="Mazmun" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            data-testid="news-content-input" rows={5}
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none resize-none" />
          <input placeholder="Rasm URL (ixtiyoriy)" value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            data-testid="news-image-input"
            className="w-full bg-transparent border-b border-stone-300 focus:border-[#c25e3e] py-3 outline-none" />
          <button type="submit" disabled={busy} data-testid="news-save-btn"
            className="btn-brand px-6 py-3 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50">
            {busy ? "..." : "Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}
