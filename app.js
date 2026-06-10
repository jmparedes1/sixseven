import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseIsConfigured = Boolean(
  firebaseConfig?.apiKey &&
  !String(firebaseConfig.apiKey).startsWith("TU_") &&
  firebaseConfig?.databaseURL &&
  !String(firebaseConfig.databaseURL).includes("TU_PROYECTO")
);

let app = null;
let auth = null;
let db = null;

if (firebaseIsConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
}

let uid = null;
let currentEventCode = null;
let currentParticipantName = null;
let currentEvent = null;
let eventUnsubscribe = null;
let privateMatchUnsubscribe = null;

const $ = (id) => document.getElementById(id);
const views = ["home", "createView", "joinView", "eventView"];

const urlParams = new URLSearchParams(location.search);
const inviteCode = cleanCode(urlParams.get("code") || "");
if (inviteCode) {
  window.addEventListener("DOMContentLoaded", () => {
    $("joinCode").value = inviteCode;
    show("joinView");
  });
}

function show(viewId) {
  views.forEach(v => $(v).classList.toggle("active", v === viewId));
}

function cleanCode(value = "") {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function cleanName(value = "") {
  return value.trim().replace(/\s+/g, " ").slice(0, 40);
}

function normalizeName(value = "") {
  return cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function pairKey(a, b) {
  return [a, b].sort().join("_");
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function eventIsClosed(event) {
  return event?.status !== "open" || (event?.expiresAt && Date.now() > event.expiresAt);
}

function formatDate(timestamp) {
  if (!timestamp) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function toast(message) {
  const box = $("toast");
  if (!box) {
    console.warn(message);
    return;
  }
  box.textContent = message;
  box.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.add("hidden"), 3200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copiado al portapapeles.");
  } catch {
    toast("No se pudo copiar automáticamente. Selecciona y copia el texto manualmente.");
  }
}

async function ensureAuth() {
  if (!firebaseIsConfigured || !auth || !db) {
    toast("Configura Firebase en firebase-config.js antes de usar sixseven.");
    throw new Error("Firebase no está configurado");
  }
  if (auth.currentUser) return auth.currentUser.uid;
  await signInAnonymously(auth);
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        unsubscribe();
        uid = user.uid;
        resolve(user.uid);
      }
    });
  });
}

$("showCreate").addEventListener("click", () => show("createView"));
$("showJoin").addEventListener("click", () => show("joinView"));
document.querySelectorAll("[data-back]").forEach(btn => btn.addEventListener("click", () => {
  stopListeners();
  show("home");
}));

if (!firebaseIsConfigured) {
  window.addEventListener("DOMContentLoaded", () => {
    toast("Falta configurar Firebase. Edita firebase-config.js y publica de nuevo.");
    document.querySelectorAll("#createEvent, #joinEvent").forEach(button => {
      button.disabled = true;
      button.title = "Configura Firebase antes de publicar";
    });
  });
}

$("createEvent").addEventListener("click", async () => {
  const name = cleanName($("eventName").value);
  const reason = $("eventReason").value;
  const durationHours = Number($("eventDuration").value || 24);
  if (!name) return toast("Indica el nombre del evento.");

  await ensureAuth();
  let code = generateCode();
  let exists = await get(ref(db, `events/${code}`));
  while (exists.exists()) {
    code = generateCode();
    exists = await get(ref(db, `events/${code}`));
  }

  const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;
  await set(ref(db, `events/${code}`), {
    name,
    reason,
    creatorUid: uid,
    createdAt: serverTimestamp(),
    expiresAt,
    status: "open"
  });

  currentEventCode = code;
  currentParticipantName = "Creador";
  renderCreatedBox(code, name, reason, expiresAt);
  openEvent(code);
});

function renderCreatedBox(code, name, reason, expiresAt) {
  const inviteUrl = buildInviteUrl(code);
  $("createdBox").classList.remove("hidden");
  $("createdBox").innerHTML = `
    <strong>Evento creado.</strong><br>
    <span>Código de acceso:</span>
    <button class="btn secondary" id="copyBtn">${escapeHtml(code)}</button>
    <p class="muted">${escapeHtml(name)} · ${escapeHtml(reason)} · caduca el ${formatDate(expiresAt)}</p>
    <p class="muted">Enlace: ${escapeHtml(inviteUrl)}</p>
  `;
  $("copyBtn").addEventListener("click", () => copyText(code));
}

