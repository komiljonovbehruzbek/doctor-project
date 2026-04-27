import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [news, setNews] = useState([]);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data.slice(0, 4))).catch(() => {});
    api.get("/news").then((r) => setNews(r.data.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO - editorial split */}
      <section className="relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[88vh]">
          <div className="lg:col-span-6 flex items-center px-6 sm:px-12 lg:px-20 py-16">
            <div className="max-w-xl">
              <div className="eyebrow reveal">{t("home.hero_eyebrow")}</div>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[0.95] mt-6 reveal reveal-delay-1">
                {t("home.hero_title")}
              </h1>
              <p className="mt-8 text-base text-stone-600 leading-relaxed max-w-md reveal reveal-delay-2">
                {t("home.hero_sub")}
              </p>
              <div className="mt-12 flex items-center gap-4 reveal reveal-delay-3">
                <Link
                  to="/products"
                  data-testid="hero-shop-btn"
                  className="btn-brand px-7 py-4 text-[11px] uppercase tracking-[0.25em] font-medium inline-flex items-center gap-3"
                >
                  {t("home.cta_shop")}
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Link>
                <Link
                  to="/about"
                  className="text-[12px] uppercase tracking-[0.25em] text-stone-700 link-underline"
                >
                  {t("home.cta_learn")}
                </Link>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 relative grain bg-[#e7e1d8]">
            <img
              src="https://images.unsplash.com/photo-1748638348145-d53bc0373166?crop=entropy&cs=srgb&fm=jpg&q=85"
              alt="Aura cosmetics hero"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="px-6 sm:px-12 lg:px-20 py-28 bg-[#f5f5f4]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-5">
            <div className="eyebrow">{t("home.philosophy_eyebrow")}</div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-none mt-6 tracking-tight">
              {t("home.philosophy_title")}
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <p className="text-base text-stone-600 leading-relaxed">
              {t("home.philosophy_text")}
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS - bento layout */}
      <section className="px-6 sm:px-12 lg:px-20 py-28">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-14">
            <div>
              <div className="eyebrow">{t("home.featured")}</div>
              <h2 className="font-serif text-4xl sm:text-5xl font-light mt-3 tracking-tight">
                Curated for you
              </h2>
            </div>
            <Link
              to="/products"
              data-testid="view-all-products-link"
              className="text-[12px] uppercase tracking-[0.25em] text-stone-700 link-underline"
            >
              {t("home.view_all")}
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((p, i) => (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                data-testid={`featured-product-${p.id}`}
                className="tilt-card group block"
              >
                <div className="aspect-[3/4] bg-[#f5f5f4] overflow-hidden mb-5">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-serif text-lg leading-snug">{p.name}</div>
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
      </section>

      {/* NEWS PREVIEW */}
      <section className="px-6 sm:px-12 lg:px-20 py-28 bg-[#1c1917] text-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-14">
            <div>
              <div className="eyebrow text-stone-400">{t("home.latest_news")}</div>
              <h2 className="font-serif text-4xl sm:text-5xl font-light mt-3 tracking-tight">
                Journal
              </h2>
            </div>
            <Link to="/news" className="text-[12px] uppercase tracking-[0.25em] text-stone-400 hover:text-[#c25e3e]">
              {t("home.view_all")}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {news.map((n) => (
              <article key={n.id} className="group">
                {n.image_url && (
                  <div className="aspect-[4/3] overflow-hidden bg-stone-800 mb-5">
                    <img src={n.image_url} alt={n.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                )}
                <h3 className="font-serif text-2xl leading-snug">{n.title}</h3>
                <p className="mt-3 text-sm text-stone-400 line-clamp-3">{n.content}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden border-y border-stone-200 bg-[#fafaf9] py-8">
        <div className="flex marquee whitespace-nowrap gap-16 text-stone-300">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="font-serif italic text-5xl">
              Aura · Pure · Clean · Crafted ·
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
