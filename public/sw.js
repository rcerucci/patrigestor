const CACHE_NAME = 'patrigestor-v1'
const STATIC_CACHE = 'patrigestor-static-v1'
const DYNAMIC_CACHE = 'patrigestor-dynamic-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Instalação - cachear assets estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cacheando assets estáticos')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  
  self.skipWaiting()
})

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  self.clients.claim()
})

// Fetch - estratégia Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Ignorar requisições não-HTTP
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Ignorar requisições para Supabase
  if (url.hostname.includes('supabase')) {
    return
  }
  
  // NUNCA cachear a página de login ou rotas de autenticação
  if (url.hash && (url.hash.includes('#login') || url.hash.includes('#setup-root'))) {
    console.log('[SW] Ignorando cache para rota de autenticação:', url.hash)
    event.respondWith(fetch(request))
    return
  }
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clonar response antes de cachear
        const responseClone = response.clone()
        
        // Cachear apenas GET requests bem-sucedidas
        // E NÃO cachear rotas de login/autenticação
        if (
          request.method === 'GET' && 
          response.status === 200 && 
          !url.hash.includes('#login') && 
          !url.hash.includes('#setup-root')
        ) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        
        return response
      })
      .catch(() => {
        // Se network falhar, tentar cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          
          // Fallback para página offline se disponível
          if (request.mode === 'navigate') {
            return caches.match('/index.html')
          }
        })
      })
  )
})

// Push notifications (para futuro)
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido')
  
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'PatriGestor'
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200]
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})