// Service worker de notificações. Recebe o push do servidor e abre o anime ao tocar.

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'AniDeck', body: event.data.text() };
  }

  // Android não exibe SVG no ícone nem no badge; os dois precisam ser PNG.
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };
  if (data.image) options.image = data.image;
  // A tag substitui a notificação anterior do mesmo episódio em vez de empilhar.
  if (data.tag) options.tag = data.tag;

  event.waitUntil(self.registration.showNotification(data.title || 'AniDeck', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (janelas) {
      // Reaproveita uma aba do AniDeck já aberta, levando-a para o anime.
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && 'focus' in janela) {
          return janela.navigate(destino).then(function (j) {
            return (j || janela).focus();
          });
        }
      }
      return clients.openWindow(destino);
    })
  );
});
