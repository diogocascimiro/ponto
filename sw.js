// Service worker do ponto.almg.digital
// Deixa o site abrir sem internet, permite instalar como app e mostrar o aviso de saída.
// Estratégia: rede primeiro (sempre pega a versão nova); se falhar, usa a cópia guardada.
const CACHE = "ponto-v2";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return; // contador de visitas e outros: direto na rede

  // Arquivos do próprio site: sempre confere com o servidor (no-cache), para a versão nova aparecer na hora.
  const net = sameOrigin ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req);
  event.respondWith(
    net
      .then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))
      )
  );
});

// Clicar no aviso "Hora de sair" traz a página do ponto para a frente.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});
