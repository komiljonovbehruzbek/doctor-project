import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const cats = ["all", ...new Set(products.map((p) => p.category))];
  const filtered = filter === "all" ? products : products.filter((p) => p.category === filter);

  return (
    <div className="px-6 sm:px-12 lg:px-20 py-20" data-testid="products-page">
      <div className="max-w-[1400px] mx-auto">
        <div className="eyebrow">{t("nav.products")}</div>
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight mt-6">
          The collection
        </h1>

        <div className="mt-12 flex flex-wrap gap-6 border-b border-stone-200 pb-6">
          {cats.map((c) => (
            <button
              key={c}
              data-testid={`filter-${c}`}
              onClick={() => setFilter(c)}
              className={`text-[11px] uppercase tracking-[0.25em] transition-colors ${
                filter === c ? "text-[#c25e3e]" : "text-stone-500 hover:text-[#1c1917]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-16 mt-14">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              data-testid={`product-card-${p.id}`}
              className="tilt-card group block"
            >
              <div className="aspect-[3/4] bg-[#f5f5f4] overflow-hidden mb-5 relative">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {!p.in_stock && (
                  <div className="absolute top-4 left-4 bg-white px-3 py-1 text-[10px] uppercase tracking-widest">
                    {t("product.out_of_stock")}
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-serif text-xl leading-snug">{p.name}</div>
                  <div className="eyebrow text-[10px] mt-1">{p.category}</div>
                </div>
                <div className="text-sm font-medium whitespace-nowrap">
                  {p.price.toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
