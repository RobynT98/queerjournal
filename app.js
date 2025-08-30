// app.js (ES Module) — privat + community + reaktioner

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot,
  doc, getDoc, getDocs, setDoc, enableIndexedDbPersistence, limit, increment
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
// NY: valfritt toggle i HTML med id="publicCheck" (om den finns används den)
const publicCheck  = document.getElementById('publicCheck');

const saveBtn  = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

const userChip  = document.getElementById('userChip');
const userName  = document.getElementById('userName');
const userPhoto = document.getElementById('userPhoto');

// Community-vy (om du lägger till den i index.html)
const communitySection = document.getElementById('communitySection');
const communityList    = document.getElementById('communityList');
const communityBtn     = document.getElementById('communityViewBtn');

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
if (logoutBtn)  logoutBtn.onclick = doLogout;
if (logoutTop)  logoutTop.onclick = doLogout;

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
  if (publicCheck) publicCheck.checked = false;
  imageInput.value = "";
  dateInput.value = today();
  timeInput.value = now();
}
if (clearBtn) clearBtn.onclick = (e) => { e?.preventDefault?.(); clearForm(); contentInput?.focus?.(); };

saveBtn.onclick = async () => {
  const user = auth.currentUser;
  if(!user){ alert("Logga in först."); return; }

  try {
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
      public: !!(publicCheck && publicCheck.checked),               // NYTT
      reactions: editId ? undefined : { heart: 0, rainbow: 0, sparkles: 0 }, // init vid ny
      author: editId ? undefined : {                                  // spara lätt profil på noten
        uid: user.uid,
        name: user.displayName || user.email || "Anonym",
        photoURL: user.photoURL || null
      },
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

// ------------ Live listener & render (mina anteckningar) ------------
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
    renderMyNotes();
    rescheduleAll();
  }, (err)=> console.warn("Snapshot error:", err));
}

let viewMode = "list";
const setActive = (id) => {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
};
document.getElementById('listViewBtn')?.addEventListener('click', ()=>{ setActive('listViewBtn');  viewMode='list';  renderMyNotes(); });
document.getElementById('dayViewBtn')?.addEventListener('click',  ()=>{ setActive('dayViewBtn');   viewMode='day';   renderMyNotes(); });
document.getElementById('weekViewBtn')?.addEventListener('click', ()=>{ setActive('weekViewBtn');  viewMode='week';  renderMyNotes(); });
document.getElementById('alarmViewBtn')?.addEventListener('click',()=>{ setActive('alarmViewBtn'); viewMode='alarm'; renderMyNotes(); });
// Om du lägger till Community-fliken i index.html:
communityBtn?.addEventListener('click', ()=>{
  setActive('communityViewBtn');
  renderMyNotes(); // döljer egen lista
  communitySection?.scrollIntoView({ behavior:'smooth' });
});

function enterEdit(n){
  editId = n.id;
  editOriginalImage = n.image ?? null;
  dateInput.value = n.date || today();
  timeInput.value = n.time || now();
  moodInput.value = n.mood || "";
  tagsInput.value = (n.tags || []).join(", ");
  contentInput.value = n.content || "";
  alarmCheck.checked = !!n.alarm;
  if (publicCheck) publicCheck.checked = !!n.public;
  imageInput.value = "";
  contentInput.focus();
}

