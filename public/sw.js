const CACHE = 'memorygym-v1'
const ASSETS = ['/', '/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)).catch(() => caches.match('/')))
})

// Push notification handler
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'MemoryGym', body: "Time for your daily brain training! 🧠" }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon-192.png', badge: '/icon-192.png',
    tag: 'daily-reminder', renotify: true,
    actions: [{ action: 'open', title: 'Start Training' }]
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})
