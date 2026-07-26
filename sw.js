const CACHE_NAME = "mmc-portal-V73-1";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
    "./logo.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error("Service Worker install cache failed:", err);
            })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("Deleting old cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                    return Promise.resolve();
                })
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const url = event.request.url;
    if (
        url.includes("firebaseio.com") ||
        url.includes("firebaseapp.com") ||
        url.includes("googleapis.com") ||
        url.includes("gstatic.com") ||
        url.includes("firebasestorage.app")
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put("./index.html", clonedResponse);
                    });
                    return response;
                })
                .catch(() => caches.match("./index.html"))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
