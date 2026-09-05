const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Existing users count:', users.length);
  for (const u of users) {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Phone: ${u.phoneNumber} | Role: ${u.role} | Shop: ${u.shopName}`);
  }

  // Update or reset password for the first admin user
  if (users.length > 0) {
    const admin = users.find(u => u.role === 'TAILOR_ADMIN' || u.role === 'SUPER_ADMIN') || users[0];
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log(`\n🔑 Updated password for Admin (${admin.email || admin.phoneNumber}):`);
    console.log(`   Login Identifier: ${admin.email || admin.phoneNumber}`);
    console.log(`   Password: Admin@123`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
