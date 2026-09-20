import webpush, { type PushSubscription } from "web-push";

export type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  keywords: string[];
};

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPush(subscription: PushSubscription, payload: object) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured");

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@cuk-notice-alert.app",
    publicKey,
    privateKey,
  );
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

export function toPushSubscription(value: Pick<StoredSubscription, "endpoint" | "p256dh" | "auth">): PushSubscription {
  return { endpoint: value.endpoint, keys: { p256dh: value.p256dh, auth: value.auth } };
}
