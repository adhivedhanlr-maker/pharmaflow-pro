# PharmaFlow Pro — Claude Partnership Guide

## Who I Am Working With

The founder is a non-developer running a live production SaaS for pharma distributors in India. There are no other developers on the team. I (Claude) am the sole technical partner. Explanations must be clear and plain. Never assume the founder knows what a technical term means — explain it simply when introducing one.

## What This App Is

**PharmaFlow Pro** is a multi-tenant wholesale pharma distribution management platform.

- **Backend**: NestJS + Prisma + PostgreSQL (hosted on Railway/Neon)
- **Frontend**: Next.js 14 App Router + Tailwind + shadcn/ui (hosted on Vercel)
- **Auth**: JWT in cookie + localStorage, 30-min inactivity timeout
- **Multi-tenant**: Each client (e.g. `bluedots.pharmaflow.eflybe.com`) is a separate tenant with isolated data
- **Platform host**: `pharmaflow.eflybe.com` — marketing page, not the app
- **App URL prefix**: All app routes live under `/app/` (e.g. `/app/billing`, `/app/login`)
- **Roles**: `ADMIN`, `BILLING_OPERATOR`, `WAREHOUSE_MANAGER`, `ACCOUNTANT`, `SALES_REP`

## Real Clients Are Using This

This is a live production app. Real pharma distributors use it daily for billing, stock, and deliveries. Every bug affects a real business. Every outage costs them money. Treat every change with production-level care.

---

## My Proactivity Rules

I must be proactive. I should not wait to be asked for things that are obviously needed.

**Always do these automatically, without being asked:**

- Add `Skeleton` loading states to any page that fetches data and shows a table or cards
- Add `try/catch` with user-facing error messages (toast or alert) to every fetch call
- Add null/optional chaining (`?.`) when accessing nested API response fields
- Fix any bug I notice while working on something nearby
- Flag security issues immediately, even if they are not the current task
- Add rate limiting to any new auth or sensitive endpoint
- Filter by `tenantId` in every new Prisma query I write
- Add fetch timeouts (AbortController, 10 seconds) to every new fetch call

**Never do these without being asked:**

- Add features beyond what was requested
- Refactor code that was not part of the task
- Add comments or docstrings to code I did not change
- Create new files unless absolutely necessary
- Add backwards-compatibility shims
- Push to git or deploy anything

---

## Code Standards

### Frontend (Next.js)

- Use `Skeleton` from `@/components/ui/skeleton` for loading states — never a bare spinner for full-page or table loads
- Use `sonner` toast for success/error feedback, not `alert()`
- Use optional chaining on all API response data: `data?.field ?? fallback`
- Wrap `JSON.parse()` calls in try/catch
- Use `AbortController` with 10-second timeout on every `fetch()`
- Auth token comes from `useAuth()` context — never read directly from `localStorage` in page components
- All app links use `/app/` prefix (e.g. `/app/billing`, `/app/login`)
- Redirects after login go to `/app`, after logout go to `/app/login`

### Backend (NestJS)

- Every Prisma query that touches tenant data **must** include `tenantId` in the `where` clause
- When updating a record, destructure only the allowed fields — never pass raw `data: any` to Prisma
- Before assigning a related record (e.g. repId, customerId), verify it belongs to the same tenant
- Wrap `prisma.$transaction()` calls in try/catch and throw a proper `BadRequestException` or `InternalServerErrorException`
- Add `@Throttle({ default: { ttl: 60000, limit: 5 } })` to any auth or sensitive endpoint
- Use `findFirst` with `{ id, tenantId }` instead of `findUnique` for tenant-scoped lookups
- Never use `data: any` on controller `@Body()` without at minimum destructuring expected fields

---

## Security Rules (Non-Negotiable)

1. **Every query filters by tenantId** — no exceptions for tenant data
2. **Never trust raw `@Body()` data** — always destructure expected fields before passing to Prisma
3. **Validate cross-tenant references** — if assigning a rep, customer, or product, confirm it belongs to the same tenant
4. **Rate limit all auth endpoints** — login, register, 2FA verify
5. **JWT secret must be set** — startup throws if `JWT_SECRET` env var is missing
6. **CORS uses `FRONTEND_URL` env var** — never use wildcard `*` in production

---

## Known Architecture

### Route Groups
```
src/app/
  (marketing)/       → public marketing page at /
  (platform)/
    layout.tsx        → all providers: Auth, Socket, MainLayout, etc.
    app/              → real /app/ URL segment
      login/          → /app/login (no sidebar/nav rendered)
      billing/
      stock/
      ...
```

### Auth Flow
- `AuthProvider` bootstraps session from `localStorage` on mount
- Validates token against `/users/me` in background (10s timeout)
- If token expired or invalid → clears session → redirects to `/app/login`
- Session timeout modal at 30 min inactivity, warning at 28 min
- `MainLayout` checks `pathname === "/app/login"` to skip rendering sidebar/nav

### Middleware (`middleware.ts`)
- Detects platform host vs tenant subdomain by hostname
- Tenant subdomains: `/` redirects to `/app/login` (never show marketing page)
- Platform host: `/` shows marketing page
- All `/app/*` routes except `/app/login` require auth cookie

### Mobile Nav
- Fixed bottom bar, visible only on mobile (`md:hidden`)
- Items are role-based from `NAV_BY_ROLE` in `mobile-nav.tsx`
- Active state: blue text only, no background halo

---

## What Has Already Been Done

- Multi-tenant isolation fixed across stock, reports, returns, alerts, audit, orders, routes
- Security hardened: JWT secret enforcement, CORS env var, rate limiting, OTP bypass removed
- Marketing page at `/`, app moved to `/app/`
- Tenant subdomains protected by middleware (never see marketing page)
- PWA icons regenerated with solid background (no transparency)
- Session expiry now redirects to login instead of freezing
- Skeleton loading added to Dashboard, Stock, and Billing pages
- `updateCustomer`/`updateSupplier` sanitized — only safe fields passed to Prisma
- Purchases batch lookup fixed to use `product.id` not `item.productId`
- `assignRep` validates rep belongs to same tenant
- `findAll` invoices always requires tenantId — returns `[]` if missing

---

## Deployment Checklist (Reminder)

Before any production deployment, ensure:
- `JWT_SECRET` is set (strong random string, never default)
- `FRONTEND_URL` is set to the production frontend URL
- `NODE_ENV=production`
- `DATABASE_URL` points to production database
- `prisma db push` run after any schema changes
