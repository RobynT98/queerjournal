// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js");

firebase.initializeApp({
  apiKey: "AIzaSyB2le8k0FJkvVypBQw8Ty9vFVKYQPjUMFc",
  authDomain: "queerjournal-1cc9d.firebaseapp.com",
  projectId: "queerjournal-1cc9d",
  storageBucket: "queerjournal-1cc9d.firebasestorage.app",
  messagingSenderId: "53325952423",
  appId: "1:53325952423:web:24837ecc436332e436b282",
  measurementId: "G-0T6JCFJCFZ"
});

// Hämta messaging
const messaging = firebase.messaging();

// Hantera push i bakgrunden
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Fick bakgrundsmeddelande:", payload);
  const notificationTitle = payload.notification?.title || "Queer Journal";
  const notificationOptions = {
    body: payload.notification?.body || "Ny notis",
    icon: "android-chrome-192x192.png"
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
