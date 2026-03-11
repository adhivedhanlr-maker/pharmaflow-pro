# Offline Implementation Plan

## Goal

Make the current app support **offline billing and invoice printing** without trying to make the full ERP offline in the first version.

Target outcome:
- billing page works without internet
- customer/product lookup works from local cache
- invoice can be created and printed offline
- invoice syncs to backend when internet returns

## Current Stack

Frontend:
- Next.js
- hosted on Vercel
- PWA-capable web app

Backend:
- NestJS
- hosted on Render

Database:
- Neon Postgres

## Phase 1: Local Data Foundation

### 1. Add IndexedDB layer

Create a local storage wrapper in frontend.

Suggested path:
- `frontend/src/lib/offline-db.ts`

Use it for:
- customers
- products
- batches
- business profile
- tenant branding
- pending invoices
- synced recent invoices

Recommended stores:
- `customers`
- `products`
- `batches`
- `business_profile`
- `tenant_branding`
- `pending_invoices`
- `invoice_history`
- `sync_meta`

## Phase 2: Offline Read Support

### 2. Cache tenant branding

When app loads:
- fetch `/public/tenant-branding`
- store branding locally
- use cached branding if offline

### 3. Cache business profile

When billing/settings load:
- fetch `/business-profile`
- store locally
- use cached version offline

### 4. Cache customers/products/batches

When billing page opens:
- fetch latest customers/products/batches
- write to IndexedDB
- if offline, read from IndexedDB instead

Suggested frontend integration points:
- `frontend/src/app/billing/page.tsx`
- inventory/product fetch logic
- customer fetch logic

## Phase 3: Offline Billing

### 5. Create local invoice draft model

Suggested offline invoice shape:

```ts
type OfflineInvoice = {
  localId: string;
  tenantHost: string;
  tenantSlug?: string;
  customerId: string;
  customerSnapshot: {
    id: string;
    name: string;
    gstin?: string;
    address?: string;
    phone?: string;
  };
  businessProfileSnapshot: {
    companyName: string;
    address: string;
    email?: string;
    phone?: string;
    logoUrl?: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    freeQuantity: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    total: number;
  }>;
  isCash: boolean;
  subtotal: number;
  gst: number;
  discount: number;
  net: number;
  offlineInvoiceNumber: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncError?: string | null;
  serverSaleId?: string | null;
  serverInvoiceNumber?: string | null;
};
```

### 6. Save invoice locally when offline

In billing save flow:
- detect offline with `navigator.onLine`
- if offline:
  - save invoice in `pending_invoices`
  - show success message like `Invoice saved offline`
  - allow print immediately

If online:
- continue current API save flow

Suggested patch point:
- `frontend/src/app/billing/page.tsx`

### 7. Generate local invoice number

Suggested format:
- `OFF-BLUEDOTS-20260311-001`

Need a local sequence counter in IndexedDB:
- store in `sync_meta`

## Phase 4: Offline Print

### 8. Print from local snapshots

Current invoice print component already renders client-side.

That is good.

Required changes:
- ensure invoice print does not depend on live server data at print time
- always use:
  - cached business profile snapshot
  - cached customer snapshot
  - current invoice items

Suggested component:
- keep using `frontend/src/components/billing/invoice-print.tsx`

## Phase 5: Sync Queue

### 9. Add sync service in frontend

Suggested path:
- `frontend/src/lib/offline-sync.ts`

Responsibilities:
- detect connection restored
- read `pending_invoices`
- submit them one by one
- mark success/failure

Trigger points:
- app startup
- browser `online` event
- manual sync button later

### 10. Sync request flow

For each pending invoice:
- call `POST /sales/invoices`
- send invoice payload
- if success:
  - mark local invoice `synced`
  - save returned `sale.id`
  - save returned `invoiceNumber`
- if failure:
  - mark invoice `failed`
  - store error text

## Phase 6: Backend Support

### 11. Keep current invoice endpoint for first version

First version can still use:
- `POST /sales/invoices`

No new endpoint is strictly required yet.

Later you may add:
- `POST /sales/invoices/sync`

for more explicit offline reconciliation.

### 12. Consider server-side duplicate protection

Offline sync can accidentally retry.

Add optional `clientReferenceId` support in sale creation.

Suggested backend change:
- add `clientReferenceId` to `Sale`
- unique per tenant

That allows idempotent sync.

Recommended future schema field:

```prisma
clientReferenceId String?
@@unique([tenantId, clientReferenceId])
```

## Phase 7: Offline Status UI

### 13. Add offline indicators

Show clear status in UI:
- `Offline mode`
- `3 invoices pending sync`
- `Last synced 10:42 AM`

Suggested placement:
- billing page
- header or footer status bar

### 14. Add sync queue page later

Suggested route:
- `/billing/offline-sync`

Show:
- pending invoices
- failed invoices
- sync errors
- retry action

## Phase 8: Stock Strategy

### 15. First version stock model

Do not over-engineer stock for first release.

Use:
- last synced stock snapshot
- local decrement when invoice is created offline

Rule:
- only one main billing device should use offline billing per tenant

This reduces overselling risk.

### 16. Conflict handling

If sync fails due to stock mismatch:
- mark invoice `failed`
- show reason
- let admin review manually

Do not auto-resolve silently.

## Suggested File Additions

Frontend:
- `frontend/src/lib/offline-db.ts`
- `frontend/src/lib/offline-sync.ts`
- `frontend/src/hooks/use-offline-status.ts`
- `frontend/src/components/offline/offline-banner.tsx`
- `frontend/src/components/offline/sync-status.tsx`

Backend:
- optional later:
  - `clientReferenceId` support in sales service
  - sync-specific endpoint if needed

## Suggested Patch Order

1. Add IndexedDB wrapper
2. Cache branding/business profile/customers/products
3. Read billing data from cache when offline
4. Save invoice locally when offline
5. Keep print working from local state
6. Add sync queue processor
7. Add offline/sync status UI
8. Add idempotent server sync support

## Testing Plan

### Manual tests

1. Load billing while online
2. Confirm customers/products cache locally
3. Turn internet off
4. Open billing again
5. Create invoice offline
6. Print invoice
7. Restore internet
8. Verify invoice syncs to backend

### Failure tests

1. Sync same offline invoice twice
2. Sync with removed customer
3. Sync with out-of-stock batch
4. Verify failed state is visible

## Practical Recommendation

Implement only this in first pass:
- offline cache
- offline invoice creation
- local print
- automatic sync

Do not include yet:
- offline returns
- offline purchases
- offline reports
- multi-device stock conflict resolution

That first version is already valuable and much safer to ship.
