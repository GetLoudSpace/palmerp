// src/app/api/whatsapp/webhook/route.ts
// Webhooks Cloud API: verificación de Meta (GET) + eventos entrantes (POST).
// URL de devolución en Meta: https://TU-DOMINIO/api/whatsapp/webhook?tenant=getloud
// Env requerida: WHATSAPP_WEBHOOK_VERIFY_TOKEN (el mismo valor que pegas en Meta).
// Opcional: WHATSAPP_APP_SECRET para validar firma X-Hub-Signature-256.
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import db from "@/lib/db";

function verifyToken(): string {
  return (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim();
}

async function resolveTenantId(slug: string | null): Promise<string | null> {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return null;
  try {
    const t = await db.tenant.findUnique({ where: { slug: s }, select: { id: true, isActive: true } });
    return t && t.isActive ? t.id : null;
  } catch {
    return null;
  }
}

// GET: verificación de Meta (hub.mode=subscribe&hub.verify_token=...&hub.challenge=...)
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const mode = q.get("hub.mode");
  const token = q.get("hub.verify_token");
  const challenge = q.get("hub.challenge");
  const expected = verifyToken();
  if (!expected) return NextResponse.json({ error: "Webhook no configurado (WHATSAPP_WEBHOOK_VERIFY_TOKEN)" }, { status: 500 });
  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: mensajes entrantes + estados de entrega.
export async function POST(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get("tenant");
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return NextResponse.json({ success: false, error: "tenant desconocido (?tenant=slug)" }, { status: 400 });

  // Firma opcional (Meta la manda si hay APP_SECRET configurado aquí).
  const appSecret = (process.env.WHATSAPP_APP_SECRET || "").trim();
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256") || "";
    const raw = await req.text();
    const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(raw).digest("hex");
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
    }
    return handlePayload(tenantId, safeJson(raw));
  }
  const body = await req.json().catch(() => ({}));
  return handlePayload(tenantId, body);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const STATUS_MAP: Record<string, string> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePayload(tenantId: string, body: any) {
  try {
    const entries: unknown[] = Array.isArray(body?.entry) ? body.entry : [];
    for (const entry of entries as Array<{ changes?: Array<{ value?: Record<string, unknown> }> }>) {
      for (const ch of entry.changes || []) {
        const v = ch.value || {};
        // Estados de entrega → actualiza outbox por waMessageId.
        const statuses = Array.isArray(v.statuses) ? (v.statuses as Array<Record<string, unknown>>) : [];
        for (const st of statuses) {
          const wamid = typeof st.id === "string" ? st.id : null;
          const mapped = typeof st.status === "string" ? STATUS_MAP[st.status] : null;
          if (wamid && mapped) {
            try {
              await (db as unknown as { eduOutboxMessage: { updateMany: (a: unknown) => Promise<unknown> } }).eduOutboxMessage.updateMany({
                where: { waMessageId: wamid },
                data: { status: mapped, error: mapped === "FAILED" ? JSON.stringify(st.errors || st).slice(0, 500) : undefined },
              });
            } catch {}
          }
        }
        // Mensajes entrantes → auditoría (sirven para la ventana 24h).
        const messages = Array.isArray(v.messages) ? (v.messages as Array<Record<string, unknown>>) : [];
        for (const m of messages) {
          try {
            await db.auditLog.create({
              data: {
                tenantId,
                action: "WHATSAPP_INBOUND",
                table: "EduOutboxMessage",
                recordId: typeof m.id === "string" ? m.id : "unknown",
                details: `Entrante de ${(m.from as string) || "?"}: ${(((m.text as Record<string, unknown>) || {}).body as string || (m.type as string) || "").toString().slice(0, 200)}`,
                success: true,
              },
            });
          } catch {}
        }
      }
    }
  } catch {}
  // Meta exige 200 rápido; el procesado pesado va en background/auditoría.
  return NextResponse.json({ success: true });
}
