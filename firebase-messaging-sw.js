// firebase-messaging-sw.js
/* global importScripts, firebase, self */
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB2le8k0FJkvVypBQw8Ty9vFVKYQPjUMFc",
  authDomain: "queerjournal-1cc9d.firebaseapp.com",
  projectId: "queerjournal-1cc9d",
  storageBucket: "queerjournal-1cc9d.appspot.com", // <-- ändrad
  messagingSenderId: "53325952423",
  appId: "1:53325952423:web:24837ecc436332e436b282",
});

const messaging = firebase.messaging();

// Bakgrundsnotiser när webappen är stängd / i bakgrunden
const show = (payload) => {
  const title = payload?.notification?.title || 'Queer Journal';
  const options = {
    body: payload?.notification?.body || 'Ny notis',
    icon: 'android-chrome-192x192.png',
    badge: 'android-chrome-192x192.png'
  };
  return self.registration.showNotification(title, options);
};

// Nyare compat-API
if (messaging.onBackgroundMessage) {
  messaging.onBackgroundMessage((payload) => show(payload));
} else if (messaging.setBackgroundMessageHandler) {
  // Fallback för äldre webbläsare/SDK
  messaging.setBackgroundMessageHandler((payload) => show(payload));
    }
