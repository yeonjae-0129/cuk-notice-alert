import { NextResponse } from "next/server";
import { fetchOfficialNotices, universityFromId } from "@/lib/notices";

export async function GET(request: Request) {
  const university = universityFromId(new URL(request.url).searchParams.get("school"));
  if (!university) return NextResponse.json({ notices: [], error: "Unsupported university" }, { status: 400 });
  try {
    const notices = await fetchOfficialNotices(university.id);

    return NextResponse.json({ notices, fetchedAt: new Date().toISOString(), source: university.sourceUrl, university });
  } catch (error) {
    return NextResponse.json(
      { notices: [], error: error instanceof Error ? error.message : "Unknown error", source: university.sourceUrl, university },
      { status: 502 },
    );
  }
}
