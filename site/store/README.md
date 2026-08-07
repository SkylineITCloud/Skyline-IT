# Circuit Forge Technologies — Store

Full-stack e-commerce store for **Circuit Forge Technologies**, selling development boards, Internet Of Things (IoT) devices, and smart monitoring kits engineered in South Africa.

Built by **Skyline IT & Cloud** for the Circuit Forge subsidiary.

## Serving

The store no longer runs its own server — it is served by the **Skyline IT unified backend** (one server, one network for all subsidiaries):

1. Start the unified server: run `start-server.bat` at the repo root (or `cd server && npm start`).
2. Storefront: **http://localhost:3000/store/**
3. Admin panel: **http://localhost:3000/store/admin.html** (requires admin code)
4. Store API: **http://localhost:3000/api/store/products**

> The default admin code is `cf-circuit-admin-2026`. Set your own via `ADMIN_CODE` in the repo root `.env`.

## Structure

| Path | Purpose |
| --- | --- |
| `public/index.html` | Storefront — catalog grid, cart drawer, checkout |
| `public/admin.html` | Admin dashboard — orders, statuses, stats |
| `public/images/` | Product SVG artwork and logo |
| `.env.example` | Config template (port, admin code, contact) |

Store data and API live in the unified server:

| Path | Purpose |
| --- | --- |
| `server/routes/store.js` | Store API (public + admin) |
| `server/services/storeDb.js` | Products + orders file access |
| `data/circuit-forge/products.json` | Product catalog (name, price, stock, images) |
| `data/circuit-forge/orders.json` | Customer orders (created by the API) |

## API

Public (on the unified server):

- `GET /api/store/products` — public catalog (stock stripped)
- `GET /api/store/products/:id` — single product
- `POST /api/store/orders` — place order (validates customer, items, stock)

Admin (require `X-Admin-Code` header):

- `GET /api/store/admin/orders` — all orders, newest first
- `PATCH /api/store/admin/orders/:id` — update status
- `GET /api/store/admin/stats` — totals / revenue / units / pending

## Security

Following the Skyline IT security checklist:

- Separate admin panel (no admin surface in the storefront)
- Admin endpoints gated by a shared access code over the `X-Admin-Code` header
- Helmet security headers + a strict-enough CSP (set by the unified server)
- Rate limiting on the API and stricter limits on order placement
- Input validation (name/email/phone/address, cart items, quantities, stock)
- No secrets committed — `.env` is expected per deployment

## Payments

Orders are captured with customer details and a payment-pending status. The store does **not** accept card details directly. Wire the checkout to a payment provider (e.g. Stripe) and verify payments via the **webhook** before marking orders paid.
