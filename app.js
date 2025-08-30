// app.js (ES Module)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot,
  doc, getDoc, getDocs, setDoc, enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ------------ Firebase config ------------
const firebaseConfig = {
  apiKey: "AIzaSyB2le8k0FJkvVypBQw8Ty9vFVKYQPjUMFc",
  authDomain: "queerjournal-1cc9d.firebaseapp.com",
  projectId: "queerjournal-1cc9d",
  storageBucket: "queerjournal-1cc9d.firebasestorage.app",
  messagingSenderId: "53325952423",
  appId: "1:53325952423:web:24837ecc436332e436b282",
  measurementId: "G-0T6JCFJCFZ"
};

// ------------ Init ------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
enableIndexedDbPersistence(db).catch(()=>{});

// ------------ Helpers ------------
const today = () => new Date().toISOString().slice(0,10);
const now   = () => new Date().toTimeString().slice(0,5);

// ------------ UI refs ------------
const authSection  = document.getElementById('authSection');
const noteSection  = document.getElementById('noteSection');
const notesSection = document.getElementById('notesSection');
const notesList    = document.getElementById('notesList');

const emailEl   = document.getElementById('emailInput');
const passEl    = document.getElementById('passwordInput');
const loginBtn  = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const googleBtn   = document.getElementById('googleBtn');
const logoutBtn   = document.getElementById('logoutBtn');
const logoutTop   = document.getElementById('logoutTop');
const resetBtn    = document.getElementById('resetBtn');

const dateInput    = document.getElementById('dateInput');
const timeInput    = document.getElementById('timeInput');
const moodInput    = document.getElementById('moodInput');
const tagsInput    = document.getElementById('tagsInput');
const contentInput = document.getElementById('contentInput');
const imageInput   = document.getElementById('imageInput');
const alarmCheck   = document.getElementById('alarmCheck');

const saveBtn  = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

const userChip  = document.getElementById('userChip');
const userName  = document.getElementById('userName');
const userPhoto = document.getElementById('userPhoto');

dateInput.value = today();
timeInput.value = now();

// ------------ Auth handlers ------------
registerBtn.onclick = async () => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
    await ensureUserDoc(cred.user);
  } catch (e) { alert(e.message); }
};

loginBtn.onclick = async () => {
  try { await signInWithEmailAndPassword(auth, emailEl.value, passEl.value); }
  catch (e) { alert(e.message); }
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
  if (!email) return alert("Skriv in din e-post först.");
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Återställningslänk skickad!");
  } catch (e) { alert("Kunde inte skicka: " + e.message); }
};

// ------------ User doc ------------
async function ensureUserDoc(user){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const base = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()){
    await setDoc(ref, { ...base, createdAt: serverTimestamp(), tokens: [] });
  } else {
    await setDoc(ref, base, { merge: true });
  }
}

// ------------ Notes: create / edit / delete ------------
let editId = null;
let editOriginalImage = null;

function clearForm(){
  editId = null;
  editOriginalImage = null;
  moodInput.value = "";
  tagsInput.value = "";
  contentInput.value = "";
  alarmCheck.checked = false;
  imageInput.value = "";
  dateInput.value = today();
  timeInput.value = now();
}
clearBtn.onclick = (e) => { e.preventDefault(); clearForm(); contentInput.focus(); };

