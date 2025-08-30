// firebase-messaging-sw.js
/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB2le8k0FJkvVypBQw8Ty9vFVKYQPjUMFc",
  authDomain: "queerjournal-1cc9d.firebaseapp.com",
  projectId: "queerjournal-1cc9d",
  storageBucket: "queerjournal-1cc9d.firebasestorage.app",
  messagingSenderId: "53325952423",
  appId: "1:53325952423:web:24837ecc436332e436b282",
});

const messaging = firebase.messaging();

// Visas när appen är i bakgrunden
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'Queer Journal';
  const options = {
    body: payload?.notification?.body || 'Ny notis',
    icon: 'android-chrome-192x192.png'
  };
  self.registration.showNotification(title, options);
});
