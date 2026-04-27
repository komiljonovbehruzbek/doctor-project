import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();
  return (
    <div className="px-6 sm:px-12 lg:px-20 py-24" data-testid="about-page">
      <div className="max-w-[1100px] mx-auto">
        <div className="eyebrow">{t("nav.about")}</div>
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight mt-6 leading-[0.95]">
          A ritual built on{" "}
          <span className="text-[#c25e3e] italic">care</span>.
        </h1>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="grain aspect-[4/5] bg-[#e7e1d8] overflow-hidden">
            <img src="https://images.unsplash.com/photo-1613526513504-e8585909d91c?crop=entropy&cs=srgb&fm=jpg&q=85" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-6 text-base text-stone-600 leading-relaxed">
            <p>
              Aura — bu zamonaviy, tabiiy va ilm-fan asosida ishlab chiqilgan kosmetika brendi. Bizning maqsadimiz — har bir mijozga eng yuqori sifatdagi parvarish vositalarini taqdim etish.
            </p>
            <p>
              Har bir mahsulot toza ingredientlar va sezgir teri uchun mos formulalar bilan tayyorlangan. Biz tabiat bilan uyg'unlikda yashashga ishonamiz.
            </p>
            <p>
              Toshkent shahrida joylashgan bo'lib, butun O'zbekiston bo'ylab yetkazib beramiz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
