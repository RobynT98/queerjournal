import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, orderBy, serverTimestamp, onSnapshot,
  doc, getDoc, getDocs, setDoc, enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// -------- Firebase configuration --------
const firebaseConfig = {
  apiKey: "AIzaSyB2le8k0FJkvVypBQw8Ty9vFVKYQPjUMFc",
  authDomain: "queerjournal-1cc9d.firebaseapp.com",
  projectId: "queerjournal-1cc9d",
  storageBucket: "queerjournal-1cc9d.firebasestorage.app",
  messagingSenderId: "53325952423",
  appId: "1:53325952423:web:24837ecc436332e436b282",
  measurementId: "G-0T6JCFJCFZ"
};

// -------- Init --------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});

let messaging = null;
try { messaging = getMessaging(app); } catch {}

// -------- UI refs --------
const emailEl = document.getElementById('emailInput');
const passEl = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const googleBtn = document.getElementById('googleBtn');
const logoutBtn = document.getElementById('logoutBtn');
const logoutTop = document.getElementById('logoutTop');
const resetBtn = document.getElementById('resetBtn');
const noteSection = document.getElementById('noteSection');
const notesSection = document.getElementById('notesSection');
const notesList = document.getElementById('notesList');

// -------- Firebase Auth functions --------
registerBtn.onclick = async () => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
    await ensureUserDoc(cred.user);
  } catch (e) { alert(e.message); }
};

loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
  } catch (e) { alert(e.message); }
};

googleBtn.onclick = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    await ensureUserDoc(res.user);
  } catch (e) { alert(e.message); }
};

const doLogout = () => signOut(auth);
logoutBtn.onclick = doLogout;
logoutTop.onclick = doLogout;

resetBtn.onclick = async () => {
  const email = (emailEl.value || '').trim();
  if (!email) return alert("Skriv in din e-post först, så skickar jag en återställningslänk.");
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Återställningslänk skickad! Kolla din e-post.");
  } catch (e) {
    alert("Kunde inte skicka återställningslänk: " + e.message);
  }
};

// -------- User document --------
async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const base = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) {
    await setDoc(ref, { ...base, createdAt: serverTimestamp(), tokens: [] });
  } else {
    await setDoc(ref, base, { merge: true });
  }
}

// -------- Notes Section --------
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

saveBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) { alert("Logga in först."); return; }

  try {
    const payload = {
      date: dateInput.value || today(),
      time: timeInput.value || now(),
      mood: moodInput.value || "",
      tags: (tagsInput.value || "").split(',').map(s => s.trim()).filter(Boolean),
      content: (contentInput.value || "").trim(),
      alarm: Boolean(alarmCheck.checked),
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "notes"), { uid: user.uid, ...payload });
    clearForm();
  } catch (e) {
    console.error("Save failed:", e);
    alert("Kunde inte spara: " + (e.message || e.code));
  }
};

// -------- Notes rendering --------
let currentNotes = [];
function render() {
  if (!currentNotes.length) {
    notesList.innerHTML = '<div class="empty">Inga anteckningar.</div>';
    return;
  }

  notesList.innerHTML = '';
  currentNotes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      <strong>${n.content}</strong>
      <p>${n.date}</p>
      <button class="pill">Redigera</button>
      <button class="pill">Radera</button>
    `;
    notesList.appendChild(div);
  });
}

// -------- Auth state --------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    noteSection.style.display = 'block';
    notesSection.style.display = 'block';
  } else {
    noteSection.style.display = 'none';
    notesSection.style.display = 'none';
  }
});
</script>

</body>
</html>
