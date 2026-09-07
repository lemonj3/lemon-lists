const CACHE = 'lemon-lists-v4';

// 오프라인용으로 미리 담아두는 파일들
const ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {mode: 'no-cors'}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 화면(HTML)과 manifest는 항상 인터넷에서 새로 받아온다 → 수정하면 바로 반영
// 인터넷이 안 되면 마지막으로 받아둔 캐시를 보여준다
function isFresh(req) {
  if (req.mode === 'navigate') return true;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return false;
  return /\.(html|json)$/.test(url.pathname) || url.pathname.endsWith('/');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (isFresh(req)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // 폰트·아이콘 등 나머지는 캐시 우선 (빠르게)
  // Supabase 같은 API 요청은 캐시에 없으니 그대로 인터넷으로 넘어간다
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
