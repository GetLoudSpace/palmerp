import { NextResponse } from "next/server";
import { checkForUpdates } from "@/lib/fleet/upstream";

export async function GET() {
  try {
    const check = await checkForUpdates();
    return NextResponse.json({ success: true, ...check });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
