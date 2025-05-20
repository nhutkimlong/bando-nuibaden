// Resource hints for faster loading
document.addEventListener('DOMContentLoaded', function() {
    // Preload critical resources
    const preloadLinks = [
        { rel: 'preload', href: '/css/style.css', as: 'style' },
        { rel: 'preload', href: '/js/main.js', as: 'script' },
        { rel: 'preload', href: '/js/map.js', as: 'script' }
    ];

    preloadLinks.forEach(link => {
        const preloadLink = document.createElement('link');
        Object.assign(preloadLink, link);
        document.head.appendChild(preloadLink);
    });

    // Lazy load non-critical scripts
    const lazyScripts = [
        '/js/guide.js',
        '/js/features.js',
        '/js/climb.js'
    ];

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    };

    // Load non-critical scripts when browser is idle
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            lazyScripts.forEach(script => loadScript(script));
        });
    } else {
        setTimeout(() => {
            lazyScripts.forEach(script => loadScript(script));
        }, 1000);
    }
});

// Cache API for offline support
if ('caches' in window) {
    const CACHE_NAME = 'nuibaden-cache-v1';
    const urlsToCache = [
        '/',
        '/css/style.css',
        '/js/main.js',
        '/js/map.js',
        '/assets/logo.png'
    ];

    self.addEventListener('install', event => {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => cache.addAll(urlsToCache))
        );
    });

    self.addEventListener('fetch', event => {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    });
} 