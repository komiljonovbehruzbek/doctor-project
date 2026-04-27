import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const LANGS = [
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("aura_lang", code);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="lang-switcher-btn"
          className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-stone-700 hover:text-[#c25e3e] transition-colors"
        >
          <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
          {i18n.language?.toUpperCase().slice(0, 2)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none border-stone-200 min-w-[140px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            data-testid={`lang-option-${l.code}`}
            onClick={() => change(l.code)}
            className="cursor-pointer text-xs uppercase tracking-widest"
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
