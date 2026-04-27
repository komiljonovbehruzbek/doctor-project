# Aura Cosmetics — PRD

## Original Problem Statement
Cosmetics e-commerce platform with multi-role dashboards. Customer-facing storefront (info, news, products, orders). Workers (max 4) with clock-in/out (geo + time, late detection), sales recording, 30-day consultation reminders. Director sees everything (accounts, sales, statistics, attendance, map of customer orders) and gets sound notifications for new orders + late workers. Admin manages products, news, customer questions. Languages: UZ/RU/EN. Modern, contrasting design.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor), JWT auth (httpOnly cookies + Bearer fallback), bcrypt, role-based access
- **Frontend**: React 19 + Tailwind + Shadcn UI, react-i18next (UZ/RU/EN), react-leaflet for maps, recharts for stats, sonner toasts, Web Audio API chime for notifications
- **Roles**: customer (self-register), worker (max 4, created by director), director (1, seeded), admin (1, seeded)
- **Data persistence**: MongoDB collections — users, products, news, orders, sales, attendance, questions, notifications

## User Personas
1. **Mijoz (Customer)** — browses storefront, registers via order modal, places orders with geolocation
2. **Sotuvchi (Worker)** — clocks in/out daily, records in-store sales, follows up with customers after 30 days
3. **Direktor** — oversees all operations, monitors workers, views statistics, sees customer locations on map
4. **Admin** — manages product catalog, publishes news, answers customer questions

## Implemented (Feb 2026)
- Auth: register/login/logout/me/refresh with httpOnly cookies + Bearer fallback (cross-site safe)
- Storefront: Home (editorial hero, philosophy, featured products, news preview, marquee), Products (with category filter), Product Detail (with order modal), News (journal layout), About, Contact (creates question for admin)
- Order modal: register-or-login flow + geolocation capture + order placement
- Worker dashboard: pulse-ring clock-in button (captures geo+time, detects late ≥8:01 Tashkent), sales table (own only), add sale form, 30-day reminders (due/upcoming)
- Director dashboard: stats cards, line chart (sales/day x14), bar chart (revenue by worker), recent orders/sales, accounts (workers + customers with last_purchase), full sales history, attendance log with late/early/on-time indicators, Leaflet map with order pins, worker CRUD (max 4)
- Admin dashboard: product CRUD with image URL, news CRUD, customer questions inbox with mark-answered
- Audio notifications: Web Audio API chime + sonner toasts polling every 10s for director/admin
- i18n: UZ default + RU + EN, persistent in localStorage
- 6 seeded products + 2 seeded news posts

## Backlog (Prioritized)
- **P1**: Cart with multiple items per order, order status workflow (new → confirmed → shipped)
- **P1**: Email notifications for new orders / question replies (SendGrid/Resend integration)
- **P2**: Product variants & inventory count, low-stock alerts
- **P2**: Customer order history page (logged-in customer)
- **P2**: PDF invoice generator after sale
- **P2**: Worker schedule editor (currently fixed 08:00-20:00 in code)
- **P3**: Push notifications via service worker for true sound when tab inactive
- **P3**: Image upload via object storage (currently URL-based)
- **P3**: Discount codes / loyalty program

## Test Credentials (seeded)
- Admin: admin@aura.uz / Admin@2026
- Director: director@aura.uz / Director@2026
- Workers + customers: created at runtime
