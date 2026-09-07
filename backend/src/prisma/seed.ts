import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@tailoring.com';
  
  // Check if admin exists
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!admin) {
    console.log('Admin account not found. Creating a new one...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        phoneNumber: '+919999999999',
        shopName: 'Tailoring ERP Shop',
        role: 'SUPER_ADMIN',
        isActive: true,
        isEmailVerified: true
      }
    });
    console.log('✅ Admin account created successfully!');
  } else {
    console.log('Admin account already exists.');
  }

  console.log(`\n🔑 Login Credentials:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: admin123\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
