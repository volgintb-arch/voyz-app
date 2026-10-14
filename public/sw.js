// Сервис-воркер веб-версии Voyz: приложение открывается и работает без сети.
// - страницы: сначала сеть, без сети — сохранённая оболочка (любой адрес, роутер разберёт сам);
// - статика сборки, фото, аудио, рельеф (имена с хешами): из кэша, иначе сеть + сохранить;
// - сообщение {type:'precache', urls} — «Сохранить для офлайна»: качаем всё, сообщаем прогресс.
const CACHE = 'voyz-v1';
const SHELL = '/voyz-app/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) => url.origin === self.location.origin && /\/(_expo|assets)\//.test(url.pathname);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  if (isStatic(url) || (url.origin === self.location.origin && /\.(png|webmanifest|ico)$/.test(url.pathname))) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
  // остальное (онлайн-тайлы карты, маршруты, YouTube) — как обычно, через сеть
});

self.addEventListener('message', (e) => {
  if (e.data?.type !== 'precache') return;
  const port = e.ports[0];
  const urls = [...new Set(e.data.urls)];
  let done = 0;
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      // по 6 файлов параллельно — быстро и не забивает канал
      const queue = [...urls];
      const worker = async () => {
        while (queue.length) {
          const u = queue.shift();
          try {
            if (!(await c.match(u))) await c.add(u);
          } catch {
            // один файл не скачался — продолжаем, прогресс всё равно сообщаем
          }
          done++;
          if (done % 10 === 0 || done === urls.length) port?.postMessage({ done, total: urls.length });
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
    }),
  );
});
