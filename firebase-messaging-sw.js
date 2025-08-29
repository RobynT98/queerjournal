// firebase-messaging-sw.js (måste ligga i roten)
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB2le8k0FJkvVypBQw8Ty9vFVKYQPjUMFc",
  authDomain: "queerjournal-1cc9d.firebaseapp.com",
  projectId: "queerjournal-1cc9d",
  storageBucket: "queerjournal-1cc9d.firebasestorage.app",
  messagingSenderId: "53325952423",
  appId: "1:53325952423:web:24837ecc436332e436b282",
  measurementId: "G-0T6JCFJCFZ"
});

const messaging = firebase.messaging();

// Visas när push kommer i bakgrunden
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Queer Journal";
  const body  = payload?.notification?.body  || "Ny notis";
  self.registration.showNotification(title, {
    body,
    icon: "android-chrome-192x192.png" // funkar även offline
  });
});
