// Elgreensyde Solo-Operator Service Worker
// Version 1.0

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    data = event.data.json();
  } else {
    data = {
      title: 'Elgreensyde Alert',
      body: 'Urgent action required on the farm.'
    };
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: self.location.origin
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
