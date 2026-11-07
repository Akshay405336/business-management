import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient();

const rows = await prisma.organizationMembership.findMany({
  where: {
    status: 'ACTIVE',
    roleLinks: { some: { role: { key: 'project_manager' } } },
  },
  select: {
    admin: { select: { email: true, displayName: true } },
    roleLinks: {
      where: { role: { status: 'ACTIVE' } },
      include: { role: { select: { key: true, name: true } } },
    },
  },
  take: 20,
});

console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
