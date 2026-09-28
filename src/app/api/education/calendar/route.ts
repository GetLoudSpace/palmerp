// src/app/api/education/calendar/route.ts
// Lectura eventos del día. Creds: vault por tenant (cifrado) > env global.
// El vault se descifra SOLO en memoria del servidor; al cliente solo llega configured:true/false.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { readVault } from "@/lib/secrets";

const GOOGLE_JSON_KEY = "google_service_account_json";
const GOOGLE_CAL_ID_KEY = "google_calendar_id";

async function resolveGoogleConfig(): Promise<{ serviceAccountJson: string | null; calendarId: string | null }> {
  let vaultJson: string | null = null;
  let vaultCalId: string | null = null;
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    if (tenantId) {
      const vault = await readVault(tenantId, [GOOGLE_JSON_KEY, GOOGLE_CAL_ID_KEY]);
      vaultJson = vault[GOOGLE_JSON_KEY];
      vaultCalId = vault[GOOGLE_CAL_ID_KEY];
    }
  } catch {
    // sin sesión/DB → env
  }
  return {
    serviceAccountJson: vaultJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null,
    calendarId: vaultCalId || process.env.GOOGLE_CALENDAR_ID || null,
  };
}

function getCalendarClient(serviceAccount: string) {
  let credentials: unknown;
  try {
    credentials = JSON.parse(serviceAccount);
  } catch {
    throw new Error("Google Service Account JSON malformed");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: credentials as never,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  return google.calendar({ version: "v3", auth });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const professorEmail = url.searchParams.get("email");
  if (!professorEmail) {
    return NextResponse.json({ error: "Missing professor email" }, { status: 400 });
  }
  // Google es espejo opcional: sin creds devolvemos 200 vacío para que
  // Palmera (localStorage) siga siendo source of truth sin romper la UI.
  const gconf = await resolveGoogleConfig();
  if (!gconf.serviceAccountJson || !gconf.calendarId) {
    return NextResponse.json({ events: [], configured: false });
  }
  try {
    const calendar = getCalendarClient(gconf.serviceAccountJson);
    const calendarId = gconf.calendarId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const res = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = (res.data.items || []).filter(
      (e: any) => e.organizer?.email?.toLowerCase() === professorEmail.toLowerCase()
    );
    return NextResponse.json({ events, configured: true });
  } catch (err: any) {
    const msg = err.message || "Server error";
    // Si las creds se retiraron entre el check y la llamada, degradar a 200 vacío.
    if (msg.includes("not configured") || msg.includes("malformed")) {
      return NextResponse.json({ events: [], configured: false });
    }
    console.error(err);
    return NextResponse.json({ error: msg, configured: true }, { status: 500 });
  }
}
