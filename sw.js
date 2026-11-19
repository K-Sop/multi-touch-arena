/* Multi Touch Arena - オフライン用 Service Worker
   方針: キャッシュ優先で即表示し、裏で最新版を取得（次回起動で更新）。
   アプリを更新したときは VER を変えると古いキャッシュが捨てられます。 */
const VER = "pta-v11";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VER);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === "navigate") { const idx = await cache.match("./index.html"); if (idx) return idx; }
    return new Response("オフラインです", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  })());
});