$("joinEvent").addEventListener("click", async () => {
  $("joinError").textContent = "";
  const code = cleanCode($("joinCode").value);
  const name = cleanName($("participantName").value);
  const normalizedName = normalizeName(name);

  if (!code || !name || normalizedName.length < 2) {
    $("joinError").textContent = "Introduce un código y un nombre válido.";
    return;
  }

  await ensureAuth();
  const eventSnap = await get(ref(db, `events/${code}`));
  if (!eventSnap.exists()) {
    $("joinError").textContent = "No existe ningún evento con ese código.";
    return;
  }

  const event = eventSnap.val();
  if (eventIsClosed(event)) {
    $("joinError").textContent = "Este evento está cerrado o ha caducado.";
    return;
  }

  const nameIndexRef = ref(db, `events/${code}/nameIndex/${normalizedName}`);
  const tx = await runTransaction(nameIndexRef, currentValue => {
    if (currentValue === null || currentValue === uid) return uid;
    return;
  });

  if (!tx.committed || tx.snapshot.val() !== uid) {
    $("joinError").textContent = "Ese nombre ya está siendo utilizado en este evento.";
    return;
  }

  currentEventCode = code;
  currentParticipantName = name;

  await update(ref(db, `events/${code}/participants/${uid}`), {
    name,
    normalizedName,
    joinedAt: serverTimestamp(),
    active: true
  });

  openEvent(code);
});

$("copyInvite").addEventListener("click", () => {
  if (!currentEventCode || !currentEvent) return;
  const text = `Te invito a participar en sixseven.\nEvento: ${currentEvent.name}\nMotivo: ${currentEvent.reason}\nCódigo: ${currentEventCode}\nEnlace: ${buildInviteUrl(currentEventCode)}`;
  copyText(text);
});

$("toggleEventStatus").addEventListener("click", async () => {
  if (!currentEventCode || !currentEvent || currentEvent.creatorUid !== uid) return;
  const nextStatus = currentEvent.status === "open" ? "closed" : "open";
  await update(ref(db, `events/${currentEventCode}`), { status: nextStatus });
  toast(nextStatus === "open" ? "Evento reabierto." : "Evento cerrado.");
});

$("resetVotes").addEventListener("click", async () => {
  if (!currentEventCode || !currentEvent || currentEvent.creatorUid !== uid) return;
  const ok = confirm("¿Seguro que quieres reiniciar todos los votos y avisos de match de este evento?");
  if (!ok) return;
  await remove(ref(db, `events/${currentEventCode}/votes`));
  await remove(ref(db, `events/${currentEventCode}/matchPairs`));
  await remove(ref(db, `privateMatches/${currentEventCode}`));
  toast("Votos y matches reiniciados.");
});

function stopListeners() {
  if (eventUnsubscribe) eventUnsubscribe();
  if (privateMatchUnsubscribe) privateMatchUnsubscribe();
  eventUnsubscribe = null;
  privateMatchUnsubscribe = null;
  currentEventCode = null;
  currentEvent = null;
}

function openEvent(code) {
  show("eventView");
  $("currentCode").textContent = code;

  eventUnsubscribe = onValue(ref(db, `events/${code}`), (snap) => {
    const event = snap.val();
    if (!event) {
      toast("El evento ya no existe.");
      show("home");
      return;
    }
    currentEvent = event;
    renderEvent(event);
  });

  privateMatchUnsubscribe = onValue(ref(db, `privateMatches/${code}/${uid}`), (snap) => {
    const notices = snap.val() || {};
    Object.values(notices).forEach(notice => showMatch(notice.withName));
  });
}

function renderEvent(event) {
  const closed = eventIsClosed(event);
  const isCreator = event.creatorUid === uid;
  const participants = event.participants || {};
  const votes = event.votes || {};
  const myVote = votes[uid]?.targetUid;
  const votedCount = Object.keys(votes).length;

  $("currentTitle").textContent = event.name || "Evento";
  $("currentReason").textContent = event.reason || "";
  $("votesCount").textContent = votedCount;
  $("participantCount").textContent = Object.keys(participants).length;
  $("eventStatus").textContent = closed
    ? `Cerrado o caducado · caducidad: ${formatDate(event.expiresAt)}`
    : `Abierto · caduca: ${formatDate(event.expiresAt)}`;
  $("voteHelp").textContent = closed
    ? "La votación está cerrada. Puedes ver el contador, pero no emitir nuevos votos."
    : myVote
      ? "Ya has votado. El voto es único y no se puede cambiar desde esta versión."
      : "Tu voto es secreto. Solo se publica el contador anónimo.";

  renderAdminPanel(isCreator, event);
  renderParticipants(participants, votes, closed);
  renderDistribution(participants, votes);
}

