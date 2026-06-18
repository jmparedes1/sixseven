import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update, remove, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const ACCESS_HASH = "8e76c0308d7336c906bd5d6c460afca6e90e3e0cdbf7445c86e4c9054053456d";
const VALID_THEMES = ["dark", "passion", "white", "night", "gold"];
const ROUND_MS = 7 * 60 * 1000;
const TOTAL_ROUNDS = 6;

const firebaseConfig = window.SIXSEVEN_FIREBASE_CONFIG || {};
const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);

let app;
let auth;
let db;
let uid = null;
let currentCode = null;
let currentEvent = null;
let currentParticipantName = "";
let isAdmin = false;
let eventListener = null;
let chatListener = null;
let activeMatchKey = null;
let countdownTimer = null;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
}

const $ = id => document.getElementById(id);

function toast(message) {
  const t = $("toast");
  if (!t) return;
  t.textContent = message;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), 3200);
}

function show(viewId) {
  ["homeView", "createView", "joinView", "eventView"].forEach(id => {
    $(id)?.classList.toggle("active", id === viewId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bind(id, event, handler) {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
}

function cleanCode(value = "") {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

function cleanName(value = "") {
  return String(value).trim().replace(/\s+/g, " ").slice(0, 40);
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

function normalizeCreatorKey(value = "") {
  return String(value).trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

function validCreatorKey(value = "") {
  return /^[A-Z0-9-]{6,32}$/.test(normalizeCreatorKey(value));
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function applyTheme(theme = "dark") {
  const t = VALID_THEMES.includes(theme) ? theme : "dark";
  document.body.classList.remove(...VALID_THEMES.map(x => `theme-${x}`));
  document.body.classList.add(`theme-${t}`);
  document.documentElement.setAttribute("data-theme", t);
}

async function sha256Hex(value = "") {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkAccess(inputId, errorId) {
  const input = $(inputId);
  const error = $(errorId);
  if (error) error.textContent = "";
  if (!input?.value) {
    if (error) error.textContent = "Introduce el código de acceso general.";
    input?.focus();
    return false;
  }
  const hash = await sha256Hex(input.value.trim());
  if (hash !== ACCESS_HASH) {
    if (error) error.textContent = "Código de acceso incorrecto.";
    input.focus();
    input.select();
    return false;
  }
  return true;
}

async function ensureAuth() {
  if (!firebaseReady || !auth || !db) throw new Error("Firebase no está configurado.");
  if (auth.currentUser) {
    uid = auth.currentUser.uid;
    return uid;
  }
  await signInAnonymously(auth);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("No se pudo iniciar sesión anónima.")), 8000);
    const unsub = onAuthStateChanged(auth, user => {
      if (user) {
        clearTimeout(timer);
        unsub();
        uid = user.uid;
        resolve(uid);
      }
    }, reject);
  });
}

function roundInfo(event) {
  const started = Number(event?.roundStartedAt || event?.createdAt || Date.now());
  const elapsed = Math.max(0, Date.now() - started);
  const currentRound = Math.min(TOTAL_ROUNDS, Math.floor(elapsed / ROUND_MS) + 1);
  const ended = elapsed >= ROUND_MS * TOTAL_ROUNDS || Date.now() > Number(event?.expiresAt || 0);
  return {
    currentRound,
    roundKey: String(currentRound),
    ended,
    msRemaining: ended ? 0 : Math.max(0, started + currentRound * ROUND_MS - Date.now())
  };
}

function formatCountdown(ms) {
  const safe = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderTurnCountdown() {
  const box = $("turnCountdownBox");
  if (!box || !currentEvent) return;

  const round = roundInfo(currentEvent);
  const roundDuration = Number(currentEvent.roundDurationMs || ROUND_MS);
  const elapsedInRound = round.ended ? roundDuration : Math.max(0, roundDuration - round.msRemaining);
  const percent = round.ended ? 100 : Math.min(100, Math.max(0, (elapsedInRound / roundDuration) * 100));

  const label = $("turnLabel");
  const countdown = $("turnCountdown");
  const bar = $("turnProgressBar");
  const hint = $("turnHint");

  if (label) label.textContent = round.ended ? "Turnos finalizados" : `Turno ${round.currentRound} de ${TOTAL_ROUNDS}`;
  if (countdown) countdown.textContent = round.ended ? "00:00" : formatCountdown(round.msRemaining);
  if (bar) bar.style.width = `${percent}%`;

  if (hint) {
    if (round.ended) {
      hint.textContent = "Los 6 turnos han finalizado. Puedes revisar los matches y chats privados.";
    } else if (round.msRemaining <= 30000) {
      hint.textContent = "Quedan menos de 30 segundos para el siguiente turno.";
    } else {
      hint.textContent = "Cada turno dura 7 minutos. Al terminar, se abre automáticamente el siguiente.";
    }
  }

  box.classList.toggle("ended", round.ended);
  box.classList.toggle("urgent", !round.ended && round.msRemaining <= 30000);
}

function startCountdownTimer() {
  if (countdownTimer) clearInterval(countdownTimer);
  renderTurnCountdown();
  countdownTimer = setInterval(() => {
    renderTurnCountdown();
    if (currentEvent) {
      const round = roundInfo(currentEvent);
      $("roundPill").textContent = round.ended ? "Turnos finalizados" : `Turno ${round.currentRound}/${TOTAL_ROUNDS}`;
    }
  }, 1000);
}

function stopCountdownTimer() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}


function eventCanJoin(event) {
  return event && event.status !== "closed" && Date.now() < Number(event.expiresAt || 0);
}

function eventCanVote(event) {
  return event && event.status === "open" && !roundInfo(event).ended;
}

function pairKey(a, b) {
  return [a, b].sort().join("_");
}

function countAnonymousMatches(allVotes = {}) {
  const matches = new Set();
  Object.entries(allVotes || {}).forEach(([roundKey, votes]) => {
    Object.entries(votes || {}).forEach(([voterUid, vote]) => {
      const targetUid = vote?.targetUid;
      if (!targetUid) return;
      const reciprocal = votes?.[targetUid];
      if (reciprocal?.targetUid === voterUid) {
        matches.add(`${roundKey}_${pairKey(voterUid, targetUid)}`);
      }
    });
  });
  return matches.size;
}

function anonymousStats(event = {}, round = roundInfo(event)) {
  const allVotes = event.votesByRound || {};
  const currentRoundVotes = allVotes?.[round.roundKey] || {};
  const peopleWhoVoted = Object.keys(currentRoundVotes).length;
  const receivedVotes = Object.values(currentRoundVotes).filter(vote => vote?.targetUid).length;
  const matches = countAnonymousMatches(allVotes);

  return {
    peopleWhoVoted,
    receivedVotes,
    matches
  };
}

function renderAnonymousCounters(event = currentEvent) {
  if (!event) return;
  const stats = anonymousStats(event, roundInfo(event));

  if ($("anonymousVoters")) $("anonymousVoters").textContent = String(stats.peopleWhoVoted);
  if ($("anonymousReceivedVotes")) $("anonymousReceivedVotes").textContent = String(stats.receivedVotes);
  if ($("anonymousMatches")) $("anonymousMatches").textContent = String(stats.matches);
}


function inviteUrl(code) {
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  return `${base}?code=${encodeURIComponent(code)}`;
}

function qrUrl(code) {
  const url = inviteUrl(code);
  return `https://quickchart.io/qr?size=320&margin=2&text=${encodeURIComponent(url)}`;
}

function renderQr(code, showToast = false) {
  const box = $("qrBox");
  const img = $("qrImage");
  const link = $("qrLink");
  if (!box || !img || !link || !code) return;
  const qr = qrUrl(code);
  img.src = qr;
  link.href = qr;
  box.classList.remove("hidden");
  if (showToast) toast("Código QR generado.");
}

function stopListeners() {
  if (eventListener) eventListener();
  if (chatListener) chatListener();
  stopCountdownTimer();
  eventListener = null;
  chatListener = null;
  activeMatchKey = null;
}

async function createEvent() {
  const error = $("createError");
  if (error) error.textContent = "";
  if (!(await checkAccess("createAccessCode", "createError"))) return;

  const name = cleanName($("eventName").value);
  const reason = $("eventReason").value;
  const theme = $("eventTheme").value;
  const maxParticipants = Number($("maxParticipants").value || 67);
  const key = normalizeCreatorKey($("creatorKey").value);
  const key2 = normalizeCreatorKey($("creatorKeyRepeat").value);

  if (!name) return error.textContent = "Indica el nombre del evento.";
  if (!validCreatorKey(key)) return error.textContent = "La clave de creador debe tener entre 6 y 32 caracteres.";
  if (key !== key2) return error.textContent = "Las claves de creador no coinciden.";

  const btn = $("btnCreateEvent");
  try {
    btn.disabled = true;
    btn.textContent = "Creando...";
    await ensureAuth();

    let code = randomCode();
    for (let i = 0; i < 10; i++) {
      const snap = await get(ref(db, `events/${code}`));
      if (!snap.exists()) break;
      code = randomCode();
    }

    const now = Date.now();
    const event = {
      name,
      reason,
      theme,
      creatorUid: uid,
      status: "open",
      createdAt: now,
      roundStartedAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      maxParticipants,
      roundDurationMs: ROUND_MS,
      totalRounds: TOTAL_ROUNDS
    };

    await set(ref(db, `events/${code}`), event);
    await set(ref(db, `eventSecrets/${code}`), { creatorKey: key, createdBy: uid, createdAt: now });
    await set(ref(db, `adminSessions/${code}/${uid}`), { active: true, key, claimedAt: now });

    localStorage.setItem(`sixseven_admin_${code}`, key);
    isAdmin = true;
    currentParticipantName = "Creador";
    currentCode = code;
    currentEvent = event;

    $("createdBox").classList.remove("hidden");
    $("createdBox").innerHTML = `
      <h3><img class="smallIcon" src="./assets/icon-qr.svg" alt="" />Evento creado</h3>
      <p>Código: <strong>${code}</strong></p>
      <p>Guarda tu clave de creador.</p>
      <div class="qrCreateWrap">
        <img class="qrImage" src="${qrUrl(code)}" alt="Código QR del evento" />
        <p class="muted">Escanea el QR para abrir directamente la pantalla de entrada con el código cargado.</p>
      </div>
      <button class="btn secondary full" id="copyNewInvite" type="button"><img class="btnIcon" src="./assets/icon-qr.svg" alt="" />Copiar invitación</button>
      <a class="btn secondary full" id="openNewQr" href="${qrUrl(code)}" target="_blank" rel="noopener"><img class="btnIcon" src="./assets/icon-qr.svg" alt="" />Abrir código QR</a>
    `;
    $("copyNewInvite")?.addEventListener("click", async () => {{
      await navigator.clipboard.writeText(inviteUrl(code));
      toast("Invitación copiada.");
    }});
    toast("Evento creado correctamente.");
    openEvent(code);
  } catch (err) {
    console.error(err);
    error.textContent = err?.code === "PERMISSION_DENIED"
      ? "Firebase bloqueó la creación. Actualiza las reglas de Realtime Database."
      : "No se pudo crear el evento. Revisa Firebase y las reglas.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Crear evento y generar código";
  }
}

async function joinEvent() {
  const error = $("joinError");
  if (error) error.textContent = "";

  const code = cleanCode($("joinCode").value);
  const name = cleanName($("participantName").value);
  const norm = normalizeName(name);
  if (!code || !name || norm.length < 2) return error.textContent = "Introduce código y alias válido.";
  if (!$("consentCheck").checked) return error.textContent = "Debes aceptar la participación voluntaria.";

  const btn = $("btnJoinEvent");
  try {
    btn.disabled = true;
    btn.textContent = "Entrando...";
    await ensureAuth();

    const snap = await get(ref(db, `events/${code}`));
    if (!snap.exists()) return error.textContent = "No existe ningún evento con ese código.";
    const event = snap.val();
    if (!eventCanJoin(event)) return error.textContent = "El evento está cerrado o caducado.";

    const participants = event.participants || {};
    const max = Number(event.maxParticipants || 0);
    if (!participants[uid] && max > 0 && Object.keys(participants).length >= max) {
      return error.textContent = "El evento está completo.";
    }

    const nameRef = ref(db, `events/${code}/nameIndex/${norm}`);
    const tx = await runTransaction(nameRef, current => {
      if (current === null || current === uid) return uid;
      return;
    });

    if (!tx.committed || tx.snapshot.val() !== uid) {
      return error.textContent = "Ese alias ya está en uso.";
    }

    await set(ref(db, `events/${code}/participants/${uid}`), {
      name,
      normalizedName: norm,
      joinedAt: Date.now(),
      consentAcceptedAt: Date.now(),
      active: true
    });

    isAdmin = false;
    currentParticipantName = name;
    openEvent(code);
  } catch (err) {
    console.error(err);
    error.textContent = err?.code === "PERMISSION_DENIED"
      ? "Firebase bloqueó la entrada. Actualiza las reglas."
      : "No se pudo entrar al evento.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar al evento";
  }
}

async function adminAccess() {
  const error = $("adminAccessError");
  if (error) error.textContent = "";
  if (!(await checkAccess("adminAccessCode", "adminAccessError"))) return;

  const code = cleanCode($("adminEventCode").value);
  const key = normalizeCreatorKey($("adminCreatorKey").value);
  if (!code || !key) return error.textContent = "Introduce código de evento y clave de creador.";

  const btn = $("btnAdminAccess");
  try {
    btn.disabled = true;
    btn.textContent = "Comprobando...";
    await ensureAuth();
    await set(ref(db, `adminSessions/${code}/${uid}`), { active: true, key, claimedAt: Date.now() });
    localStorage.setItem(`sixseven_admin_${code}`, key);
    isAdmin = true;
    currentParticipantName = "Creador";
    openEvent(code);
  } catch (err) {
    console.error(err);
    error.textContent = "No se pudo acceder como administrador. Revisa clave y reglas.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar como administrador";
  }
}

function openEvent(code) {
  stopListeners();
  currentCode = cleanCode(code);
  show("eventView");
  startCountdownTimer();

  eventListener = onValue(ref(db, `events/${currentCode}`), snap => {
    if (!snap.exists()) {
      toast("El evento ya no existe.");
      show("homeView");
      return;
    }
    currentEvent = snap.val();
    applyTheme(currentEvent.theme || "dark");
    renderEvent();
  }, err => {
    console.error(err);
    toast("No se pudo leer el evento.");
  });
}

function renderEvent() {
  const event = currentEvent || {};
  const participants = event.participants || {};
  const round = roundInfo(event);
  const votes = event.votesByRound?.[round.roundKey] || {};

  $("currentCode").textContent = currentCode || "";
  $("currentTitle").textContent = event.name || "Evento";
  $("currentReason").textContent = event.reason || "";
  $("roundPill").textContent = round.ended ? "Turnos finalizados" : `Turno ${round.currentRound}/${TOTAL_ROUNDS}`;
  $("statusPill").textContent = event.status === "closed" ? "Cerrado" : "Abierto";
  $("participantsPill").textContent = `${Object.keys(participants).length} participantes`;
  renderTurnCountdown();
  renderAnonymousCounters(event);

  renderParticipants(participants, votes, round);
  renderAdmin();
  detectMatches(participants, event.votesByRound || {});
}

function renderParticipants(participants, votes, round) {
  const list = $("participantsList");
  list.innerHTML = "";
  const canVote = eventCanVote(currentEvent);
  const myVote = votes[uid];

  if (!Object.keys(participants).length) {
    list.innerHTML = `<p class="muted">Aún no hay participantes.</p>`;
    return;
  }

  $("voteHelp").textContent = !canVote
    ? "La votación no está disponible."
    : myVote
      ? "Tu voto está registrado en esta ronda."
      : "Elige una persona. Tu voto será secreto.";

  Object.entries(participants).sort((a,b) => (a[1].name || "").localeCompare(b[1].name || "")).forEach(([pid, p]) => {
    const card = document.createElement("div");
    card.className = "person" + (pid === uid ? " me" : "");
    card.innerHTML = `
      <strong><img class="personIcon" src="./assets/icon-user.svg" alt="" />${escapeHtml(p.name || "Participante")}</strong>
      <button class="btn small" type="button" ${pid === uid || !canVote || myVote ? "disabled" : ""}><img class="btnIcon" src="./assets/icon-vote.svg" alt="" />Votar</button>
    `;
    card.querySelector("button")?.addEventListener("click", () => castVote(pid, p.name || "Participante"));
    list.appendChild(card);
  });
}

async function castVote(targetUid, targetName) {
  if (!currentCode || !eventCanVote(currentEvent)) return;
  if (targetUid === uid) return;
  const round = roundInfo(currentEvent);
  try {
    await set(ref(db, `events/${currentCode}/votesByRound/${round.roundKey}/${uid}`), {
      targetUid,
      targetName,
      voterName: currentParticipantName || currentEvent?.participants?.[uid]?.name || "Participante",
      createdAt: Date.now()
    });
    toast("Voto registrado.");
  } catch (err) {
    console.error(err);
    toast("No se pudo votar. Revisa las reglas.");
  }
}

async function detectMatches(participants, allVotes) {
  if (!uid || !currentCode) return;
  for (const [roundKey, votes] of Object.entries(allVotes || {})) {
    const myVote = votes?.[uid];
    if (!myVote?.targetUid) continue;
    const otherVote = votes?.[myVote.targetUid];
    if (otherVote?.targetUid === uid) {
      const key = `${roundKey}_${pairKey(uid, myVote.targetUid)}`;
      activeMatchKey = key;
      $("matchBox").classList.remove("hidden");
      $("matchText").textContent = `Match con ${participants[myVote.targetUid]?.name || myVote.targetName || "otra persona"} en la ronda ${roundKey}.`;
      subscribeChat(key);
      return;
    }
  }
}

function subscribeChat(matchKey) {
  if (chatListener) chatListener();
  chatListener = onValue(ref(db, `chats/${currentCode}/${matchKey}/messages`), snap => {
    const data = snap.val() || {};
    const box = $("chatMessages");
    box.innerHTML = "";
    Object.values(data).sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach(msg => {
      const div = document.createElement("div");
      div.className = "msg" + (msg.uid === uid ? " mine" : "");
      div.innerHTML = `<small>${escapeHtml(msg.name || "")}</small>${escapeHtml(msg.text || "")}`;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  });
}

async function sendChat() {
  const text = cleanName($("chatInput").value).slice(0, 240);
  if (!text || !activeMatchKey) return;
  $("chatInput").value = "";
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await set(ref(db, `chats/${currentCode}/${activeMatchKey}/messages/${id}`), {
    uid,
    name: currentParticipantName || currentEvent?.participants?.[uid]?.name || "Participante",
    text,
    createdAt: Date.now()
  });
}

function renderAdmin() {
  const panel = $("adminPanel");
  const qrBox = $("qrBox");
  panel.classList.toggle("hidden", !isAdmin);
  if (!isAdmin) {
    qrBox?.classList.add("hidden");
    return;
  }

  if (document.activeElement !== $("adminName")) $("adminName").value = currentEvent.name || "";
  $("adminTheme").value = currentEvent.theme || "dark";
  $("adminMax").value = String(Number(currentEvent.maxParticipants ?? 67));
  $("btnToggleStatus").textContent = currentEvent.status === "closed" ? "Reabrir evento" : "Cerrar evento";
  renderQr(currentCode);
}

async function saveAdmin() {
  if (!isAdmin || !currentCode) return;
  const updates = {
    name: cleanName($("adminName").value) || currentEvent.name,
    theme: $("adminTheme").value,
    maxParticipants: Number($("adminMax").value || 67)
  };
  try {
    await update(ref(db, `events/${currentCode}`), updates);
    applyTheme(updates.theme);
    $("adminMsg").textContent = "Cambios guardados.";
  } catch (err) {
    console.error(err);
    $("adminMsg").textContent = "No se pudieron guardar los cambios.";
  }
}

async function toggleStatus() {
  if (!isAdmin) return;
  const next = currentEvent.status === "closed" ? "open" : "closed";
  await update(ref(db, `events/${currentCode}`), { status: next });
}

async function resetVotes() {
  if (!isAdmin) return;
  if (!confirm("¿Reiniciar votos y chats del evento?")) return;
  await update(ref(db), {
    [`events/${currentCode}/votesByRound`]: null,
    [`chats/${currentCode}`]: null
  });
}

async function deleteEvent() {
  if (!isAdmin) return;
  if (!confirm("¿Eliminar definitivamente el evento?")) return;
  await update(ref(db), {
    [`events/${currentCode}`]: null,
    [`eventSecrets/${currentCode}`]: null,
    [`adminSessions/${currentCode}`]: null,
    [`chats/${currentCode}`]: null
  });
  toast("Evento eliminado.");
  show("homeView");
}

function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}

function init() {
  bind("btnGoCreate", "click", () => show("createView"));
  bind("btnGoJoin", "click", () => show("joinView"));
  document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => {
    stopListeners();
    show(btn.dataset.go);
  }));

  bind("btnCreateEvent", "click", createEvent);
  bind("btnJoinEvent", "click", joinEvent);
  bind("btnAdminAccess", "click", adminAccess);
  bind("btnSendChat", "click", sendChat);
  $("chatInput")?.addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });

  bind("btnSaveAdmin", "click", saveAdmin);
  bind("btnToggleStatus", "click", toggleStatus);
  bind("btnCopyInvite", "click", async () => {
    if (currentCode) await navigator.clipboard.writeText(inviteUrl(currentCode));
    toast("Invitación copiada.");
  });
  bind("btnShowQr", "click", () => renderQr(currentCode, true));
  bind("btnResetVotes", "click", resetVotes);
  bind("btnDeleteEvent", "click", deleteEvent);

  bind("eventTheme", "change", () => applyTheme($("eventTheme").value));
  bind("adminTheme", "change", () => applyTheme($("adminTheme").value));

  const params = new URLSearchParams(location.search);
  const code = cleanCode(params.get("code") || "");
  if (code) {
    $("joinCode").value = code;
    show("joinView");
  }
}

window.addEventListener("DOMContentLoaded", init);
