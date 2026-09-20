import type { StoredSubscription } from "@/lib/push";

type Json = Record<string, unknown> | Record<string, unknown>[];

function configuration() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function pushStoreConfigured() {
  return Boolean(configuration());
}

async function request(path: string, init: RequestInit = {}) {
  const config = configuration();
  if (!config) throw new Error("Push subscription store is not configured");
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Subscription store responded with ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) as Json : null;
}

export async function saveSubscription(input: Omit<StoredSubscription, "id">) {
  const rows = await request("push_subscriptions?on_conflict=endpoint", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      keywords: input.keywords,
      active: true,
      updated_at: new Date().toISOString(),
    }),
  }) as Array<{ id: string }>;
  if (!rows?.[0]?.id) throw new Error("Subscription was not returned after saving");
  return rows[0].id;
}

export async function listSubscriptions() {
  return await request("push_subscriptions?select=id,endpoint,p256dh,auth,keywords&active=eq.true") as StoredSubscription[];
}

export async function listSent(articleIds: string[]) {
  if (!articleIds.length) return [];
  const filter = encodeURIComponent(`(${articleIds.join(",")})`);
  return await request(`sent_notifications?select=subscription_id,article_id&article_id=in.${filter}`) as Array<{ subscription_id: string; article_id: string }>;
}

export async function markSeen(subscriptionId: string, articleIds: string[]) {
  if (!articleIds.length) return;
  await request("sent_notifications?on_conflict=subscription_id,article_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(articleIds.map((articleId) => ({ subscription_id: subscriptionId, article_id: articleId }))),
  });
}

export async function deactivateSubscription(id: string) {
  await request(`push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }),
  });
}
