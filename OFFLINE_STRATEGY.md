# Offline Strategy

## Why Offline Support Matters

This app behaves like a pharma distribution ERP.

For an ERP, the most critical workflows should still work when internet is unavailable, especially:
- billing
- invoice printing
- customer lookup
- product lookup
- recent invoice history

If internet goes down and the billing counter stops, the business stops.

## Current Situation

Right now, the app is primarily online-first.

That means:
- invoice save depends on backend availability
- product and customer fetch depend on the API
- stock validation depends on live server data
- sync happens in real time

So in its current form, it is **not fully offline-capable**.

## Recommended Scope

Do not try to make the full ERP offline at once.

Start with offline support only for critical workflows:
- billing
- invoice print
- customer search
- product search
- recent invoices

Keep these online-only for now:
- reports
- live tracking
- notifications
- route history
- cross-user admin updates

## Best First Approach

Use a **PWA offline-first model** for billing.

Recommended stack:
- service worker for app shell caching
- IndexedDB for offline business data
- background sync when internet returns

Why this is the best first step:
- fits the current Next.js frontend
- avoids building a separate app immediately
- works on desktop and mobile browser installs

## What Should Be Cached Offline

Minimum local offline data:
- tenant branding
- business profile
- customer list
- product list
- batches with pricing
- GST rates
- last synced stock snapshot
- unsynced invoices
- recent synced invoices

## Offline Billing Flow

1. User opens billing page
2. App loads customers/products/batches from IndexedDB
3. User creates invoice even without internet
4. Invoice is saved locally with:
   - temporary local id
   - timestamp
   - sync status = `pending`
5. Invoice can be printed immediately
6. When internet returns, app sends pending invoices to backend
7. Backend returns final saved record and official invoice number
8. Local draft is marked `synced`

## Invoice Number Strategy

This is important.

Offline-created invoices should not depend on server invoice number generation.

Recommended approach:
- generate a temporary offline invoice id locally
- example: `OFF-BLUEDOTS-20260311-001`
- after sync, replace or map it to server invoice number

Possible models:
- keep local printable number and map to server number later
- or print provisional invoice and regenerate final PDF after sync

For pharmacy use, the first option is usually more practical.

## Stock Handling Risk

Offline stock is the hardest part.

Problem:
- if multiple users bill offline at the same time, they can oversell the same stock

Recommended first version:
- only allow one billing terminal/device per tenant for offline billing
- use the last synced stock snapshot
- deduct stock locally during offline billing
- reconcile on sync

Later improvements:
- branch-level stock allocation
- device-level stock reservation
- conflict resolution workflow

## Sync Model

Each offline invoice should have:
- local id
- tenant id / tenant slug
- created at
- last updated at
- sync status
- sync error if failed

Sync statuses:
- `pending`
- `syncing`
- `synced`
- `failed`

When internet returns:
- sync pending invoices in order
- retry failed ones
- show admin a clear sync queue

## Conflict Handling

Possible sync conflicts:
- stock already consumed on server
- customer deleted/changed
- product or batch no longer valid

Recommended first behavior:
- do not silently discard anything
- mark invoice as `failed`
- show clear reason
- allow admin to review and resubmit

## Print Strategy

Printing must work offline.

That means:
- invoice template must be local
- company logo must be cached
- customer/product/invoice data must be local

Do not depend on server-generated PDFs for the first offline version.

Prefer:
- client-side rendered printable invoice

## Suggested Phases

### Phase 1

Offline-read support:
- cache app shell
- cache branding
- cache business profile
- cache customers/products/batches

### Phase 2

Offline billing:
- create invoice locally
- print locally
- maintain pending sync queue

### Phase 3

Sync and reconciliation:
- background sync
- sync status UI
- failed sync retry flow

### Phase 4

Advanced offline operations:
- offline returns
- offline order creation
- branch/device stock handling

## Data Storage Recommendation

Use:
- IndexedDB in the web app

Do not rely on:
- localStorage

Why:
- localStorage is too small
- localStorage is not suitable for structured ERP records
- IndexedDB is better for invoices, customers, products, and sync queues

## Future Option

If clients later want stronger offline reliability for billing counters, build:

- a desktop billing app

Possible options later:
- Electron
- Tauri
- Expo/React Native for tablet workflows

Best use case:
- warehouse counter
- retail billing counter
- unstable internet locations

## Recommendation For This Project

Best next implementation path:

1. Keep the current hosted system
2. Make billing offline-first
3. Cache customer/product/batch data locally
4. Save invoices locally when offline
5. Print invoices locally
6. Sync invoices when internet returns

Do not try to make every module offline in the first pass.

## Final Recommendation

For this app, offline support should start with:
- billing
- invoice printing
- customer/product lookup

That gives real business continuity without overcomplicating the entire ERP.
