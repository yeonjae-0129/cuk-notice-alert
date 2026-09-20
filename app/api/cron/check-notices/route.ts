import { NextResponse } from "next/server";
import { fetchOfficialNotices, matchingKeywords } from "@/lib/notices";
import { deactivateSubscription, listSent, listSubscriptions, markSeen, pushStoreConfigured } from "@/lib/push-store";
import { pushConfigured, sendPush, toPushSubscription } from "@/lib/push";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured() || !pushStoreConfigured()) {
    return NextResponse.json({ error: "Push service is not fully configured" }, { status: 503 });
  }

  const notices = await fetchOfficialNotices();
  const subscriptions = await listSubscriptions();
  const sentRows = await listSent(notices.map((notice) => notice.id));
  const sent = new Set(sentRows.map((row) => `${row.subscription_id}:${row.article_id}`));
  let delivered = 0;
  let deactivated = 0;

  for (const subscription of subscriptions) {
    const matching = notices.filter((notice) => matchingKeywords(notice, subscription.keywords).length && !sent.has(`${subscription.id}:${notice.id}`));
    for (const notice of matching) {
      try {
        const keyword = matchingKeywords(notice, subscription.keywords)[0];
        await sendPush(toPushSubscription(subscription), {
          title: `관심 공지 · ${keyword}`,
          body: notice.title,
          url: notice.url,
          tag: `cuk-notice-${notice.id}`,
        });
        await markSeen(subscription.id, [notice.id]);
        delivered += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await deactivateSubscription(subscription.id);
          deactivated += 1;
          break;
        }
        throw error;
      }
    }
  }

  return NextResponse.json({ checked: notices.length, subscriptions: subscriptions.length, delivered, deactivated });
}
