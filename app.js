// app.js (ES Module)

// ---------- Firebase imports ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc,
  query, where, serverTimestamp, onSnapshot,
  doc, getDoc, setDoc, enableIndexedDbPersistence, increment,
  getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ---------- Firebase config ----------
const firebaseConfig = {
  apiKey: "AIzaSyB2le8k0FJkvVypBQw8Ty9vFVKYQPjUMFc",
  authDomain: "queerjournal-1cc9d.firebaseapp.com",
  projectId: "queerjournal-1cc9d",
  storageBucket: "queerjournal-1cc9d.firebasestorage.app",
  messagingSenderId: "53325952423",
  appId: "1:53325952423:web:24837ecc436332e436b282",
  measurementId: "G-0T6JCFJCFZ"
};

// ---------- Init ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
enableIndexedDbPersistence(db).catch(()=>{});

// ---------- Helpers ----------
const today = () => new Date().toISOString().slice(0,10);
const now   = () => new Date().toTimeString().slice(0,5);

const byNewest = (a,b) => {
  const ca = a.createdAt?.seconds ?? 0;
  const cb = b.createdAt?.seconds ?? 0;
  if (cb !== ca) return cb - ca;
  const sa = (a.date||"") + (a.time||"");
  const sb = (b.date||"") + (b.time||"");
  return sb.localeCompare(sa);
};

// ---------- UI refs ----------
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
const publicCheck  = document.getElementById('publicCheck');

const saveBtn  = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

const userChip  = document.getElementById('userChip');
const userName  = document.getElementById('userName');
const userPhoto = document.getElementById('userPhoto');

// Footer tabs
const listViewBtn   = document.getElementById('listViewBtn');
const dayViewBtn    = document.getElementById('dayViewBtn');
const weekViewBtn   = document.getElementById('weekViewBtn');
const alarmViewBtn  = document.getElementById('alarmViewBtn');
const communityBtn  = document.getElementById('communityViewBtn');

// Community
const communitySection = document.getElementById('communitySection');
const communityList    = document.getElementById('communityList');

// Profil (frivilliga – koden garderas om de saknas)
const editProfileBtn      = document.getElementById('editProfileBtn');
const profileEditSection  = document.getElementById('profileEditSection');
const profDisplayName     = document.getElementById('profDisplayName');
const profPronouns        = document.getElementById('profPronouns');
const profBio             = document.getElementById('profBio');
const profTags            = document.getElementById('profTags');
const saveProfileBtn      = document.getElementById('saveProfileBtn');
const cancelProfileBtn    = document.getElementById('cancelProfileBtn');

const profileViewSection  = document.getElementById('profileViewSection');
const profileViewHeader   = document.getElementById('profileViewHeader');
const profileViewMeta     = document.getElementById('profileViewMeta');
const profileViewPosts    = document.getElementById('profileViewPosts');
const closeProfileViewBtn = document.getElementById('closeProfileViewBtn');

// Defaults och notiser
if (dateInput) dateInput.value = today();
if (timeInput) timeInput.value = now();
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission().catch(()=>{});
}

// ---------- Auth handlers ----------
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

// ---------- User doc ----------
async function ensureUserDoc(user){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'Användare');

  if (!snap.exists()){
    const newDoc = {
      uid: user.uid,
      email: user.email || null,
      displayName: fallbackName,
      photoURL: user.photoURL || null,
      pronouns: '',
      bio: '',
      tags: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tokens: []
    };
    await setDoc(ref, newDoc);
    return newDoc;
  } else {
    const updates = { updatedAt: serverTimestamp() };
    const data = snap.data() || {};
    if (!data.displayName && fallbackName) updates.displayName = fallbackName;
    if (!data.photoURL && user.photoURL)   updates.photoURL   = user.photoURL;
    if (Object.keys(updates).length > 1) {
      await setDoc(ref, updates, { merge: true });
    }
    return { ...data, ...updates };
  }
}

// ---------- Anteckningar: skapa / redigera / radera ----------
let editId = null;
let editOriginalImage = null;

