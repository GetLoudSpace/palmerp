const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/palm?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');
  const tenantSlug = process.env.PALMERA_INSTANCE_SLUG || 'gastroshows';
  const companyName = process.env.PALMERA_INSTANCE_NAME || 'Gastroshows S.L.';
  const domain = process.env.PALMERA_INSTANCE_DOMAIN || `${tenantSlug}.palmerp.es`;
  const adminName = process.env.PALMERA_INSTANCE_ADMIN_NAME || 'Renato García';
  const adminEmail = (process.env.PALMERA_INSTANCE_ADMIN_EMAIL || 'admin@gastroshows.es').toLowerCase();
  const adminPassword = process.env.PALMERA_INSTANCE_ADMIN_PASSWORD || 'gastroshows123';
  const activeModes = (process.env.PALMERA_INSTANCE_MODES || 'RESTAURANTE,GESTION_EQUIPO,DIRECCION')
    .split(',')
    .map((mode) => mode.trim())
    .filter(Boolean);
  
  // 1. Create Tenant for the selected instance
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      name: companyName,
      domain,
      isActive: true,
    },
    create: {
      slug: tenantSlug,
      name: companyName,
      domain,
      isActive: true,
    },
  });
  console.log('Tenant upserted:', tenant.slug, tenant.id);

  // 2. Create Admin user for this tenant
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: adminEmail,
      },
    },
    update: {
      passwordHash: passwordHash,
      name: adminName,
      role: 'ADMIN',
    },
    create: {
      tenantId: tenant.id,
      name: adminName,
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin user upserted:', user.email);

  // 3. Create Tenant Settings
  const settings = [
    { key: 'company_name', value: companyName },
    { key: 'company_email', value: adminEmail },
    { key: 'company_timezone', value: 'Europe/Madrid' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'palmera_active_modes', value: JSON.stringify(activeModes) },
    { key: 'data_transfer_policy', value: JSON.stringify({ default: 'deny', requiresExplicitApiGrant: true }) },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: setting.key,
        },
      },
      update: {
        value: setting.value,
      },
      create: {
        tenantId: tenant.id,
        key: setting.key,
        value: setting.value,
      },
    });
  }
  console.log('Settings upserted for tenant:', tenant.id);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