function renderAdminPanel(isCreator, event) {
  const panel = $("adminPanel");
  panel.classList.toggle("hidden", !isCreator);
  if (!isCreator || !currentEventCode) return;

  $("toggleEventStatus").textContent = event.status === "open" ? "Cerrar evento" : "Reabrir evento";
  const inviteUrl = buildInviteUrl(currentEventCode);
  $("qrImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(inviteUrl)}`;
}

function renderParticipants(participants, votes, closed) {
  const myVote = votes[uid]?.targetUid;
  const container = $("participants");
  container.innerHTML = "";

  Object.entries(participants)
    .sort(([, a], [, b]) => (a.name || "").localeCompare(b.name || ""))
    .forEach(([participantUid, participant]) => {
      if (participantUid === uid) return;
      const btn = document.createElement("button");
      btn.className = `btn person ${myVote === participantUid ? "selected" : ""}`;
      btn.textContent = participant.name || "Participante";
      btn.title = participant.name || "Participante";
      btn.disabled = Boolean(myVote) || closed;
      btn.addEventListener("click", () => vote(participantUid, participant.name || "Participante", participants));
      container.appendChild(btn);
    });

  if (!container.children.length) {
    container.innerHTML = `<p class="muted">Todavía no hay otras personas participantes.</p>`;
  }
}

async function vote(targetUid, targetName, participants) {
  if (!currentEventCode || !uid || !currentEvent) return;
  if (eventIsClosed(currentEvent)) return toast("El evento está cerrado o caducado.");

  const myVoteRef = ref(db, `events/${currentEventCode}/votes/${uid}`);
  const existing = await get(myVoteRef);
  if (existing.exists()) return toast("Ya has votado. Solo se permite un voto.");

  await set(myVoteRef, {
    targetUid,
    createdAt: serverTimestamp()
  });

  const reciprocal = await get(ref(db, `events/${currentEventCode}/votes/${targetUid}`));
  if (reciprocal.exists() && reciprocal.val().targetUid === uid) {
    await createPrivateMatchNotice(targetUid, targetName, participants);
  }
}

async function createPrivateMatchNotice(targetUid, targetName, participants) {
  const key = pairKey(uid, targetUid);
  const pairRef = ref(db, `events/${currentEventCode}/matchPairs/${key}`);
  const tx = await runTransaction(pairRef, currentValue => currentValue || true);
  if (!tx.committed) return;

  await update(ref(db), {
    [`privateMatches/${currentEventCode}/${uid}/${key}`]: {
      withUid: targetUid,
      withName: targetName,
      createdAt: serverTimestamp()
    },
    [`privateMatches/${currentEventCode}/${targetUid}/${key}`]: {
      withUid: uid,
      withName: currentParticipantName || participants?.[uid]?.name || "otra persona",
      createdAt: serverTimestamp()
    }
  });
}

function renderDistribution(participants, votes) {
  const countsByPerson = {};
  Object.keys(participants).forEach(id => countsByPerson[id] = 0);
  Object.values(votes).forEach(vote => {
    if (vote?.targetUid && countsByPerson[vote.targetUid] !== undefined) {
      countsByPerson[vote.targetUid] += 1;
    }
  });

  const distribution = {};
  Object.values(countsByPerson).forEach(count => {
    distribution[count] = (distribution[count] || 0) + 1;
  });

  const box = $("distribution");
  box.innerHTML = "";
  const keys = Object.keys(distribution).sort((a, b) => Number(a) - Number(b));
  if (!keys.length) {
    box.innerHTML = `<p class="muted">Aún no hay datos suficientes.</p>`;
    return;
  }
  keys.forEach(votesNumber => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>Personas con ${votesNumber} voto(s)</span><strong>${distribution[votesNumber]}</strong>`;
    box.appendChild(row);
  });
}

function showMatch(withName) {
  if (!withName) return;
  const box = $("matchAlert");
  box.classList.remove("hidden");
  box.innerHTML = `🔥 ¡Hay match! Tú y <strong>${escapeHtml(withName)}</strong> os habéis elegido mutuamente.`;
  const alarm = $("alarm");
  alarm.currentTime = 0;
  alarm.play().catch(() => {});
}

function buildInviteUrl(code) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}?code=${encodeURIComponent(code)}`;
}

onAuthStateChanged(auth, user => {
  if (user) uid = user.uid;
});
signInAnonymously(auth).catch(console.error);
