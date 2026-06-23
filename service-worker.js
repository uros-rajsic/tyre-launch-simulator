const CACHE_NAME = "tyre-chimney-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/main.js",
  "./vendor/three.min.js",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/start.mp3",
  "./assets/fullspeed.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const url = new URL(request.url);
        const shouldCache =
          response.ok &&
          url.origin === self.location.origin &&
          ["document", "script", "style", "image", "manifest", "audio", ""].includes(request.destination);

        if (shouldCache || url.pathname.endsWith(".glb")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
