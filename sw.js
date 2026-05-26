const CACHE_NAME = "mmc-portal-V70"; // UPDATE THIS EVERY TIME YOU CHANGE THE APP

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
    "./logo.png"
];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error("Service Worker install cache failed:", err);
            })
    );
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log("Deleting old cache:", cacheName);
                            return caches.delete(cacheName);
                        }
                        return Promise.resolve();
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    // Do not cache Firebase / Google API requests
    if (
        e.request.url.includes("firebaseio.com") ||
        e.request.url.includes("firebaseapp.com") ||
        e.request.url.includes("googleapis.com") ||
        e.request.url.includes("gstatic.com")
    ) {
        e.respondWith(fetch(e.request));
        return;
    }

    // For page navigation, try network first, fallback to cache
    if (e.request.mode === "navigate") {
        e.respondWith(
            fetch(e.request)
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

    // For normal assets, cache first
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
