const CACHE_NAME = "mmc-portal-V73-2";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
    "./logo.png"
];

// INSTALL
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log("V73.2: Caching app shell");
                return cache.addAll(APP_SHELL);
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error("Service Worker install failed:", error);
            })
    );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log("Deleting old cache:", cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// FETCH
self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = request.url;

    // Do not cache Firebase / Google API requests
    if (
        url.includes("firebaseio.com") ||
        url.includes("firebasedatabase.app") ||
        url.includes("firebasestorage.app") ||
        url.includes("googleapis.com") ||
        url.includes("firebaseapp.com") ||
        url.includes("gstatic.com")
    ) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ offline: true }),
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            })
        );
        return;
    }

    // HTML/navigation:
    // Network first so new MMC versions are received quickly.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put("./index.html", copy);
                            })
                            .catch((error) => {
                                console.warn("Unable to update cached index:", error);
                            });
                    }

                    return response;
                })
                .catch(async () => {
                    const cached =
                        await caches.match("./index.html") ||
                        await caches.match("./");

                    if (cached) {
                        return cached;
                    }

                    return new Response(
                        "MMC Portal is currently offline.",
                        {
                            status: 503,
                            headers: {
                                "Content-Type": "text/plain; charset=utf-8"
                            }
                        }
                    );
                })
        );

        return;
    }

    // Static files:
    // Cache first, network fallback.
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then((networkResponse) => {
                        if (
                            networkResponse &&
                            networkResponse.ok &&
                            networkResponse.type !== "opaque"
                        ) {
                            const copy = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, copy);
                                })
                                .catch((error) => {
                                    console.warn("Unable to cache resource:", error);
                                });
                        }

                        return networkResponse;
                    });
            })
    );
});

// Allow index.html to activate a newly installed SW immediately
self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
