import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchOfficialNotices } from "@/lib/notices";
import { markSeen, pushStoreConfigured, saveSubscription } from "@/lib/push-store";
import { universityFromId } from "@/lib/notices";

const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
  keywords: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
  schoolId: z.enum(["catholic", "snu", "yonsei", "korea", "skku"]),
});

export async function POST(request: Request) {
  if (!pushStoreConfigured()) {
    return NextResponse.json({ saved: false, error: "Subscription store is not configured" }, { status: 503 });
  }
  try {
    const body = schema.parse(await request.json());
    if (!universityFromId(body.schoolId)) throw new Error("Unsupported university");
    const id = await saveSubscription({
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
      keywords: [...new Set(body.keywords)],
      schoolId: body.schoolId,
    });
    // Existing notices become the baseline. Only announcements published after a
    // successful subscription can trigger a real push notification.
    try {
      const current = await fetchOfficialNotices(body.schoolId);
      await markSeen(id, current.map((notice) => notice.id));
    } catch {
      // The subscription remains valid even if a school's source is temporarily unavailable.
    }
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ saved: false, error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