function renderMyNotes(){
  // toggla sektioner om community finns
  if (communitySection) {
    notesSection.style.display = (viewMode === 'community') ? 'none' : 'block';
    communitySection.style.display = (viewMode === 'community') ? 'block' : 'none';
  }

  if (!currentNotes.length){
    notesList.innerHTML = '<div class="empty">Inga anteckningar.</div>';
    return;
  }

  // filtrering per vy
  let list = [...currentNotes];
  if (viewMode === 'day'){
    const iso = today();
    list = list.filter(n => n.date === iso);
  } else if (viewMode === 'week'){
    const d = new Date();
    const day = (d.getDay() || 7);
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
      <span class="muted">${n.date} ${n.time || ''} ${n.alarm ? '⏰' : ''} ${n.public ? '· 🌍 delad' : ''}</span>
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

// ------------ Community (delade anteckningar) ------------
let unsubscribeCommunity = null;
function startCommunityListener(){
  if (!communityList) return; // rendera bara om HTML finns
  if (unsubscribeCommunity) { try{ unsubscribeCommunity(); }catch{} }
  const qy = query(
    collection(db,"notes"),
    where("public","==",true),
    orderBy("createdAt","desc"),
    limit(50)
  );
  unsubscribeCommunity = onSnapshot(qy, (snap)=>{
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    renderCommunity(arr);
  });
}

function react(noteId, kind){
  // bumpa en nyckel i reactions.* med increment
  const ref = doc(db, "notes", noteId);
  updateDoc(ref, { [`reactions.${kind}`]: increment(1) }).catch(e=>console.warn(e));
}

function renderCommunity(items){
  if (!communityList) return;
  if (!items.length){
    communityList.innerHTML = '<div class="empty">Inga delade inlägg ännu.</div>';
    return;
  }
  communityList.innerHTML = "";
  items.forEach(n=>{
    const div = document.createElement('div');
    div.className = 'entry';
    const authorName = n?.author?.name || "Anonym";
    const title =
      (n.mood ? `<span class="emoji">${n.mood.split(' ')[0]}</span>` : '') +
      (n.content?.split('\n')[0]?.slice(0,60) || 'Inlägg');
    const r = n.reactions || {};
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem">
        ${n?.author?.photoURL ? `<img src="${n.author.photoURL}" alt="" style="width:28px;height:28px;border-radius:50%">` : `<div class="badge">${authorName[0]||"?"}</div>`}
        <strong>${authorName}</strong>
        <span class="muted" style="margin-left:auto">${n.date || ''} ${n.time || ''}</span>
      </div>
      <strong>${title}</strong>
      <p>${(n.content || '').replace(/\n/g,'<br>')}</p>
      ${(n.tags || []).map(t=>`<span class="badge">#${t}</span>`).join(' ')}
      ${n.image ? `<img class="thumb" src="${n.image}" alt="bild">` : ''}
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem">
        <button class="pill secondary r-heart">❤️ ${r.heart||0}</button>
        <button class="pill secondary r-rainbow">🌈 ${r.rainbow||0}</button>
        <button class="pill secondary r-sparkles">✨ ${r.sparkles||0}</button>
      </div>
    `;
    div.querySelector('.r-heart').onclick    = ()=> react(n.id, 'heart');
    div.querySelector('.r-rainbow').onclick  = ()=> react(n.id, 'rainbow');
    div.querySelector('.r-sparkles').onclick = ()=> react(n.id, 'sparkles');
    communityList.appendChild(div);
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

    if (logoutBtn)  logoutBtn.style.display = '';
    if (logoutTop)  logoutTop.style.display = '';
    if (userChip)   userChip.style.display = '';
    if (userName)   userName.textContent = user.displayName || user.email || 'Inloggad';
    if (userPhoto)  userPhoto.src = user.photoURL || './android-chrome-192x192.png';

    await ensureUserDoc(user);
    startNotesListener(user.uid);
    startCommunityListener(); // starta community-feed om HTML finns
  } else {
    authSection.style.display = 'block';
    noteSection.style.display = 'none';
    notesSection.style.display = 'none';

    if (logoutBtn)  logoutBtn.style.display = 'none';
    if (logoutTop)  logoutTop.style.display = 'none';
    if (userChip)   userChip.style.display = 'none';

    if (unsubscribe) { try{ unsubscribe(); }catch{} }
    if (unsubscribeCommunity) { try{ unsubscribeCommunity(); }catch{} }
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
