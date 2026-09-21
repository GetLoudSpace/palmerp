// src/app/api/education/calendar/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";
import type { NextRequest } from "next/server";

function getCalendarClient() {
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) throw new Error("Google Service Account JSON not configured");
  const credentials = JSON.parse(serviceAccount);
  const auth = new google.auth.GoogleAuth({
    credentials,
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
  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) throw new Error("Google Calendar ID not configured");
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
    return NextResponse.json({ events });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
