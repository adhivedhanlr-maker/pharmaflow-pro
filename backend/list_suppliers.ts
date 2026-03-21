import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Suppliers ---');
  try {
    const suppliers = await prisma.supplier.findMany();
    console.table(suppliers.map(s => ({
      id: s.id,
      name: s.name,
      tenantId: s.tenantId,
      gstin: s.gstin,
    })));
  } catch (err) {
    console.error('Failed to fetch suppliers:', err.message);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
