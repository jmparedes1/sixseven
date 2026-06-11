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

const firebaseConfig = window.SIXSEVEN_FIREBASE_CONFIG || {};
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
const VALID_REASONS = ["7 minutos a solas", "Un café", "Una cena", "Una noche"];

function bind(id, event, handler) {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
}

function show(viewId) {
  views.forEach(v => $(v)?.classList.toggle("active", v === viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cleanCode(value = "") {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
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
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function randomAlias() {
  const adjectives = ["Luna", "Noche", "Bruma", "Seda", "Ámbar", "Violeta", "Dorado", "Secreto", "Velvet", "Aura"];
  const number = Math.floor(10 + Math.random() * 90);
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${number}`;
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

function eventIsExpired(event) {
  return Boolean(event?.expiresAt && Date.now() > event.expiresAt);
}

function eventCanJoin(event) {
  return ["waiting", "open"].includes(event?.status) && !eventIsExpired(event);
}

function eventCanVote(event) {
  return event?.status === "open" && !eventIsExpired(event);
}

function formatDate(timestamp) {
  if (!timestamp) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(timestamp));
}


function rateLimit(action, milliseconds) {
  const key = `sixseven_rate_${action}`;
  const now = Date.now();
  const last = Number(localStorage.getItem(key) || 0);
  if (now - last < milliseconds) {
    const seconds = Math.ceil((milliseconds - (now - last)) / 1000);
    toast(`Espera ${seconds} s antes de volver a intentarlo.`);
    return false;
  }
  localStorage.setItem(key, String(now));
  return true;
}

function clientCleanupExpiredEvent(eventCode, event) {
  if (!eventCode || !eventIsExpired(event)) return;
  // En GitHub Pages no hay un servidor permanente. Esta limpieza oportunista
  // ayuda al abrir una sala caducada; para producción real usa Cloud Functions.
  if (event?.creatorUid === uid) {
    remove(ref(db, `events/${eventCode}`)).catch(() => {});
    remove(ref(db, `privateMatches/${eventCode}`)).catch(() => {});
  }
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
  toast.timer = setTimeout(() => box.classList.add("hidden"), 3600);
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
  if (auth.currentUser) {
    uid = auth.currentUser.uid;
    return uid;
  }
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

function buildInviteUrl(code) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}?code=${encodeURIComponent(code)}`;
}

function inviteText(code, event = currentEvent) {
  return `Te invito a participar en sixseven.\nEvento: ${event?.name || "Evento privado"}\nTipo de conexión: ${event?.reason || "Privado"}\nCódigo: ${code}\nEnlace: ${buildInviteUrl(code)}`;
}

function stopListeners() {
  if (eventUnsubscribe) eventUnsubscribe();
  if (privateMatchUnsubscribe) privateMatchUnsubscribe();
  eventUnsubscribe = null;
  privateMatchUnsubscribe = null;
  currentEventCode = null;
  currentEvent = null;
}

function setupInviteFromUrl() {
  const urlParams = new URLSearchParams(location.search);
  const inviteCode = cleanCode(urlParams.get("code") || "");
  if (inviteCode) {
    $("joinCode").value = inviteCode;
    show("joinView");
  }
}

bind("showCreate", "click", () => show("createView"));
bind("showJoin", "click", () => show("joinView"));
bind("aliasBtn", "click", () => {
  $("participantName").value = randomAlias();
  $("participantName").focus();
});

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

bind("createEvent", "click", async () => {
  const button = $("createEvent");
  const name = cleanName($("eventName").value);
  const reason = $("eventReason").value;
  const durationHours = Number($("eventDuration").value || 24);
  const maxParticipants = Number($("maxParticipants")?.value || 0);
  const soundEnabled = Boolean($("soundEnabled")?.checked);

  if (!rateLimit("create", 10000)) return;
  if (!name) return toast("Indica el nombre del evento.");
  if (!VALID_REASONS.includes(reason)) return toast("Selecciona un tipo de conexión válido.");

  try {
    button.disabled = true;
    button.textContent = "Creando evento...";

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
      status: "waiting",
      maxParticipants,
      soundEnabled
    });

    currentEventCode = code;
    currentParticipantName = "Creador";
    renderCreatedBox(code, name, reason, expiresAt);
    openEvent(code);
  } catch (error) {
    console.error("Error creando evento:", error);
    toast("No se pudo crear el evento. Revisa Firebase, Anonymous y las reglas.");
  } finally {
    button.disabled = false;
    button.textContent = "Crear evento y generar código";
  }
});

function renderCreatedBox(code, name, reason, expiresAt) {
  const inviteUrl = buildInviteUrl(code);
  $("createdBox").classList.remove("hidden");
  $("createdBox").innerHTML = `
    <strong>Evento creado en modo espera.</strong><br>
    <p>Código de acceso:</p>
    <button class="btn secondary" id="copyBtn" type="button">${escapeHtml(code)}</button>
    <p class="muted">${escapeHtml(name)} · ${escapeHtml(reason)} · caduca el ${formatDate(expiresAt)}</p>
    <p class="muted">Enlace privado: ${escapeHtml(inviteUrl)}</p>
  `;
  $("copyBtn").addEventListener("click", () => copyText(code));
}

bind("joinEvent", "click", async () => {
  const button = $("joinEvent");
  $("joinError").textContent = "";
  const code = cleanCode($("joinCode").value);
  const name = cleanName($("participantName").value);
  const normalizedName = normalizeName(name);
  const consent = Boolean($("consentCheck")?.checked);

  if (!rateLimit("join", 3000)) return;

  if (!code || !name || normalizedName.length < 2) {
    $("joinError").textContent = "Introduce un código y un nombre válido.";
    return;
  }
  if (!consent) {
    $("joinError").textContent = "Debes aceptar las condiciones de participación privada y voluntaria.";
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Entrando...";

    await ensureAuth();
    const eventSnap = await get(ref(db, `events/${code}`));
    if (!eventSnap.exists()) {
      $("joinError").textContent = "No existe ningún evento con ese código.";
      return;
    }

    const event = eventSnap.val();
    if (!eventCanJoin(event)) {
      $("joinError").textContent = "Este evento está cerrado, caducado o no permite nuevas entradas.";
      return;
    }

    const participants = event.participants || {};
    const alreadyInside = Boolean(participants[uid]);
    const max = Number(event.maxParticipants || 0);
    if (!alreadyInside && max > 0 && Object.keys(participants).length >= max) {
      $("joinError").textContent = "El evento ha alcanzado el límite máximo de participantes.";
      return;
    }

    const nameIndexRef = ref(db, `events/${code}/nameIndex/${normalizedName}`);
    const tx = await runTransaction(nameIndexRef, currentValue => {
      if (currentValue === null || currentValue === uid) return uid;
      return;
    });

    if (!tx.committed || tx.snapshot.val() !== uid) {
      $("joinError").textContent = "Ese nombre o alias ya está siendo utilizado en este evento.";
      return;
    }

    currentEventCode = code;
    currentParticipantName = name;

    await update(ref(db, `events/${code}/participants/${uid}`), {
      name,
      normalizedName,
      joinedAt: serverTimestamp(),
      consentAcceptedAt: serverTimestamp(),
      active: true
    });

    openEvent(code);
  } catch (error) {
    console.error("Error entrando al evento:", error);
    $("joinError").textContent = "No se pudo entrar. Revisa código, Firebase, Anonymous y reglas.";
  } finally {
    button.disabled = false;
    button.textContent = "Entrar al evento";
  }
});

bind("copyInvite", "click", () => {
  if (!currentEventCode || !currentEvent) return;
  copyText(inviteText(currentEventCode, currentEvent));
});

bind("whatsappInvite", "click", () => {
  if (!currentEventCode || !currentEvent) return;
  const url = `https://wa.me/?text=${encodeURIComponent(inviteText(currentEventCode, currentEvent))}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

bind("startVoting", "click", async () => {
  if (!currentEventCode || !currentEvent || currentEvent.creatorUid !== uid) return;
  await update(ref(db, `events/${currentEventCode}`), { status: "open" });
  toast("Votación iniciada.");
});

bind("toggleEventStatus", "click", async () => {
  if (!currentEventCode || !currentEvent || currentEvent.creatorUid !== uid) return;
  const nextStatus = currentEvent.status === "closed" ? "waiting" : "closed";
  await update(ref(db, `events/${currentEventCode}`), { status: nextStatus });
  toast(nextStatus === "waiting" ? "Evento reabierto en modo espera." : "Evento cerrado.");
});

bind("resetVotes", "click", async () => {
  if (!currentEventCode || !currentEvent || currentEvent.creatorUid !== uid) return;
  const ok = confirm("¿Seguro que quieres reiniciar todos los votos y avisos de match de este evento?");
  if (!ok) return;
  await remove(ref(db, `events/${currentEventCode}/votes`));
  await remove(ref(db, `events/${currentEventCode}/matchPairs`));
  await remove(ref(db, `privateMatches/${currentEventCode}`));
  await update(ref(db, `events/${currentEventCode}`), { status: "waiting" });
  toast("Votos y matches reiniciados. El evento vuelve a modo espera.");
});

bind("deleteEvent", "click", async () => {
  if (!currentEventCode || !currentEvent || currentEvent.creatorUid !== uid) return;
  const ok = confirm("¿Eliminar definitivamente este evento y sus avisos privados?");
  if (!ok) return;
  const code = currentEventCode;
  await remove(ref(db, `events/${code}`));
  await remove(ref(db, `privateMatches/${code}`));
  toast("Evento eliminado.");
  stopListeners();
  show("home");
});

function openEvent(code) {
  show("eventView");
  $("currentCode").textContent = code;

  if (eventUnsubscribe) eventUnsubscribe();
  if (privateMatchUnsubscribe) privateMatchUnsubscribe();

  eventUnsubscribe = onValue(ref(db, `events/${code}`), (snap) => {
    const event = snap.val();
    if (!event) {
      toast("El evento ya no existe.");
      stopListeners();
      show("home");
      return;
    }
    currentEvent = event;
    clientCleanupExpiredEvent(code, event);
    renderEvent(event);
  });

  privateMatchUnsubscribe = onValue(ref(db, `privateMatches/${code}/${uid}`), (snap) => {
    const notices = snap.val() || {};
    Object.entries(notices).forEach(([key, notice]) => showMatch(notice.withName, key));
  });
}

function statusText(event) {
  if (eventIsExpired(event)) return `Caducado · caducidad: ${formatDate(event.expiresAt)}`;
  if (event.status === "waiting") return `En espera · caduca: ${formatDate(event.expiresAt)}`;
  if (event.status === "open") return `Votación abierta · caduca: ${formatDate(event.expiresAt)}`;
  return `Cerrado · caducidad: ${formatDate(event.expiresAt)}`;
}

function renderEvent(event) {
  const canVote = eventCanVote(event);
  const canJoin = eventCanJoin(event);
  const isCreator = event.creatorUid === uid;
  const participants = event.participants || {};
  const votes = event.votes || {};
  const myVote = votes[uid]?.targetUid;
  const votedCount = Object.keys(votes).length;
  const max = Number(event.maxParticipants || 0);

  $("currentTitle").textContent = event.name || "Evento";
  $("currentReason").textContent = event.reason || "";
  $("votesCount").textContent = votedCount;
  $("participantCount").textContent = max > 0 ? `${Object.keys(participants).length}/${max}` : Object.keys(participants).length;
  $("eventStatus").textContent = statusText(event);

  $("voteHelp").textContent = !canJoin
    ? "El evento está cerrado o caducado. Puedes ver el contador, pero no emitir nuevos votos."
    : event.status === "waiting"
      ? "La sala está en espera. El creador iniciará la votación cuando estén las personas dentro."
      : myVote
        ? "Voto registrado. Tu elección es privada y no puede cambiarse en esta ronda."
        : "Tu voto es secreto. Solo se notificará si hay una elección mutua.";

  renderAdminPanel(isCreator, event);
  renderParticipants(participants, votes, canVote);
  renderMyVotesReceived(participants, votes);
  renderDistribution(participants, votes);
}

function renderAdminPanel(isCreator, event) {
  const panel = $("adminPanel");
  panel.classList.toggle("hidden", !isCreator);
  if (!isCreator || !currentEventCode) return;

  const startBtn = $("startVoting");
  startBtn.disabled = event.status === "open" || event.status === "closed" || eventIsExpired(event);
  startBtn.textContent = event.status === "open" ? "Votación iniciada" : "Iniciar votación";

  $("toggleEventStatus").textContent = event.status === "closed" ? "Reabrir en espera" : "Cerrar evento";
  const inviteUrl = buildInviteUrl(currentEventCode);
  $("qrImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(inviteUrl)}`;
}

function renderParticipants(participants, votes, canVote) {
  const myVote = votes[uid]?.targetUid;
  const container = $("participants");
  container.innerHTML = "";

  Object.entries(participants)
    .sort(([, a], [, b]) => (a.name || "").localeCompare(b.name || ""))
    .forEach(([participantUid, participant]) => {
      if (participantUid === uid) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn person ${myVote === participantUid ? "selected" : ""}`;
      btn.textContent = participant.name || "Participante";
      btn.title = participant.name || "Participante";
      btn.disabled = Boolean(myVote) || !canVote;
      btn.addEventListener("click", () => vote(participantUid, participant.name || "Participante", participants));
      container.appendChild(btn);
    });

  if (!container.children.length) {
    container.innerHTML = `<p class="muted">Todavía no hay otras personas participantes.</p>`;
  }
}

async function vote(targetUid, targetName, participants) {
  if (!currentEventCode || !uid || !currentEvent) return;
  if (!rateLimit("vote", 5000)) return;
  if (!eventCanVote(currentEvent)) return toast("La votación no está abierta.");
  if (targetUid === uid) return toast("No puedes votarte a ti mismo.");

  const myVoteRef = ref(db, `events/${currentEventCode}/votes/${uid}`);
  const existing = await get(myVoteRef);
  if (existing.exists()) return toast("Ya has votado. Solo se permite un voto por ronda.");

  try {
    await set(myVoteRef, {
      targetUid,
      createdAt: serverTimestamp()
    });
    toast("Voto registrado. Te avisaremos si hay coincidencia mutua.");

    const reciprocal = await get(ref(db, `events/${currentEventCode}/votes/${targetUid}`));
    if (reciprocal.exists() && reciprocal.val().targetUid === uid) {
      await createPrivateMatchNotice(targetUid, targetName, participants);
    }
  } catch (error) {
    console.error("Error votando:", error);
    toast("No se pudo registrar el voto. Revisa las reglas de Firebase.");
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


function renderMyVotesReceived(participants, votes) {
  const box = $("myVotesReceivedBox");
  const number = $("myVotesReceived");
  const text = $("myVotesReceivedText");
  if (!box || !number || !text) return;

  const amParticipant = Boolean(participants?.[uid]);
  if (!amParticipant) {
    box.classList.add("hidden");
    return;
  }

  let received = 0;
  Object.values(votes || {}).forEach(vote => {
    if (vote?.targetUid === uid) received += 1;
  });

  box.classList.remove("hidden");
  number.textContent = String(received);
  text.textContent = received === 1
    ? "Has recibido 1 voto. Solo tú ves este contador personal en tu pantalla."
    : `Has recibido ${received} votos. Solo tú ves este contador personal en tu pantalla.`;
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
    const pluralVotes = Number(votesNumber) === 1 ? "voto" : "votos";
    const pluralPeople = distribution[votesNumber] === 1 ? "persona" : "personas";
    row.innerHTML = `<span>${pluralPeople} con ${votesNumber} ${pluralVotes}</span><strong>${distribution[votesNumber]}</strong>`;
    box.appendChild(row);
  });
}

function showMatch(withName, matchKey = "") {
  if (!withName) return;
  const box = $("matchAlert");
  box.classList.remove("hidden");
  box.innerHTML = `
    <h3>✨ Match privado</h3>
    <p>Tú y <strong>${escapeHtml(withName)}</strong> os habéis elegido mutuamente.</p>
    <p>Solo las dos personas implicadas reciben este aviso.</p>
    <div class="match-actions">
      <button id="closeMatch" class="btn secondary" type="button">Cerrar</button>
      ${matchKey ? `<button id="ackMatch" class="btn ghost" type="button">No volver a mostrar</button>` : ""}
    </div>
  `;
  $("closeMatch")?.addEventListener("click", () => box.classList.add("hidden"));
  $("ackMatch")?.addEventListener("click", async () => {
    if (currentEventCode && uid && matchKey) {
      await remove(ref(db, `privateMatches/${currentEventCode}/${uid}/${matchKey}`));
    }
    box.classList.add("hidden");
  });

  if (currentEvent?.soundEnabled) {
    const alarm = $("alarm");
    alarm.currentTime = 0;
    alarm.play().catch(() => {});
  }
}

window.addEventListener("DOMContentLoaded", setupInviteFromUrl);

if (firebaseIsConfigured && auth) {
  onAuthStateChanged(auth, user => {
    if (user) uid = user.uid;
  });
  signInAnonymously(auth).catch((error) => {
    console.error(error);
    toast("No se pudo iniciar sesión anónima. Revisa Authentication en Firebase.");
  });
}
