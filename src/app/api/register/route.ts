import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    // Instancia independiente: prohibido crear workspaces nuevos aquí
    // (escribiría tenants ajenos en la DB compartida). Altas solo vía
    // profesores (STAFF) o despliegue dedicado.
    if ((process.env.PINNED_TENANT_SLUG || "").trim()) {
      return NextResponse.json(
        { error: "Registro de workspaces deshabilitado en esta instancia." },
        { status: 403 }
      );
    }
    const { companyName, subdomain, adminName, adminEmail, adminPassword } = await req.json();

    if (!companyName || !subdomain || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    const cleanSlug = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    if (cleanSlug.length < 3) {
      return NextResponse.json(
        { error: "El subdominio debe tener al menos 3 caracteres alfanuméricos." },
        { status: 400 }
      );
    }

    // 1. Check if tenant already exists
    const existingTenant = await db.tenant.findUnique({
      where: { slug: cleanSlug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Este subdominio ya está registrado. Por favor elige otro." },
        { status: 400 }
      );
    }

    // 2. Create the tenant, default settings, and admin user in a single transaction
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await db.$transaction(async (tx: any) => {
      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          slug: cleanSlug,
          name: companyName.trim(),
          isActive: true,
        },
      });

      // Create Admin User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          passwordHash,
          role: "ADMIN",
        },
      });

      // Create default Settings
      const defaultSettings = [
        { key: "company_name", value: companyName.trim() },
        { key: "company_email", value: adminEmail.trim().toLowerCase() },
        { key: "company_timezone", value: "Europe/Madrid" },
        { key: "maintenance_mode", value: "false" },
        { key: "palmera_active_modes", value: JSON.stringify(["VENTAS", "COMUNICACION", "GESTION_PROYECTOS"]) },
      ];

      for (const setting of defaultSettings) {
        await tx.setting.create({
          data: {
            tenantId: tenant.id,
            key: setting.key,
            value: setting.value,
          },
        });
      }

      return { tenant, user };
    });

    return NextResponse.json(
      {
        message: "Organización y usuario administrador creados correctamente.",
        tenantSlug: result.tenant.slug,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error interno al crear el espacio de trabajo. Inténtelo de nuevo." },
      { status: 500 }
    );
  }
}
