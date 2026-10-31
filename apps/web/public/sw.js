// Shows todone's push notifications and opens the app when one is clicked.
self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : { title: "todone", body: "" };
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      tag: d.tag,
      icon: "/icon.svg",
      data: { url: d.url || "/app" },
    }),
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

// Offline: pages come from the network when it's there (a copy is kept), else from that copy;
// Next's build files never change under a name, so they're served from the cache once fetched.
// ponytail: old build files are never evicted; bump CACHE (or prune on activate) if the cache grows too big.
const CACHE = "todone-v1";
// Cloned now, before the page starts reading the body.
const keep = (key, res) => {
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(key, copy));
};
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) keep(url.pathname, res);
          return res;
        })
        .catch(() =>
          caches
            .match(url.pathname)
            .then((hit) => hit || caches.match("/app"))
            .then((hit) => hit || Response.error()),
        ),
    );
  } else if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) keep(req, res);
            return res;
          }),
      ),
    );
  }
});
