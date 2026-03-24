-- Add invoice fields to BusinessProfile
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "panNo" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "dlNo" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "fssaiNo" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "bankBranch" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "bankAccountNo" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "bankIfsc" TEXT;

-- Add invoice fields to Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "dlNo" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "fssaiNo" TEXT;
