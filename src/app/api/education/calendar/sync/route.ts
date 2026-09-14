import { NextRequest, NextResponse } from "next/server";
import { getTenantIdFromHeaders } from "@/lib/tenant";
import db from "@/lib/db";
import { buildGoogleEventFromLesson, syncLessonToGoogle, deleteGoogleEvent } from "@/modules/education/lib/googleCalendar";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=> ({}));
    const { lessonId, lesson } = body as { lessonId?: string; lesson?: any };
    if (!lesson) return NextResponse.json({ success:false, error:"lesson requerido" }, { status:400 });
    const tenantId = (await getTenantIdFromHeaders()) || (lesson as any).tenantId || null;
    if (!tenantId) return NextResponse.json({ success:true, skipped:true, reason:"no tenant" });

    // Try to find calendar link for teacher
    let link: any = null;
    try {
      const prisma:any = db as any;
      if (lesson.teacherId && prisma.eduCalendarLink?.findFirst) {
        link = await prisma.eduCalendarLink.findFirst({ where:{ tenantId, userId: lesson.teacherId, syncEnabled:true } });
      }
      if (!link && prisma.eduCalendarLink?.findFirst) {
        link = await prisma.eduCalendarLink.findFirst({ where:{ tenantId, syncEnabled:true } });
      }
    } catch {}
    if (!link?.googleAccessToken || !link?.googleCalendarId) {
      return NextResponse.json({ success:true, skipped:true, reason:"Google no configurado — Palmera es source of truth, desconectable con el tiempo" });
    }

    const event = buildGoogleEventFromLesson({
      studentName: lesson.studentName || "Alumno",
      instrument: lesson.instrument || "GUITARRA",
      date: lesson.date,
      durationMin: lesson.durationMin || 45,
      roomName: lesson.roomName,
      notes: lesson.notes,
      batchToken: lesson.batchToken,
    });

    const result = await syncLessonToGoogle({
      accessToken: link.googleAccessToken,
      calendarId: link.googleCalendarId,
      googleEventId: lesson.googleEventId || null,
      event,
    });

    if (result.googleEventId) {
      try {
        const prisma:any = db as any;
        if (lessonId && prisma.eduLesson?.update) {
          await prisma.eduLesson.update({ where:{ id: lessonId }, data:{ googleEventId: result.googleEventId, googleCalendarId: link.googleCalendarId, googleSyncStatus:"synced", googleSyncError: null } });
        }
      } catch {}
    }

    if (result.error) return NextResponse.json({ success:false, error: result.error }, { status:500 });
    return NextResponse.json({ success:true, googleEventId: result.googleEventId });
  } catch (e:any) {
    return NextResponse.json({ success:false, error:String(e?.message??e) }, { status:500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(()=> ({}));
    const { googleEventId, googleCalendarId } = body as { googleEventId?: string; googleCalendarId?: string };
    if (!googleEventId || !googleCalendarId) return NextResponse.json({ success:false }, { status:400 });
    const tenantId = await getTenantIdFromHeaders();
    let token: string | null = null;
    let calId = googleCalendarId;
    try {
      const prisma:any = db as any;
      const link = tenantId ? await prisma.eduCalendarLink.findFirst({ where:{ tenantId, googleCalendarId: calId, syncEnabled:true } }) : null;
      token = link?.googleAccessToken || process.env.GOOGLE_ACCESS_TOKEN || null;
    } catch {}
    if (!token) return NextResponse.json({ success:true, skipped:true });
    const ok = await deleteGoogleEvent({ accessToken: token, calendarId: calId, googleEventId });
    return NextResponse.json({ success: ok });
  } catch (e:any) {
    return NextResponse.json({ success:false, error:String(e?.message??e) }, { status:500 });
  }
}
