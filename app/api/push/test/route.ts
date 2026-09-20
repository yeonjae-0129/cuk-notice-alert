import { NextResponse } from "next/server";
import { z } from "zod";
import { pushConfigured, sendPush } from "@/lib/push";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  if (!pushConfigured()) return NextResponse.json({ sent: false, error: "Push keys are not configured" }, { status: 503 });
  try {
    const subscription = schema.parse(await request.json());
    await sendPush(subscription, {
      title: "가대알림 테스트",
      body: "실제 웹 푸시 알림이 정상적으로 도착했어요.",
      url: "/",
      tag: "cuk-notice-test",
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json({ sent: false, error: error instanceof Error ? error.message : "Push failed" }, { status: 400 });
  }
}
