import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchOfficialNotices } from "@/lib/notices";
import { markSeen, pushStoreConfigured, saveSubscription } from "@/lib/push-store";

const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
  keywords: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
});

export async function POST(request: Request) {
  if (!pushStoreConfigured()) {
    return NextResponse.json({ saved: false, error: "Subscription store is not configured" }, { status: 503 });
  }
  try {
    const body = schema.parse(await request.json());
    const id = await saveSubscription({
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
      keywords: [...new Set(body.keywords)],
    });
    const current = await fetchOfficialNotices();
    await markSeen(id, current.map((notice) => notice.id));
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ saved: false, error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
