import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'ac2b3b3b-ea40-46c4-9b9c-0829d85a5caf';
  console.log('Testing supplier creation for tenant:', tenantId);
  
  try {
    const s = await prisma.supplier.create({
      data: {
        name: 'Test Supplier ' + Date.now(),
        tenantId: tenantId,
        gstin: '27AABCU1234F1Z5',
        phone: '1234567890',
        address: 'Test Address',
        latitude: 0,
        longitude: 0
      }
    });
    console.log('Success!', s.id);
  } catch (err) {
    console.error('CRITICAL ERROR:', err);
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
