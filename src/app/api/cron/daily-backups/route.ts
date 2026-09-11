import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";
import { gzipSync } from "zlib";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    // Verificación de seguridad de Vercel Cron
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, slug: true }
    });

    const results = [];
    const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD actual
    
    // Calcular la fecha de hace 31 días para borrar el backup viejo (Política de Retención)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 31);
    const oldDateStr = retentionDate.toISOString().split("T")[0];

    for (const tenant of tenants) {
      const data = {
        tenant: await prisma.tenant.findUnique({ where: { id: tenant.id } }),
        users: await prisma.user.findMany({ where: { tenantId: tenant.id } }),
        contacts: await prisma.contact.findMany({ where: { tenantId: tenant.id } }),
        orders: await prisma.order.findMany({ where: { shop: { tenantId: tenant.id } } }),
        // Añadir más tablas según escale el ERP
      };
      
      // 1. Convertir a JSON
      const jsonString = JSON.stringify(data, null, 2);
      
      // 2. Comprimir con GZIP (~90% de reducción de tamaño)
      const compressedBuffer = gzipSync(Buffer.from(jsonString, "utf-8"));
      
      const fileName = `daily/${dateStr}.json.gz`; 
      const oldFileName = `daily/${oldDateStr}.json.gz`;
      
      try {
        // 3. Subir el nuevo backup comprimido
        await uploadFile(tenant.id, fileName, compressedBuffer, "application/gzip");
        
        // 4. Borrar el backup de hace 31 días (si existe)
        await deleteFile(tenant.id, oldFileName);

        results.push({ 
          tenant: tenant.slug, 
          status: "success", 
          file: fileName,
          deletedOldBackup: oldFileName
        });
      } catch (uploadError) {
        results.push({ tenant: tenant.slug, status: "error", error: String(uploadError) });
      }
    }

    return NextResponse.json({ success: true, count: tenants.length, results });
  } catch (error) {
    console.error("Backup Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
