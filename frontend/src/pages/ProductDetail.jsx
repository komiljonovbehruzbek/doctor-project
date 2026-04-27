import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import OrderModal from "../components/OrderModal";
import { ArrowLeft } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => {});
  }, [id]);

  if (!product) return <div className="p-20 text-stone-400 text-sm uppercase tracking-widest">Loading...</div>;

  return (
    <div className="px-6 sm:px-12 lg:px-20 py-12" data-testid="product-detail-page">
      <div className="max-w-[1400px] mx-auto">
        <Link to="/products" className="eyebrow inline-flex items-center gap-2 hover:text-[#c25e3e]">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8">
          <div className="lg:col-span-7 grain bg-[#e7e1d8]">
            <div className="aspect-[4/5] overflow-hidden">
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="lg:col-span-5 lg:pl-8 lg:sticky lg:top-32 lg:self-start">
            <div className="eyebrow">{product.category}</div>
            <h1 className="font-serif text-5xl lg:text-6xl font-light tracking-tight mt-4 leading-[0.95]">
              {product.name}
            </h1>
            <div className="mt-6 text-2xl font-light">
              {product.price.toLocaleString()} <span className="text-sm text-stone-500 uppercase tracking-widest">UZS</span>
            </div>
            <p className="mt-8 text-base text-stone-600 leading-relaxed">
              {product.description}
            </p>

            <div className="mt-10 space-y-4">
              <button
                disabled={!product.in_stock}
                onClick={() => setOpen(true)}
                data-testid="open-order-modal-btn"
                className="w-full btn-brand py-4 text-[11px] uppercase tracking-[0.25em] font-medium disabled:bg-stone-300"
              >
                {product.in_stock ? t("product.order") : t("product.out_of_stock")}
              </button>

              <div className="grid grid-cols-2 gap-px bg-stone-200 border border-stone-200">
                <div className="bg-[#fafaf9] p-4">
                  <div className="eyebrow">Status</div>
                  <div className="text-sm mt-1">{product.in_stock ? t("product.in_stock") : t("product.out_of_stock")}</div>
                </div>
                <div className="bg-[#fafaf9] p-4">
                  <div className="eyebrow">{t("product.category")}</div>
                  <div className="text-sm mt-1 capitalize">{product.category}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <OrderModal open={open} onClose={() => setOpen(false)} product={product} />
    </div>
  );
}
