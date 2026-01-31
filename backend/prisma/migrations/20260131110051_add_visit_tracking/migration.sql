-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_repId_idx" ON "Visit"("repId");

-- CreateIndex
CREATE INDEX "Visit_customerId_idx" ON "Visit"("customerId");

-- CreateIndex
CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
