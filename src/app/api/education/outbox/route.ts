import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { requireModuleAccess } from "@/lib/requireModule";

const STATUSES = new Set(["QUEUED", "SENT", "OPENED", "DELIVERED", "READ", "FAILED"]);

type RecipientInput = {
  label?: string;
  phone?: string;
  contactId?: string;
  role?: string;
};

type LogBody = {
  lesson?: string;
  instrument?: string;
  body?: string;
  origin?: string;
  channel?: string;
  status?: string;
  link?: string;
  lessonId?: string;
  studentId?: string;
  batchToken?: string;
  sentAt?: string;
  recipients?: RecipientInput[];
};

type OutboxRow = {
  id: string;
  batchToken: string | null;
  sentAt: Date | null;
  createdAt: Date;
  recipientLabel: string | null;
  recipientRole: string | null;
  toPhone: string;
  status: string;
  lessonLabel: string | null;
  instrument: string | null;
  body: string;
  origin: string;
  link: string | null;
  userId: string | null;
  senderName: string | null;
  sender: { id: string; name: string } | null;
};

function errorMessage(e: unknown): string {
  console.error("[education/outbox]", e instanceof Error ? e.message : e);
  return "No se pudo completar la operación";
}

function isAdminRole(role: unknown): boolean {
  return role === "ADMIN" || role === "DEV";
}

/** Agrupa filas por envío (batchToken) para devolver la forma que pinta el panel. */
function groupRows(rows: OutboxRow[]) {
  const map = new Map<string, {
    id: string;
    at: string;
    lesson: string;
    instrument: string;
    recipients: { label: string; phone: string }[];
    body: string;
    status: string;
    origin: string;
    link: string;
    sender: { id: string; name: string };
  }>();
  for (const r of rows) {
    const key = r.batchToken || r.id;
    const at = (r.sentAt || r.createdAt).toISOString();
    const recipient = {
      label: r.recipientLabel || r.recipientRole || "Destinatario",
      phone: r.toPhone,
    };
    const existing = map.get(key);
    if (existing) {
      existing.recipients.push(recipient);
      if (r.status === "SENT" || r.status === "DELIVERED" || r.status === "READ") existing.status = "SENT";
      else if (!existing.status && r.status) existing.status = r.status;
      if (new Date(at) > new Date(existing.at)) existing.at = at;
      continue;
    }
    map.set(key, {
      id: key,
      at,
      lesson: r.lessonLabel || "Sin clase",
      instrument: r.instrument || "",
      recipients: [recipient],
      body: r.body || "",
      status: r.status || "QUEUED",
      origin: r.origin || "CLOUD",
      link: r.link || "",
      sender: r.sender ? { id: r.sender.id, name: r.sender.name } : { id: r.userId || "", name: r.senderName || "—" },
    });
  }
  return Array.from(map.values()).sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function GET(request: Request) {
  const auth = await requireModuleAccess("EDUCACION");
  if ("error" in auth) return auth.error;
  const { session, tenantId } = auth;
  const admin = isAdminRole((session.user as { role?: string }).role);

  const url = new URL(request.url);
  const teacherId = url.searchParams.get("teacherId") || "";

  try {
    const where: Prisma.EduOutboxMessageWhereInput = { tenantId };
    if (admin) {
      if (teacherId) where.userId = teacherId;
    } else {
      where.userId = session.user.id;
    }

    const rows = await db.eduOutboxMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { sender: { select: { id: true, name: true } } },
    });

    let teachers: Array<{ id: string; name: string; email: string }> = [];
    if (admin) {
      const users = await db.user.findMany({
        where: { tenantId, workRoles: { has: "PROFESOR" } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
      teachers = users;
    }

    return NextResponse.json({ success: true, isAdmin: admin, teachers, entries: groupRows(rows) });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(e), isAdmin: admin, teachers: [], entries: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireModuleAccess("EDUCACION");
  if ("error" in auth) return auth.error;
  const { session, tenantId } = auth;

  const body = (await request.json().catch(() => ({}))) as LogBody;
  const text = String(body.body || "").trim();
  if (!text) return NextResponse.json({ error: "body requerido" }, { status: 400 });

  const recipients = (Array.isArray(body.recipients) ? body.recipients : [])
    .filter((r) => r && typeof r.phone === "string" && r.phone.trim().length > 0)
    .slice(0, 50);
  if (recipients.length === 0) {
    return NextResponse.json({ success: true, logged: 0 });
  }

  const status = STATUSES.has(String(body.status || "").toUpperCase())
    ? String(body.status).toUpperCase()
    : "OPENED";
  const channel = body.channel === "WHATSAPP_CLOUD" ? "WHATSAPP_CLOUD" : "WHATSAPP_ME";
  const origin = ["reporte", "clase"].includes(String(body.origin)) ? String(body.origin) : "CLOUD";
  const batchToken = body.batchToken || crypto.randomUUID();
  const senderName = session.user.name || session.user.email || "Usuario";
  const sentAt = body.sentAt ? new Date(body.sentAt) : new Date();

  try {
    await db.eduOutboxMessage.createMany({
      data: recipients.map((r) => ({
        tenantId,
        studentId: body.studentId || null,
        lessonId: body.lessonId || null,
        userId: session.user.id,
        senderName,
        lessonLabel: body.lesson ? String(body.lesson) : null,
        instrument: body.instrument ? String(body.instrument) : null,
        channel,
        origin,
        recipientContactId: r.contactId || null,
        recipientRole: r.role || null,
        recipientLabel: r.label || null,
        toPhone: String(r.phone).trim(),
        body: text,
        link: body.link || null,
        batchToken,
        status,
        sentAt: Number.isNaN(sentAt.getTime()) ? new Date() : sentAt,
      })),
    });
    return NextResponse.json({ success: true, logged: recipients.length, batchToken });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireModuleAccess("EDUCACION");
  if ("error" in auth) return auth.error;
  const { session, tenantId } = auth;
  const admin = isAdminRole((session.user as { role?: string }).role);

  const url = new URL(request.url);
  const teacherId = url.searchParams.get("teacherId") || "";

  const where: Prisma.EduOutboxMessageWhereInput = { tenantId };
  if (admin) {
    if (teacherId) where.userId = teacherId;
  } else {
    where.userId = session.user.id;
  }

  try {
    const result = await db.eduOutboxMessage.deleteMany({ where });
    return NextResponse.json({ success: true, removed: result.count });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(e) }, { status: 500 });
  }
}
