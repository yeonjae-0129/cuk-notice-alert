self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "가대알림", {
    body: data.body || "새 관심 공지가 올라왔어요.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || "cuk-notice",
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    for (const client of windows) {
      if (client.url === target && "focus" in client) return client.focus();
    }
    return clients.openWindow(target);
  }));
});
