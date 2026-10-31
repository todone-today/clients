// Shows todone's push notifications and opens the app when one is clicked.
self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : { title: "todone", body: "" };
  e.waitUntil(
    self.registration.showNotification(d.title, { body: d.body, tag: d.tag, icon: "/icon.svg", data: { url: d.url || "/app" } }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/app", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      const open = ws.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.focus().then((w) => w.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
