import { NextResponse } from "next/server";
import { fetchOfficialNotices, NOTICE_URL } from "@/lib/notices";

export async function GET() {
  try {
    const notices = await fetchOfficialNotices();

    return NextResponse.json({ notices, fetchedAt: new Date().toISOString(), source: NOTICE_URL });
  } catch (error) {
    return NextResponse.json(
      { notices: [], error: error instanceof Error ? error.message : "Unknown error", source: NOTICE_URL },
      { status: 502 },
    );
  }
}
