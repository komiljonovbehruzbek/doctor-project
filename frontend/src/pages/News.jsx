import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export default function News() {
  const { t } = useTranslation();
  const [news, setNews] = useState([]);
  useEffect(() => {
    api.get("/news").then((r) => setNews(r.data)).catch(() => {});
  }, []);
  return (
    <div className="px-6 sm:px-12 lg:px-20 py-20" data-testid="news-page">
      <div className="max-w-[1100px] mx-auto">
        <div className="eyebrow">{t("nav.news")}</div>
        <h1 className="font-serif text-5xl sm:text-6xl font-light tracking-tight mt-6">Journal</h1>

        <div className="mt-16 space-y-20">
          {news.map((n, i) => (
            <article key={n.id} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start" data-testid={`news-${n.id}`}>
              {n.image_url && (
                <div className="md:col-span-7 grain bg-[#e7e1d8]">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={n.image_url} alt={n.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <div className={n.image_url ? "md:col-span-5" : "md:col-span-12"}>
                <div className="eyebrow">{new Date(n.created_at).toLocaleDateString()}</div>
                <h2 className="font-serif text-3xl md:text-4xl font-light tracking-tight mt-4 leading-tight">
                  {n.title}
                </h2>
                <p className="mt-5 text-base text-stone-600 leading-relaxed">{n.content}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
