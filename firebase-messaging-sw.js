// Firebase Cloud Messaging Background Service Worker for SenDeke.to
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBJ2DoTheukNQIr3KfDBk86ZQ2Cb0Uuj2s",
  authDomain: "sendeke-to-web.firebaseapp.com",
  projectId: "sendeke-to-web",
  storageBucket: "sendeke-to-web.firebasestorage.app",
  messagingSenderId: "157567617787",
  appId: "1:157567617787:web:2cc09f45165c1aeb133e5e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'SenDeke.to Dispatch Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New courier order or update available.',
    icon: '/assets/img/apple-touch-icon.png',
    badge: '/assets/img/favicon-32x32.png',
    data: payload.data || {},
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/driver.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('driver.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