function clearForm(){
  editId = null;
  editOriginalImage = null;
  if (moodInput)   moodInput.value = "";
  if (tagsInput)   tagsInput.value = "";
  if (contentInput)contentInput.value = "";
  if (alarmCheck)  alarmCheck.checked = false;
  if (publicCheck) publicCheck.checked = false;
  if (imageInput)  imageInput.value = "";
  if (dateInput)   dateInput.value = today();
  if (timeInput)   timeInput.value = now();
}
clearBtn.onclick = (e) => { e.preventDefault(); clearForm(); contentInput?.focus(); };

saveBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) { alert("Logga in först."); return; }

  try {
    // ev. bild -> dataURL
    const file = imageInput?.files?.[0];
    const imgData = file ? await new Promise(res=>{
      const r = new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file);
    }) : null;

    const tags = (tagsInput?.value||"").split(',').map(s=>s.trim()).filter(Boolean);
    const profile = await ensureUserDoc(user);

    const payload = {
      uid: user.uid,
      date: dateInput?.value || today(),
      time: timeInput?.value || now(),
      mood: moodInput?.value || "",
      tags,
      content: (contentInput?.value||"").trim(),
      image: imgData !== null ? imgData : editOriginalImage,
      alarm: !!(alarmCheck && alarmCheck.checked),
      public: !!(publicCheck && publicCheck.checked),
      reactions: { heart: 0, rainbow: 0, sparkles: 0 },
      flagCount: 0,
      author: {
        uid: user.uid,
        name: profile?.displayName || user.displayName || user.email || "Anonym",
        photo: profile?.photoURL || user.photoURL || null
      },
      updatedAt: serverTimestamp(),
    };

    if (editId) {
      await updateDoc(doc(db, "notes", editId), payload);
    } else {
      await addDoc(collection(db, "notes"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    clearForm();
  } catch(e) {
    console.error("Save failed:", e);
    alert("Kunde inte spara: " + (e.message || e.code));
  }
};

// ---------- Privat lista: live lyssning & render ----------
let unsubscribe = null;
let currentNotes = [];

function startNotesListener(uid){
  if (unsubscribe) { try{ unsubscribe(); }catch{} }
  const qy = query(collection(db,"notes"), where("uid","==",uid));
  unsubscribe = onSnapshot(qy, (snap)=>{
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    arr.sort(byNewest);
    currentNotes = arr;
    render();
    rescheduleAll();
  }, (err)=> console.warn("Snapshot error:", err));
}

function enterEdit(n){
  editId = n.id;
  editOriginalImage = n.image ?? null;
  if (dateInput)    dateInput.value = n.date || today();
  if (timeInput)    timeInput.value = n.time || now();
  if (moodInput)    moodInput.value = n.mood || "";
  if (tagsInput)    tagsInput.value = (n.tags || []).join(", ");
  if (contentInput) contentInput.value = n.content || "";
  if (alarmCheck)   alarmCheck.checked = !!n.alarm;
  if (publicCheck)  publicCheck.checked = !!n.public;
  if (imageInput)   imageInput.value = "";
  contentInput?.focus();
}

let viewMode = "list";
const setActive = (id) => {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
};

listViewBtn.onclick  = ()=>{ setActive('listViewBtn');  viewMode='list';  notesSection.style.display='block'; communitySection?.style && (communitySection.style.display='none'); render(); };
dayViewBtn.onclick   = ()=>{ setActive('dayViewBtn');   viewMode='day';   notesSection.style.display='block'; communitySection?.style && (communitySection.style.display='none'); render(); };
weekViewBtn.onclick  = ()=>{ setActive('weekViewBtn');  viewMode='week';  notesSection.style.display='block'; communitySection?.style && (communitySection.style.display='none'); render(); };
alarmViewBtn.onclick = ()=>{ setActive('alarmViewBtn'); viewMode='alarm'; notesSection.style.display='block'; communitySection?.style && (communitySection.style.display='none'); render(); };

// Community-tab
communityBtn.onclick = ()=>{
  setActive('communityViewBtn');
  notesSection.style.display = 'none';
  communitySection && (communitySection.style.display = 'block');
  renderCommunity();
};

function render(){
  if (!notesList) return;
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
      <span class="muted">${n.date} ${n.time || ''} ${n.alarm ? '⏰' : ''} ${n.public ? '· 🌍 Publik' : ''}</span>
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

// ---------- Alarm (klientside) ----------
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

// ---------- COMMUNITY: live feed, filter, reactions, flag ----------
let unsubscribeCommunity = null;
let communityNotes = [];
let communityFilterTag = null;
let communityFilterAuthor = null;
const locallyHidden = new Set();

function startCommunityListener(){
  if (!communitySection) return; // inget community i HTML
  if (unsubscribeCommunity) { try{ unsubscribeCommunity(); }catch{} }
  const qy = query(collection(db, "notes"), where("public", "==", true));
  unsubscribeCommunity = onSnapshot(qy, (snap)=>{
    const arr=[]; snap.forEach(d=> arr.push({ id:d.id, ...d.data() }));
    arr.sort(byNewest);
    communityNotes = arr;
    renderCommunity();
  }, (err)=> console.warn("Community snapshot error:", err));
}

function chipHTML(author){
  const name = author?.name || "Anonym";
  const photo = author?.photo || "";
  const initials = (name?.[0]||"A").toUpperCase();
  return `
    <span class="user-chip" style="cursor:pointer;display:inline-flex;align-items:center;gap:.45rem">
      ${photo ? `<img src="${photo}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`
              : `<span style="width:28px;height:28px;border-radius:50%;display:inline-grid;place-items:center;background:#555;color:#fff;font-size:.85rem">${initials}</span>`}
      <small>${name}</small>
    </span>
  `;
}

function renderCommunity(){
  if (!communitySection || !communityList) return;

  let list = communityNotes.filter(n => !locallyHidden.has(n.id));

  if (communityFilterTag){
    list = list.filter(n => (n.tags||[]).includes(communityFilterTag));
  }
  if (communityFilterAuthor){
    list = list.filter(n => n.author?.uid === communityFilterAuthor);
  }

  if (!list.length){
    communityList.innerHTML = '<div class="empty">Inga delade inlägg just nu.</div>';
    return;
  }

  const filtersActive = communityFilterTag || communityFilterAuthor;
  communityList.innerHTML = filtersActive
    ? `<div class="muted" style="margin-bottom:.5rem">
         Filter: ${communityFilterTag ? `#${communityFilterTag}` : ''} ${communityFilterAuthor ? '· användare' : ''} 
         <button class="pill secondary" id="clearCommunityFilter" style="margin-left:.5rem">Rensa filter</button>
       </div>`
    : '';

  list.forEach(n=>{
    const r = n.reactions || {};
    const heart   = r.heart   || 0;
    const rainbow = r.rainbow || 0;
    const spark   = r.sparkles|| 0;

    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem">
        <div class="author-chip">${chipHTML(n.author)}</div>
        <span class="muted">${n.date || ''} ${n.time || ''}</span>
      </div>

      <p style="margin:.5rem 0 0">${(n.content||'').replace(/\n/g,'<br>')}</p>
      ${(n.tags || []).map(t => `<span class="badge tagBtn" data-tag="${t}" style="cursor:pointer">#${t}</span>`).join(' ')}
      ${n.image ? `<img class="thumb" src="${n.image}" alt="bild">` : ''}

      <div style="margin-top:.6rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <button class="pill secondary react" data-emo="heart">❤️ ${heart}</button>
        <button class="pill secondary react" data-emo="rainbow">🌈 ${rainbow}</button>
        <button class="pill secondary react" data-emo="sparkles">✨ ${spark}</button>
        <button class="pill secondary flagBtn">⚑ Flagga</button>
      </div>
    `;

    // profilchip klick — öppna profilvy
    div.querySelector('.author-chip')?.addEventListener('click', ()=>{
      if (n.author?.uid){ openProfileView(n.author.uid); }
    });

    // taggfilter
    div.querySelectorAll('.tagBtn').forEach(el=>{
      el.onclick = ()=>{
        communityFilterTag = el.dataset.tag;
        communityFilterAuthor = null;
        setActive('communityViewBtn');
        notesSection.style.display='none'; communitySection.style.display='block';
        renderCommunity();
      };
    });

    // reaktioner
    div.querySelectorAll('.react').forEach(btn=>{
      btn.onclick = ()=> toggleReaction(n.id, btn.dataset.emo);
    });

    // flagga
    div.querySelector('.flagBtn').onclick = ()=> flagNote(n.id);

    communityList.appendChild(div);
  });

  const clear = document.getElementById('clearCommunityFilter');
  if (clear){
    clear.onclick = ()=>{
      communityFilterTag = null;
      communityFilterAuthor = null;
      renderCommunity();
    };
  }
}

// Reaction toggle (subdoc per user+emoji) + räknare i noten
async function toggleReaction(noteId, emoji){
  const user = auth.currentUser;
  if (!user) { alert("Logga in för att reagera."); return; }
  const keyMap = { heart:'heart', rainbow:'rainbow', sparkles:'sparkles' };
  const field = `reactions.${keyMap[emoji]}`;

  try{
    const ref = doc(db, `notes/${noteId}/reactions`, `${user.uid}_${emoji}`);
    const snap = await getDoc(ref);
    if (snap.exists()){
      await deleteDoc(ref);
      await updateDoc(doc(db,'notes',noteId), { [field]: increment(-1) });
    } else {
      await setDoc(ref, { by: user.uid, emoji, at: serverTimestamp() });
      await updateDoc(doc(db,'notes',noteId), { [field]: increment(1) });
    }
  }catch(e){
    console.warn("Reaction fail:", e);
  }
}

// Flagga: lokalt dölj + skriv flag subdoc + öka flagCount
async function flagNote(noteId){
  const user = auth.currentUser;
  if (!user) { alert("Logga in för att flagga."); return; }
  if (!confirm("Flagga inlägget som olämpligt?")) return;
  try{
    await setDoc(doc(db, `notes/${noteId}/flags`, user.uid), { by:user.uid, at: serverTimestamp() }, { merge:true });
    await updateDoc(doc(db,'notes',noteId), { flagCount: increment(1) });
    locallyHidden.add(noteId);
    renderCommunity();
    alert("Tack! Inlägget doldes för dig och flaggan skickades till admin.");
  }catch(e){
    console.warn("Flag fail:", e);
  }
}

// ---------- Profil: helpers (visning/dölj, egna/andras) ----------
function hideAllPanels(){
  // bas
  notesSection.style.display = 'none';
  communitySection && (communitySection.style.display = 'none');
  // profil
  profileEditSection && (profileEditSection.style.display = 'none');
  profileViewSection && (profileViewSection.style.display = 'none');
}

function openMyProfileEditor(userData){
  if (!profileEditSection) return;
  hideAllPanels();
  profileEditSection.style.display = 'block';
  if (profDisplayName) profDisplayName.value = userData.displayName || '';
  if (profPronouns)    profPronouns.value    = userData.pronouns || '';
  if (profBio)         profBio.value         = userData.bio || '';
  if (profTags)        profTags.value        = (userData.tags || []).join(', ');
}

async function openProfileView(uid){
  if (!profileViewSection) return;
  hideAllPanels();
  profileViewSection.style.display = 'block';

  // hämta profil
  const uSnap = await getDoc(doc(db,'users', uid));
  const u = uSnap.exists() ? uSnap.data() : { displayName:'Anonym', pronouns:'', bio:'', tags:[] };

  // header
  const initials = (u.displayName?.[0] || 'A').toUpperCase();
  const chip = u.photoURL
    ? `<img src="${u.photoURL}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover">`
    : `<span style="width:40px;height:40px;border-radius:50%;display:inline-grid;place-items:center;background:#555;color:#fff;font-weight:600">${initials}</span>`;

  if (profileViewHeader) {
    profileViewHeader.innerHTML = `
      ${chip}
      <div>
        <div style="font-weight:600">${u.displayName || 'Anonym'}</div>
        <div class="muted">${u.pronouns || ''}</div>
      </div>
    `;
  }
  if (profileViewMeta) {
    profileViewMeta.innerHTML = `
      ${u.bio ? `<div style="margin:.25rem 0">${u.bio}</div>` : ''}
      ${(u.tags||[]).map(t=>`<span class="badge">#${t}</span>`).join(' ')}
    `;
  }

  // hämta användarens publika inlägg
  const qy = query(
    collection(db,'notes'),
    where('public','==', true),
    where('uid','==', uid),
    orderBy('createdAt','desc')
  );
  const s = await getDocs(qy);

  if (profileViewPosts){
    if (s.empty){
      profileViewPosts.innerHTML = '<div class="empty">Inga publika inlägg ännu.</div>';
    } else {
      profileViewPosts.innerHTML = '';
      s.forEach(d=>{
        const n = d.data();
        const div = document.createElement('div');
        div.className = 'entry';
        div.innerHTML = `
          <span class="muted">${n.date || ''} ${n.time || ''}</span>
          <p>${(n.content||'').replace(/\n/g,'<br>')}</p>
          ${(n.tags||[]).map(t=>`<span class="badge">#${t}</span>`).join(' ')}
          ${n.image ? `<img class="thumb" src="${n.image}" alt="bild">` : ''}
        `;
        profileViewPosts.appendChild(div);
      });
    }
  }
}

// ---------- Profil: events ----------
if (editProfileBtn){
  editProfileBtn.onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db,'users',user.uid));
    openMyProfileEditor(snap.exists() ? snap.data() : {});
  };
}
if (userChip){ userChip.onclick = () => editProfileBtn?.onclick?.(); }

if (saveProfileBtn){
  saveProfileBtn.onclick = async () => {
    const user = auth.currentUser; if (!user) return;
    const payload = {
      displayName: (profDisplayName?.value || '').trim() || null,
      pronouns: (profPronouns?.value || '').trim(),
      bio: (profBio?.value || '').trim(),
      tags: (profTags?.value || '').split(',').map(s=>s.trim()).filter(Boolean),
      updatedAt: serverTimestamp(),
    };
    try{
      await setDoc(doc(db,'users',user.uid), payload, { merge:true });
      alert('Profil sparad!');
      hideAllPanels();
      const activeId = document.querySelector('.tab.active')?.id || 'listViewBtn';
      if (activeId === 'communityViewBtn'){ communitySection && (communitySection.style.display='block'); }
      else { notesSection.style.display='block'; }
    }catch(e){ alert('Kunde inte spara profil: ' + e.message); }
  };
}

if (cancelProfileBtn){
  cancelProfileBtn.onclick = () => {
    hideAllPanels();
    const activeId = document.querySelector('.tab.active')?.id || 'listViewBtn';
    if (activeId === 'communityViewBtn'){ communitySection && (communitySection.style.display='block'); }
    else { notesSection.style.display='block'; }
  };
}

if (closeProfileViewBtn){
  closeProfileViewBtn.onclick = () => {
    hideAllPanels();
    communitySection && (communitySection.style.display='block');
  };
}

// ---------- Auth state ----------
onAuthStateChanged(auth, async (user)=>{
  if (user){
    authSection.style.display = 'none';
    noteSection.style.display = 'block';

    const activeId = document.querySelector('.tab.active')?.id || 'listViewBtn';
    notesSection.style.display     = activeId === 'communityViewBtn' ? 'none'  : 'block';
    communitySection && (communitySection.style.display = activeId === 'communityViewBtn' ? 'block' : 'none');

    logoutBtn.style.display = '';
    logoutTop.style.display = '';
    userChip.style.display = '';
    userName.textContent = user.displayName || user.email || 'Inloggad';
    userPhoto.src = user.photoURL || './android-chrome-192x192.png';

    editProfileBtn && (editProfileBtn.style.display = '');

    await ensureUserDoc(user);
    startNotesListener(user.uid);
    startCommunityListener();
  } else {
    authSection.style.display = 'block';
    noteSection.style.display = 'none';
    notesSection.style.display = 'none';
    communitySection && (communitySection.style.display = 'none');

    logoutBtn.style.display = 'none';
    logoutTop.style.display = 'none';
    userChip.style.display = 'none';
    editProfileBtn && (editProfileBtn.style.display = 'none');

    if (unsubscribe) { try{ unsubscribe(); }catch{} }
    if (unsubscribeCommunity) { try{ unsubscribeCommunity(); }catch{} }
  }
});

// ---------- Tema-knapp ----------
document.getElementById('darkToggle')?.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
});

// ---------- Service Worker ----------
if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .catch(err => console.warn('SW fail:', err));
}