saveBtn.onclick = async () => {
  const user = auth.currentUser;
  if(!user){ alert("Logga in först."); return; }

  try {
    // ev. bild -> dataURL
    const file = imageInput.files[0];
    const imgData = file ? await new Promise(res=>{
      const r = new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file);
    }) : null;

    const tags = (tagsInput.value||"").split(',').map(s=>s.trim()).filter(Boolean);

    const payload = {
      date: dateInput.value || today(),
      time: timeInput.value || now(),
      mood: moodInput.value || "",
      tags,
      content: (contentInput.value||"").trim(),
      image: imgData !== null ? imgData : editOriginalImage,
      alarm: !!alarmCheck.checked,
      updatedAt: serverTimestamp(),
    };

    if (editId) {
      await updateDoc(doc(db, "notes", editId), payload);
    } else {
      await addDoc(collection(db, "notes"), {
        uid: user.uid,
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    clearForm();
  } catch(e) {
    console.error(e);
    alert("Kunde inte spara: " + (e.message || e.code));
  }
};

// ------------ Live listener & render ------------
let unsubscribe = null;
let currentNotes = [];

function startNotesListener(uid){
  if (unsubscribe) { try{ unsubscribe(); }catch{} }
  const qy = query(
    collection(db,"notes"),
    where("uid","==",uid),
    orderBy("date","desc")
  );
  unsubscribe = onSnapshot(qy, (snap)=>{
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    arr.sort((a,b)=> (b.date + (b.time||"")).localeCompare(a.date + (a.time||"")));
    currentNotes = arr;
    render();
    rescheduleAll();
  }, (err)=> console.warn("Snapshot error:", err));
}

function enterEdit(n){
  editId = n.id;
  editOriginalImage = n.image ?? null;
  dateInput.value = n.date || today();
  timeInput.value = n.time || now();
  moodInput.value = n.mood || "";
  tagsInput.value = (n.tags || []).join(", ");
  contentInput.value = n.content || "";
  alarmCheck.checked = !!n.alarm;
  imageInput.value = "";
  contentInput.focus();
}

let viewMode = "list";
const setActive = (id) => {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
};
document.getElementById('listViewBtn').onclick = ()=>{ setActive('listViewBtn');  viewMode='list';  render(); };
document.getElementById('dayViewBtn').onclick  = ()=>{ setActive('dayViewBtn');   viewMode='day';   render(); };
document.getElementById('weekViewBtn').onclick = ()=>{ setActive('weekViewBtn');  viewMode='week';  render(); };
document.getElementById('alarmViewBtn').onclick= ()=>{ setActive('alarmViewBtn'); viewMode='alarm'; render(); };

function render(){
  if (!currentNotes.length){
    notesList.innerHTML = '<div class="empty">Inga anteckningar.</div>';
    return;
  }

  let list = [...currentNotes];
  if (viewMode === 'day'){
    const iso = today();
    list = list.filter(n => n.date === iso);
  } else if (viewMode === 'week'){
    const d = new Date();
    const day = (d.getDay() || 7);           // 1-7 (mån-sön)
    const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const a = mon.toISOString().slice(0,10), b = sun.toISOString().slice(0,10);
    list = list.filter(n => n.date >= a && n.date <= b);
  } else if (viewMode === 'alarm'){
    list = list.filter(n => n.alarm);
  }

  notesList.innerHTML = "";
  list.forEach(n=>{
    const div = document.createElement('div');
    div.className = 'entry';
    const title =
      (n.mood ? `<span class="emoji">${n.mood.split(' ')[0]}</span>` : '') +
      (n.content?.split('\n')[0]?.slice(0,40) || 'Anteckning');

    div.innerHTML = `
      <strong>${title}</strong><br>
      <span class="muted">${n.date} ${n.time || ''} ${n.alarm ? '⏰' : ''}</span>
      <p>${(n.content || '').replace(/\n/g,'<br>')}</p>
      ${(n.tags || []).map(t=>`<span class="badge">#${t}</span>`).join(' ')}
      ${n.image ? `<img class="thumb" src="${n.image}" alt="bild">` : ''}
      <div style="margin-top:.5rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="pill secondary editBtn">✏️ Redigera</button>
        <button class="pill secondary delBtn">🗑 Radera</button>
      </div>
    `;
    div.querySelector('.editBtn').onclick = ()=> enterEdit(n);
    div.querySelector('.delBtn').onclick = async ()=>{
      if (!confirm("Radera den här anteckningen?")) return;
      try{ await deleteDoc(doc(db,"notes", n.id)); }catch(e){ alert("Kunde inte radera: " + e.message); }
    };
    notesList.appendChild(div);
  });
}

// ------------ Alarms (client) ------------
function scheduleAlarm(note){
  if (!note.date || !note.time) return;
  const dt = new Date(note.date + 'T' + note.time);
  const diff = dt.getTime() - Date.now();
  if (diff <= 0) return;
  setTimeout(()=> triggerAlarm(note), diff);
}
function triggerAlarm(note){
  const audio = document.getElementById('alarmSound');
  audio?.play().catch(()=>{});
  const body = note.content || 'Dags att kolla din anteckning!';
  if ('Notification' in window && Notification.permission === 'granted'){
    new Notification('⏰ Alarm!', { body, icon:'./android-chrome-192x192.png' });
  } else {
    alert('⏰ ' + body);
  }
}
function rescheduleAll(){
  (currentNotes || []).filter(n => n.alarm).forEach(scheduleAlarm);
}

// ------------ Auth state ------------
onAuthStateChanged(auth, async (user)=>{
  if (user){
    authSection.style.display = 'none';
    noteSection.style.display = 'block';
    notesSection.style.display = 'block';

    // visa logga ut-knappar + chip
    logoutBtn.style.display = '';
    logoutTop.style.display = '';
    userChip.style.display = '';
    userName.textContent = user.displayName || user.email || 'Inloggad';
    userPhoto.src = user.photoURL || './android-chrome-192x192.png';

    await ensureUserDoc(user);
    startNotesListener(user.uid);
  } else {
    authSection.style.display = 'block';
    noteSection.style.display = 'none';
    notesSection.style.display = 'none';

    // dölj logga ut-knappar + chip
    logoutBtn.style.display = 'none';
    logoutTop.style.display = 'none';
    userChip.style.display = 'none';

    if (unsubscribe) { try{ unsubscribe(); }catch{} }
  }
});

// ------------ Tema-knapp ------------
document.getElementById('darkToggle')?.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
});

// ------------ Service Worker ------------
if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .catch(err => console.warn('SW fail:', err));
}
