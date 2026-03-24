SELECT id, name, "tenantId", "currentBalance" FROM "Supplier" WHERE name ILIKE '%zain%';
SELECT id, "billNumber", "supplierId" FROM "Purchase" WHERE "supplierId" IN (SELECT id FROM "Supplier" WHERE name ILIKE '%zain%');
SELECT id, name, "tenantId" FROM "Customer" WHERE name ILIKE '%zain%';
SELECT id, "invoiceNumber", "customerId" FROM "Sale" WHERE "customerId" IN (SELECT id FROM "Customer" WHERE name ILIKE '%zain%');
