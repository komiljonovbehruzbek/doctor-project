import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useState } from "react";
import { Menu, X, User, LogOut } from "lucide-react";

export default function Layout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/", label: t("nav.home") },
    { to: "/products", label: t("nav.products") },
    { to: "/news", label: t("nav.news") },
    { to: "/about", label: t("nav.about") },
    { to: "/contact", label: t("nav.contact") },
  ];

  const dashboardLink =
    user && user !== false
      ? user.role === "director"
        ? "/director"
        : user.role === "admin"
        ? "/admin"
        : user.role === "worker"
        ? "/worker"
        : null
      : null;

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link
            to="/"
            data-testid="logo-link"
            className="flex items-baseline gap-2"
          >
            <span className="font-serif text-2xl tracking-tight">Aura</span>
            <span className="eyebrow text-[10px]">cosmetics</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                data-testid={`nav-${n.to.replace("/", "") || "home"}`}
                className={({ isActive }) =>
                  `link-underline text-[13px] uppercase tracking-[0.2em] transition-colors ${
                    isActive ? "text-[#c25e3e]" : "text-stone-700 hover:text-[#1c1917]"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            {user && user !== false ? (
              <div className="hidden lg:flex items-center gap-3">
                {dashboardLink && (
                  <Link
                    to={dashboardLink}
                    data-testid="dashboard-link"
                    className="text-[12px] uppercase tracking-[0.2em] text-stone-700 hover:text-[#c25e3e] transition-colors flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {t("nav.dashboard")}
                  </Link>
                )}
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  data-testid="logout-btn"
                  className="text-[12px] uppercase tracking-[0.2em] text-stone-500 hover:text-[#991b1b] transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-4">
                <Link
                  to="/login"
                  data-testid="header-login-link"
                  className="text-[12px] uppercase tracking-[0.2em] text-stone-700 hover:text-[#c25e3e] transition-colors"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  data-testid="header-register-link"
                  className="btn-brand px-4 py-2 text-[11px] uppercase tracking-[0.2em] font-medium"
                >
                  {t("nav.register")}
                </Link>
              </div>
            )}
            <button
              onClick={() => setOpen(!open)}
              data-testid="mobile-menu-toggle"
              className="lg:hidden p-1"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-stone-200 bg-white">
            <div className="px-6 py-6 flex flex-col gap-4">
              {navItems.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="text-sm uppercase tracking-[0.18em] text-stone-700"
                >
                  {n.label}
                </NavLink>
              ))}
              {user && user !== false ? (
                <>
                  {dashboardLink && (
                    <Link to={dashboardLink} onClick={() => setOpen(false)} className="text-sm uppercase tracking-[0.18em] text-[#c25e3e]">
                      {t("nav.dashboard")}
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await logout();
                      setOpen(false);
                      navigate("/");
                    }}
                    className="text-sm uppercase tracking-[0.18em] text-left text-stone-500"
                  >
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="text-sm uppercase tracking-[0.18em]">
                    {t("nav.login")}
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="text-sm uppercase tracking-[0.18em] text-[#c25e3e]">
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-200 mt-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="font-serif text-3xl">Aura</div>
            <p className="mt-3 text-sm text-stone-600 max-w-xs">{t("tagline")}</p>
          </div>
          <div>
            <div className="eyebrow mb-3">Shop</div>
            <ul className="space-y-2 text-sm text-stone-600">
              <li><Link to="/products" className="hover:text-[#c25e3e]">{t("nav.products")}</Link></li>
              <li><Link to="/news" className="hover:text-[#c25e3e]">{t("nav.news")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-3">Company</div>
            <ul className="space-y-2 text-sm text-stone-600">
              <li><Link to="/about" className="hover:text-[#c25e3e]">{t("nav.about")}</Link></li>
              <li><Link to="/contact" className="hover:text-[#c25e3e]">{t("nav.contact")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-3">Aloqa</div>
            <p className="text-sm text-stone-600">Toshkent · O'zbekiston</p>
            <p className="text-sm text-stone-600">hello@aura.uz</p>
          </div>
        </div>
        <div className="border-t border-stone-200">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-5 text-xs text-stone-500 flex justify-between">
            <span>© 2026 Aura Cosmetics</span>
            <span>Made with care</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
