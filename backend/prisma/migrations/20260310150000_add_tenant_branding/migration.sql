-- CreateTable
CREATE TABLE "TenantBranding" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customDomain" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "accentColor" TEXT DEFAULT '#0f172a',
    "loginTitle" TEXT,
    "loginSubtitle" TEXT,
    "faviconUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBranding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantBranding_slug_key" ON "TenantBranding"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBranding_customDomain_key" ON "TenantBranding"("customDomain");

-- CreateIndex
CREATE INDEX "TenantBranding_slug_idx" ON "TenantBranding"("slug");

-- CreateIndex
CREATE INDEX "TenantBranding_customDomain_idx" ON "TenantBranding"("customDomain");

-- CreateIndex
CREATE INDEX "TenantBranding_isActive_idx" ON "TenantBranding"("isActive");
