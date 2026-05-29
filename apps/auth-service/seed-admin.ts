import { PrismaClient } from '@prisma/client-auth';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.passenger.upsert({
    where: { email: 'admin@aerolink.com' },
    update: {},
    create: {
      email: 'admin@aerolink.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      kycVerified: true,
      passportNumber: 'ENCRYPTED_ADMIN_MOCK',
    },
  });

  console.log('Successfully seeded admin user:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
