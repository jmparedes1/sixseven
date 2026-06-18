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

window.SIXSEVEN_APP_READY = true;
window.SIXSEVEN_LAST_ERROR = null;
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
let adminSessionUnsubscribe = null;
let hasAdminAccess = false;
let roundTimerInterval = null;
let activeChatUnsubscribe = null;
let knownPrivateMatches = {};
let adminSettingsDirty = false;
  pendingThemeOverride = null;
let pendingThemeOverride = null;
let pendingThemeSaveTimer = null;
const autoShownMatches = new Set();
let lastRenderedRoundSignature = null;
let roundNoticeTimer = null;

const $ = (id) => document.getElementById(id);
const views = ["home", "createView", "joinView", "eventView"];
const VALID_REASONS = [
  "Una conversación",
  "Un café",
  "Una copa",
  "Un baile",
  "Una cena",
  "Una cita",
  "7 minutos a solas",
  "Una noche"
];
const VALID_THEMES = ["dark", "passion", "white", "night", "gold"];
const THEME_LABELS = {
  dark: "Elegante oscuro · premium",
  passion: "Rojo pasión · intenso",
  white: "Minimal blanco · claro",
  night: "Fiesta nocturna · neón",
  gold: "Premium dorado · lujo"
};
const ROUND_DURATION_MS = 7 * 60 * 1000;
const TOTAL_ROUNDS = 6;
const TOTAL_EVENT_DURATION_MS = ROUND_DURATION_MS * TOTAL_ROUNDS;

// Código de acceso general para crear eventos y entrar como administrador.
// No se guarda la contraseña en el HTML: se compara con SHA-256.
const GLOBAL_ADMIN_ACCESS_HASH = "8e76c0308d7336c906bd5d6c460afca6e90e3e0cdbf7445c86e4c9054053456d";

async function sha256Hex(value = "") {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function showCreateError(message = "") {
  const error = $("createError");
  if (error) error.textContent = message;
  if (message) toast(message);
}

function showAppStatus(message = "") {
  const box = $("appStatusBox");
  if (!box) return;
  if (!message) {
    box.classList.add("hidden");
    box.textContent = "";
    return;
  }
  box.classList.remove("hidden");
  box.textContent = message;
}

async function validateGlobalAdminAccess(inputId, errorId) {
  const input = $(inputId);
  const error = $(errorId);
  const value = input?.value || "";
  const allowedHashes = [GLOBAL_ADMIN_ACCESS_HASH];

  if (error) error.textContent = "";
  if (!value) {
    if (error) error.textContent = "Introduce el código de acceso general.";
    input?.focus();
    return false;
  }

  try {
    if (!crypto?.subtle) {
      if (error) error.textContent = "Este navegador no permite comprobar el código. Usa HTTPS o GitHub Pages.";
      input?.focus();
      return false;
    }

    const hash = await sha256Hex(value.trim());
    if (!allowedHashes.includes(hash)) {
      if (error) error.textContent = "Código de acceso incorrecto.";
      input?.focus();
      input?.select?.();
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error comprobando código de acceso:", err);
    if (error) error.textContent = "No se pudo comprobar el código de acceso.";
    return false;
  }
}


function nowMs() { return Date.now(); }

function bind(id, event, handler) {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
}

function show(viewId) {
  views.forEach(v => $(v)?.classList.toggle("active", v === viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function normalizeTheme(value = "dark") {
  return VALID_THEMES.includes(value) ? value : "dark";
}

function applyTheme(theme = "dark") {
  const selected = normalizeTheme(theme);
  document.body.classList.remove(...VALID_THEMES.map(t => `theme-${t}`));
  document.body.classList.add(`theme-${selected}`);
  document.documentElement.setAttribute("data-theme", selected);
}

function goToInitialView(viewId) {
  if (viewId === "createView") {
    applyTheme($("eventTheme")?.value || "dark");
    show("createView");
    setTimeout(() => $("globalAdminCodeCreate")?.focus(), 80);
    return;
  }
  if (viewId === "joinView") {
    applyTheme(currentEvent?.theme || $("eventTheme")?.value || "dark");
    show("joinView");
    setTimeout(() => $("joinCode")?.focus(), 80);
    return;
  }
  show("home");
}

function bindInitialNavigation() {
  const createBtn = $("showCreate");
  const joinBtn = $("showJoin");
  if (createBtn && !createBtn.dataset.boundNavigation) {
    createBtn.dataset.boundNavigation = "1";
    createBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToInitialView("createView");
    });
  }
  if (joinBtn && !joinBtn.dataset.boundNavigation) {
    joinBtn.dataset.boundNavigation = "1";
    joinBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToInitialView("joinView");
    });
  }
  document.querySelectorAll("[data-target-view]").forEach(button => {
    if (button.dataset.boundGenericNavigation) return;
    button.dataset.boundGenericNavigation = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToInitialView(button.dataset.targetView);
    });
  });
}



function getThemeForRender(event = currentEvent) {
  if (pendingThemeOverride && isAdmin(event)) return normalizeTheme(pendingThemeOverride);
  return normalizeTheme(event?.theme || $("eventTheme")?.value || "dark");
}

function setPendingThemeOverride(theme) {
  pendingThemeOverride = normalizeTheme(theme);
  applyTheme(pendingThemeOverride);
  if ($("currentTheme")) $("currentTheme").textContent = `Estilo: ${THEME_LABELS[pendingThemeOverride]}`;
}

async function saveAdminThemeImmediately(theme) {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  const selected = normalizeTheme(theme);
  setPendingThemeOverride(selected);

  if (pendingThemeSaveTimer) clearTimeout(pendingThemeSaveTimer);
  pendingThemeSaveTimer = setTimeout(async () => {
    try {
      await update(ref(db, `events/${currentEventCode}`), { theme: selected });
      currentEvent = { ...currentEvent, theme: selected };
      pendingThemeOverride = null;
      if ($("adminSettingsMsg")) {
        $("adminSettingsMsg").dataset.state = "saved";
        $("adminSettingsMsg").textContent = "Estilo visual guardado.";
      }
      toast("Estilo visual guardado.");
    } catch (error) {
      console.error("Error guardando estilo visual:", error);
      if ($("adminSettingsMsg")) {
        $("adminSettingsMsg").dataset.state = "error";
        $("adminSettingsMsg").textContent = "No se pudo guardar el estilo visual.";
      }
      toast("No se pudo guardar el estilo visual.");
    }
  }, 350);
}

function cleanCode(value = "") {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function cleanName(value = "") {
  return value.trim().replace(/\s+/g, " ").slice(0, 40);
}


function cleanReason(value = "") {
  return cleanName(value).slice(0, 40);
}

function getSelectedReason(selectId, customId) {
  const selected = $(selectId)?.value || "";
  if (selected === "__custom__") return cleanReason($(customId)?.value || "");
  return selected;
}

function validReason(value = "") {
  const clean = cleanReason(value);
  return VALID_REASONS.includes(clean) || (clean.length >= 3 && clean.length <= 40);
}

function syncCustomReason(selectId, customId, currentValue = "") {
  const select = $(selectId);
  const custom = $(customId);
  if (!select || !custom) return;

  const value = currentValue || select.value;
  if (value && !VALID_REASONS.includes(value) && value !== "__custom__") {
    select.value = "__custom__";
    custom.value = value;
  }

  const isCustom = select.value === "__custom__";
  custom.classList.toggle("hidden", !isCustom);
  custom.classList.toggle("customReasonVisible", isCustom);
  if (isCustom && !custom.value && currentValue && currentValue !== "__custom__") {
    custom.value = currentValue;
  }
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

function generateCreatorKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}

function normalizeCreatorKey(value = "") {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function normalizeRecoveryAnswer(value = "") {
  return cleanName(value).toUpperCase().slice(0, 80);
}

function validRecovery(question = "", answer = "") {
  const q = cleanName(question);
  const a = normalizeRecoveryAnswer(answer);
  return q.length >= 3 && q.length <= 80 && a.length >= 2 && a.length <= 80;
}

function validCreatorKey(value = "") {
  return /^[A-Z0-9-]{6,32}$/.test(value);
}

function adminStorageKey(code) {
  return `sixseven_admin_${code}`;
}


function lastCreatorAccessKey() {
  return "sixseven_last_creator_access";
}

function saveLastCreatorAccess(code, creatorKey, eventName = "Evento privado") {
  if (!code || !creatorKey) return;
  const payload = {
    code,
    creatorKey,
    eventName,
    savedAt: Date.now()
  };
  localStorage.setItem(lastCreatorAccessKey(), JSON.stringify(payload));
  renderLastCreatorAccessBox();
}

function getLastCreatorAccess() {
  try {
    const raw = localStorage.getItem(lastCreatorAccessKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.code || !parsed?.creatorKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearLastCreatorAccessIfMatches(code = "") {
  const saved = getLastCreatorAccess();
  if (!saved || (code && saved.code !== code)) return;
  localStorage.removeItem(lastCreatorAccessKey());
  renderLastCreatorAccessBox();
}

function renderLastCreatorAccessBox() {
  const box = $("lastCreatorBox");
  const info = $("lastCreatorInfo");
  if (!box || !info) return;
  const saved = getLastCreatorAccess();
  box.classList.toggle("hidden", !saved);
  if (!saved) {
    info.innerHTML = "";
    return;
  }
  info.innerHTML = `
    <div class="savedRow"><span>Evento</span><strong>${escapeHtml(saved.eventName || "Evento privado")}</strong></div>
    <div class="savedRow"><span>Código</span><strong>${escapeHtml(saved.code)}</strong></div>
    <div class="savedRow"><span>Guardado</span><strong>${formatDate(saved.savedAt)}</strong></div>
  `;
}


function isAdmin(event = currentEvent) {
  return Boolean(uid && event && (event.creatorUid === uid || hasAdminAccess));
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRoundInfo(event) {
  const startedAt = Number(event?.roundStartedAt || event?.createdAt || Date.now());
  const roundDuration = Number(event?.roundDurationMs || ROUND_DURATION_MS);
  const totalRounds = Number(event?.totalRounds || TOTAL_ROUNDS);
  const now = Date.now();
  const elapsed = Math.max(0, now - startedAt);
  const totalDuration = roundDuration * totalRounds;

  if (elapsed >= totalDuration || (event?.expiresAt && now > Number(event.expiresAt))) {
    return {
      currentRound: totalRounds,
      roundKey: String(totalRounds),
      totalRounds,
      roundDuration,
      msRemaining: 0,
      eventEnded: true,
      elapsed,
      progress: 100
    };
  }

  const currentRound = Math.min(totalRounds, Math.floor(elapsed / roundDuration) + 1);
  const roundEndsAt = startedAt + currentRound * roundDuration;
  const msRemaining = Math.max(0, roundEndsAt - now);
  const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
  return {
    currentRound,
    roundKey: String(currentRound),
    totalRounds,
    roundDuration,
    msRemaining,
    eventEnded: false,
    elapsed,
    progress
  };
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function eventIsExpired(event) {
  return Boolean(event?.expiresAt && Date.now() > event.expiresAt) || getRoundInfo(event).eventEnded;
}

function eventCanJoin(event) {
  if (!["waiting", "open"].includes(event?.status) || eventIsExpired(event)) return false;
  // Por defecto se permite la entrada en cualquier ronda.
  // Solo se bloquea desde la ronda 2 si el creador activa expresamente esa opción.
  if (event?.closeEntryRound2 === true && getRoundInfo(event).currentRound >= 2) return false;
  return true;
}

function eventCanVote(event) {
  return event?.status === "open" && !eventIsExpired(event) && !getRoundInfo(event).eventEnded;
}


const ROUND_RING_CIRCUMFERENCE = 2 * Math.PI * 54;

function renderRoundVisualizer(round) {
  const timerMain = $("roundTimerMain");
  const miniLabel = $("roundMiniLabel");
  const ring = $("roundRingProgress");
  const progressBar = $("roundProgressMain");
  const status = $("roundStatus");
  const hint = $("roundHintText");
  if (!timerMain || !miniLabel || !ring) return;

  const roundElapsed = Math.max(0, round.roundDuration - round.msRemaining);
  const roundPercent = round.eventEnded ? 100 : Math.min(100, Math.round((roundElapsed / round.roundDuration) * 100));
  const offset = ROUND_RING_CIRCUMFERENCE * (1 - roundPercent / 100);
  ring.style.strokeDasharray = String(ROUND_RING_CIRCUMFERENCE);
  ring.style.strokeDashoffset = String(offset);

  timerMain.textContent = round.eventEnded ? "00:00" : formatRemaining(round.msRemaining);
  miniLabel.textContent = round.eventEnded ? "Evento finalizado" : `Ronda ${round.currentRound}/${round.totalRounds}`;
  if (status) status.textContent = round.eventEnded ? `Evento finalizado · ${round.totalRounds}/${round.totalRounds}` : `Ronda ${round.currentRound} de ${round.totalRounds} · ${formatRemaining(round.msRemaining)}`;
  if (progressBar) progressBar.style.width = `${round.progress}%`;
  if (hint) hint.textContent = round.eventEnded ? "Las rondas han terminado. Puedes revisar los resultados y los chats privados." : (roundPercent >= 85 ? "Queda muy poco para que se abra una nueva ronda." : "El voto se reinicia automáticamente al comenzar cada nueva ronda.");
}

function showRoundNotice(title, message) {
  const box = $("roundNotice");
  if (!box) return;
  box.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  box.classList.remove('hidden');
  requestAnimationFrame(() => box.classList.add('show'));
  if (roundNoticeTimer) clearTimeout(roundNoticeTimer);
  roundNoticeTimer = setTimeout(() => {
    box.classList.remove('show');
    setTimeout(() => box.classList.add('hidden'), 280);
  }, 3400);
}

function handleRoundTransition(round) {
  const signature = `${currentEventCode || ''}_${round.currentRound}_${round.eventEnded ? 'end' : 'live'}`;
  if (!lastRenderedRoundSignature) {
    lastRenderedRoundSignature = signature;
    return;
  }
  if (lastRenderedRoundSignature === signature) return;

  const previous = lastRenderedRoundSignature;
  lastRenderedRoundSignature = signature;
  if (round.eventEnded) {
    showRoundNotice('Evento finalizado', 'Las seis rondas se han completado. Ya puedes revisar resultados y matches.');
    return;
  }
  showRoundNotice(`Nueva ronda ${round.currentRound}`, 'Ya puedes volver a votar. Tu elección anterior se ha reiniciado.');
}

function participantCardMeta(participantUid, myVote, canVote) {
  if (myVote === participantUid) return 'Elegida en esta ronda';
  if (!canVote) return 'Votación cerrada en este momento';
  if (myVote) return 'Ya has usado tu voto';
  return 'Una sola elección por ronda';
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

  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Error en autenticación anónima:", error);
    toast("No se pudo iniciar sesión anónima. Activa Anonymous en Firebase Authentication.");
    throw error;
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Tiempo agotado esperando autenticación anónima"));
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        clearTimeout(timer);
        unsubscribe();
        uid = user.uid;
        resolve(user.uid);
      }
    }, error => {
      clearTimeout(timer);
      unsubscribe();
      reject(error);
    });
  });
}

function buildInviteUrl(code) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}?code=${encodeURIComponent(code)}`;
}

function inviteText(code, event = currentEvent) {
  const roundInfo = event ? getRoundInfo(event) : { totalRounds: TOTAL_ROUNDS };
  return `Te invito a participar en un evento privado en sixseven.

Evento: ${event?.name || "Evento privado"}
Tipo de conexión: ${event?.reason || "Privado"}
Dinámica: ${roundInfo.totalRounds || TOTAL_ROUNDS} rondas de 7 minutos
Código: ${code}

Entra aquí:
${buildInviteUrl(code)}

Tu voto será privado. Solo se revelará si hay match mutuo.
Participa solo si eres una persona adulta y aceptas formar parte del juego.`;
}

function stopListeners() {
  if (eventUnsubscribe) eventUnsubscribe();
  if (privateMatchUnsubscribe) privateMatchUnsubscribe();
  if (adminSessionUnsubscribe) adminSessionUnsubscribe();
  eventUnsubscribe = null;
  privateMatchUnsubscribe = null;
  adminSessionUnsubscribe = null;
  hasAdminAccess = false;
  if (roundTimerInterval) clearInterval(roundTimerInterval);
  if (activeChatUnsubscribe) activeChatUnsubscribe();
  activeChatUnsubscribe = null;
  knownPrivateMatches = {};
  autoShownMatches.clear();
  renderMyMatches();
  lastRenderedRoundSignature = null;
  if (roundNoticeTimer) clearTimeout(roundNoticeTimer);
  $("roundNotice")?.classList.add("hidden");
  roundTimerInterval = null;
  currentEventCode = null;
  currentEvent = null;
  applyTheme("dark");
}

function setupInviteFromUrl() {
  const urlParams = new URLSearchParams(location.search);
  const inviteCode = cleanCode(urlParams.get("code") || "");
  if (inviteCode) {
    $("joinCode").value = inviteCode;
    show("joinView");
  }
}

bind("aliasBtn", "click", () => {
  $("participantName").value = randomAlias();
  $("participantName").focus();
});

window.addEventListener("DOMContentLoaded", () => {
  applyTheme($("eventTheme")?.value || "dark");
  renderLastCreatorAccessBox();
  syncCustomReason("eventReason", "eventReasonCustom");
  syncCustomReason("adminEventReason", "adminEventReasonCustom");
  const maxInput = $("maxParticipants");
  if (maxInput && (!maxInput.value || maxInput.value === "8" || maxInput.value === "0")) maxInput.value = "67";
});

bind("eventReason", "change", () => syncCustomReason("eventReason", "eventReasonCustom"));
bind("eventTheme", "change", () => applyTheme($("eventTheme")?.value || "dark"));
bind("adminEventReason", "change", () => syncCustomReason("adminEventReason", "adminEventReasonCustom"));
bind("adminEventTheme", "change", () => {
  const selected = normalizeTheme($("adminEventTheme")?.value || currentEvent?.theme || "dark");
  markAdminSettingsDirty();
  applyTheme(selected);
  saveAdminThemeImmediately(selected);
});

// ADMIN_SAVE_DIRTY_BINDINGS
[
  "adminEventName",
  "adminEventReason",
  "adminEventReasonCustom",
  "adminEventTheme",
  "adminMaxParticipants",
  "adminCloseEntryRound2",
  "adminSoundEnabled",
  "adminExtendHours",
  "adminCreatorKeyNew",
  "adminRecoveryQuestion",
  "adminRecoveryAnswer"
].forEach(id => {
  bind(id, "input", markAdminSettingsDirty);
  bind(id, "change", markAdminSettingsDirty);
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
  const createError = $("createError");
  if (createError) createError.textContent = "";
  showAppStatus("");

  if (!(await validateGlobalAdminAccess("globalAdminCodeCreate", "globalAdminCodeCreateError"))) return;

  const name = cleanName($("eventName")?.value || "");
  const reason = getSelectedReason("eventReason", "eventReasonCustom");
  const theme = normalizeTheme($("eventTheme")?.value || "dark");
  const durationHours = Number($("eventDuration")?.value || 24);
  const maxParticipants = Number($("maxParticipants")?.value || 67);
  const closeEntryRound2 = $("closeEntryRound2") ? $("closeEntryRound2").checked === true : false;
  const soundEnabled = $("soundEnabled") ? $("soundEnabled").checked === true : false;
  const creatorKey = normalizeCreatorKey($("creatorKeyCreate")?.value || "");
  const creatorKeyRepeat = normalizeCreatorKey($("creatorKeyCreateRepeat")?.value || "");

  if (!rateLimit("create", 3000)) return;
  if (!name) return showCreateError("Indica el nombre del evento.");
  if (!validReason(reason)) return showCreateError("Selecciona o escribe un tipo de conexión válido.");
  if (!Number.isFinite(maxParticipants) || maxParticipants < 0 || maxParticipants > 100) return showCreateError("El número máximo de participantes debe estar entre 0 y 100.");
  if (!validCreatorKey(creatorKey)) return showCreateError("La clave de creador debe tener entre 6 y 32 caracteres: letras, números o guiones.");
  if (creatorKey !== creatorKeyRepeat) return showCreateError("Las dos claves de creador no coinciden.");

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Creando evento...";
    }

    await ensureAuth();

    let code = generateCode();
    let exists = await get(ref(db, `events/${code}`));
    let guard = 0;
    while (exists.exists() && guard < 12) {
      code = generateCode();
      exists = await get(ref(db, `events/${code}`));
      guard += 1;
    }
    if (exists.exists()) throw new Error("No se pudo generar un código único.");

    const createdAt = nowMs();
    const roundStartedAt = createdAt;
    const durationMs = Math.min(Math.max(durationHours, 1), 168) * 60 * 60 * 1000;
    const expiresAt = createdAt + durationMs;

    const eventPayload = {
      name,
      reason,
      creatorUid: uid,
      createdAt,
      expiresAt,
      status: "open",
      maxParticipants,
      closeEntryRound2,
      soundEnabled,
      roundStartedAt,
      roundDurationMs: ROUND_DURATION_MS,
      totalRounds: TOTAL_ROUNDS,
      theme,
      recoveryQuestion: ""
    };

    await set(ref(db, `events/${code}`), eventPayload);

    await set(ref(db, `eventSecrets/${code}`), {
      creatorKey,
      createdBy: uid,
      createdAt
    });

    await set(ref(db, `adminSessions/${code}/${uid}`), {
      active: true,
      key: creatorKey,
      claimedAt: createdAt
    });

    localStorage.setItem(adminStorageKey(code), creatorKey);
    saveLastCreatorAccess(code, creatorKey, name);

    currentEventCode = code;
    currentParticipantName = "Creador";
    currentEvent = eventPayload;
    hasAdminAccess = true;

    renderCreatedBox(code, name, reason, expiresAt, creatorKey);
    toast("Evento creado correctamente.");
    openEvent(code);
  } catch (error) {
    console.error("Error creando evento:", error);
    window.SIXSEVEN_LAST_ERROR = error?.message || String(error);
    const message = error?.code === "PERMISSION_DENIED"
      ? "Firebase ha bloqueado la creación. Pega el firebase.rules.json de este ZIP en Realtime Database > Rules."
      : "No se pudo crear el evento. Revisa Firebase, Anonymous y las reglas.";
    if (createError) createError.textContent = message;
    showAppStatus(message);
    toast(message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Crear evento y generar código";
    }
  }
});

function renderCreatedBox(code, name, reason, expiresAt, creatorKey = "") {
  const inviteUrl = buildInviteUrl(code);
  $("createdBox").classList.remove("hidden");
  $("createdBox").innerHTML = `
    <strong>Evento creado. La ronda 1 ya está abierta.</strong><br>
    <p>Código de acceso:</p>
    <button class="btn secondary" id="copyBtn" type="button">${escapeHtml(code)}</button>
    <p class="muted">${escapeHtml(name)} · ${escapeHtml(reason)} · 6 rondas de 7 minutos · finaliza el ${formatDate(expiresAt)}</p>
    <p class="muted">Enlace privado: ${escapeHtml(inviteUrl)}</p>
    ${creatorKey ? `<div class="creatorKeyBox"><strong>Clave de creador:</strong> <code>${escapeHtml(creatorKey)}</code><p class="muted">Guárdala. Te permitirá volver a administrar este evento desde otro navegador o dispositivo.</p></div>` : ""}
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
      $("joinError").textContent = "Este evento está cerrado o caducado. Si el evento está activo, revisa que el creador no haya cerrado la entrada.";
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
      joinedAt: nowMs(),
      consentAcceptedAt: nowMs(),
      active: true
    });

    openEvent(code);
  } catch (error) {
    console.error("Error entrando al evento:", error);
    $("joinError").textContent = error?.code === "PERMISSION_DENIED" ? "Firebase ha bloqueado la entrada. Actualiza las reglas con firebase.rules.json." : "No se pudo entrar. Revisa código, Firebase, Anonymous y reglas.";
  } finally {
    button.disabled = false;
    button.textContent = "Entrar al evento";
  }
});


bind("creatorAccess", "click", async () => {
  const button = $("creatorAccess");
  if (!(await validateGlobalAdminAccess("globalAdminCodeAccess", "creatorAccessError"))) return;
  const code = cleanCode($("creatorCode")?.value || $("joinCode")?.value || currentEventCode || "");
  const key = normalizeCreatorKey($("creatorKey")?.value || "");
  $("creatorAccessError").textContent = "";

  if (!code || !key) {
    $("creatorAccessError").textContent = "Introduce el código del evento y la clave de creador.";
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Comprobando...";
    await ensureAuth();
    await set(ref(db, `adminSessions/${code}/${uid}`), {
      active: true,
      key,
      claimedAt: Date.now()
    });
    localStorage.setItem(adminStorageKey(code), key);
    saveLastCreatorAccess(code, key, currentEvent?.name || "Evento privado", currentEvent?.recoveryQuestion || "");
    hasAdminAccess = true;
    toast("Acceso de creador activado.");
    openEvent(code);
  } catch (error) {
    console.error("Error accediendo como creador:", error);
    $("creatorAccessError").textContent = "La clave de creador no es válida o las reglas no están actualizadas.";
  } finally {
    button.disabled = false;
    button.textContent = "Acceder como creador";
  }
});


bind("loadRecoveryQuestion", "click", async () => {
  const code = cleanCode($("creatorCode")?.value || $("joinCode")?.value || currentEventCode || "");
  const error = $("recoveryAccessError");
  if (error) error.textContent = "";
  if (!code) {
    if (error) error.textContent = "Introduce primero el código del evento.";
    return;
  }
  try {
    await ensureAuth();
    const snap = await get(ref(db, `events/${code}/recoveryQuestion`));
    const question = snap.val();
    if (!question) {
      if (error) error.textContent = "Este evento no tiene pregunta de recuperación configurada.";
      return;
    }
    $("recoveryQuestionBox")?.classList.remove("hidden");
    $("recoveryQuestionText").textContent = question;
  } catch (err) {
    console.error("Error cargando pregunta de recuperación:", err);
    if (error) error.textContent = "No se pudo cargar la pregunta de recuperación.";
  }
});

bind("recoverCreatorWithAnswer", "click", async () => {
  const code = cleanCode($("creatorCode")?.value || $("joinCode")?.value || currentEventCode || "");
  const answer = normalizeRecoveryAnswer($("recoveryAnswer")?.value || "");
  const error = $("recoveryAccessError");
  if (error) error.textContent = "";
  if (!code || !answer) {
    if (error) error.textContent = "Introduce el código y la respuesta de recuperación.";
    return;
  }
  try {
    await ensureAuth();
    await set(ref(db, `adminSessions/${code}/${uid}`), {
      active: true,
      recoveryAnswer: answer,
      claimedAt: Date.now()
    });
    hasAdminAccess = true;
    const eventSnap = await get(ref(db, `events/${code}`));
    const event = eventSnap.val() || {};
    saveLastCreatorAccess(code, "[recuperado con pregunta]", event.name || "Evento privado", event.recoveryQuestion || "");
    toast("Acceso de creador recuperado con pregunta.");
    openEvent(code);
  } catch (err) {
    console.error("Error recuperando acceso con pregunta:", err);
    if (error) error.textContent = "Respuesta incorrecta o reglas de Firebase sin actualizar.";
  }
});


bind("copyInvite", "click", () => {
  if (!currentEventCode || !currentEvent) return;
  copyText(inviteText(currentEventCode, currentEvent));
});

bind("copyCreatorAccess", "click", () => {
  if (!currentEventCode || !currentEvent) return;
  const storedKey = localStorage.getItem(adminStorageKey(currentEventCode)) || "";
  const text = `Acceso de creador de sixseven
Evento: ${currentEvent.name || "Evento privado"}
Código: ${currentEventCode}
Clave de creador: ${storedKey || "[clave no disponible en este navegador]"}
Enlace: ${buildInviteUrl(currentEventCode)}`;
  copyText(text);
});

bind("whatsappInvite", "click", () => {
  if (!currentEventCode || !currentEvent) return;
  const url = `https://wa.me/?text=${encodeURIComponent(inviteText(currentEventCode, currentEvent))}`;
  window.open(url, "_blank", "noopener,noreferrer");
});


bind("generateStickersPdf", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  await generateStickersPdf();
});


bind("recoverLastCreator", "click", async () => {
  if (!(await validateGlobalAdminAccess("globalAdminCodeRecover", "globalAdminCodeRecoverError"))) return;
  const saved = getLastCreatorAccess();
  if (!saved) return toast("No hay ningún acceso de creador guardado en este dispositivo.");
  await ensureAuth();
  try {
    await set(ref(db, `adminSessions/${saved.code}/${uid}`), {
      active: true,
      key: saved.creatorKey,
      claimedAt: Date.now()
    });
    localStorage.setItem(adminStorageKey(saved.code), saved.creatorKey);
    hasAdminAccess = true;
    toast("Acceso de creador recuperado.");
    openEvent(saved.code);
  } catch (error) {
    console.error("Error recuperando acceso de creador:", error);
    toast("No se pudo recuperar el evento. Revisa la clave guardada o las reglas.");
  }
});

bind("clearLastCreator", "click", () => {
  localStorage.removeItem(lastCreatorAccessKey());
  renderLastCreatorAccessBox();
  toast("Acceso guardado borrado de este dispositivo.");
});

bind("openPublicScreen", "click", () => {
  if (!currentEvent) return;
  const screen = $("publicScreen");
  if (!screen) return;
  screen.classList.remove("hidden");
  document.body.classList.add("public-mode");
  renderPublicScreen(currentEvent);
});

bind("closePublicScreen", "click", () => {
  $("publicScreen")?.classList.add("hidden");
  document.body.classList.remove("public-mode");
});


bind("sendAnnouncement", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  const input = $("adminAnnouncementText");
  const text = cleanName(input?.value || "").slice(0, 120);
  if (!text) return toast("Escribe el aviso antes de enviarlo.");
  try {
    const key = `${Date.now()}_${uid}`;
    await set(ref(db, `events/${currentEventCode}/announcements/${key}`), {
      text,
      createdAt: Date.now(),
      creatorUid: uid
    });
    input.value = "";
    toast("Aviso enviado a todos los participantes.");
  } catch (error) {
    console.error("Error enviando aviso:", error);
    toast("No se pudo enviar el aviso. Revisa las reglas.");
  }
});

bind("deleteMyParticipation", "click", async () => {
  await deleteMyParticipation();
});

bind("generatePosterPdf", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  await generatePosterPdf();
});


bind("saveAdminSettings", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;

  const button = $("saveAdminSettings");
  const msg = $("adminSettingsMsg");
  if (msg) {
    msg.dataset.state = "saving";
    msg.textContent = "Guardando cambios...";
  }

  const name = cleanName($("adminEventName")?.value || "");
  const reason = getSelectedReason("adminEventReason", "adminEventReasonCustom");
  const theme = normalizeTheme($("adminEventTheme")?.value || currentEvent?.theme || "dark");
  const maxParticipants = readAdminMaxParticipants();
  const closeEntryRound2 = $("adminCloseEntryRound2") ? $("adminCloseEntryRound2").checked === true : false;
  const soundEnabled = $("adminSoundEnabled") ? $("adminSoundEnabled").checked === true : false;
  const extendHours = Number($("adminExtendHours")?.value || 0);
  const newCreatorKey = normalizeCreatorKey($("adminCreatorKeyNew")?.value || "");
  const recoveryQuestion = cleanName($("adminRecoveryQuestion")?.value || "");
  const recoveryAnswer = normalizeRecoveryAnswer($("adminRecoveryAnswer")?.value || "");

  if (!name) {
    if (msg) msg.textContent = "El nombre del evento no puede quedar vacío.";
    return toast("El nombre del evento no puede quedar vacío.");
  }
  if (!validReason(reason)) {
    if (msg) msg.textContent = "Selecciona o escribe un tipo de conexión válido.";
    return toast("Selecciona o escribe un tipo de conexión válido.");
  }
  if (maxParticipants < 0 || maxParticipants > 100) {
    if (msg) msg.textContent = "El máximo de participantes debe estar entre 0 y 100.";
    return toast("El máximo de participantes debe estar entre 0 y 100.");
  }
  if (newCreatorKey && !validCreatorKey(newCreatorKey)) {
    if (msg) msg.textContent = "La nueva clave debe tener entre 6 y 32 caracteres.";
    return toast("La nueva clave debe tener entre 6 y 32 caracteres: letras, números o guiones.");
  }
  if (recoveryAnswer && !validRecovery(recoveryQuestion, recoveryAnswer)) {
    if (msg) msg.textContent = "Para cambiar la respuesta, indica también una pregunta de recuperación válida.";
    return toast("Para cambiar la respuesta, indica también una pregunta de recuperación válida.");
  }

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Guardando...";
    }

    const eventUpdates = {
      name,
      reason,
      theme,
      maxParticipants,
      closeEntryRound2,
      soundEnabled,
      recoveryQuestion
    };

    if (extendHours > 0) {
      const base = Math.max(Date.now(), Number(currentEvent.expiresAt || Date.now()));
      eventUpdates.expiresAt = base + extendHours * 60 * 60 * 1000;
    }

    const updates = {};
    Object.entries(eventUpdates).forEach(([key, value]) => {
      updates[`events/${currentEventCode}/${key}`] = value;
    });

    if (newCreatorKey) {
      updates[`eventSecrets/${currentEventCode}/creatorKey`] = newCreatorKey;
      updates[`adminSessions/${currentEventCode}/${uid}/key`] = newCreatorKey;
      updates[`adminSessions/${currentEventCode}/${uid}/active`] = true;
      updates[`adminSessions/${currentEventCode}/${uid}/claimedAt`] = Date.now();
    }

    if (recoveryAnswer) {
      updates[`eventSecrets/${currentEventCode}/recoveryAnswer`] = recoveryAnswer;
    }

    await update(ref(db), updates);

    currentEvent = { ...currentEvent, ...eventUpdates };
    pendingThemeOverride = null;
    applyTheme(theme);

    if (newCreatorKey) {
      localStorage.setItem(adminStorageKey(currentEventCode), newCreatorKey);
      saveLastCreatorAccess(currentEventCode, newCreatorKey, name || "Evento privado", recoveryQuestion || "");
      if ($("adminCreatorKeyNew")) $("adminCreatorKeyNew").value = "";
    }

    if (recoveryAnswer && $("adminRecoveryAnswer")) $("adminRecoveryAnswer").value = "";
    saveLastCreatorAccess(
      currentEventCode,
      localStorage.getItem(adminStorageKey(currentEventCode)) || "[clave no disponible]",
      name || "Evento privado",
      recoveryQuestion || ""
    );

    if ($("adminExtendHours")) $("adminExtendHours").value = "0";

    clearAdminSettingsDirty();
    populateAdminSettings(currentEvent);

    if (msg) {
      msg.dataset.state = "saved";
      msg.textContent = "Cambios guardados correctamente.";
    }
    toast("Cambios del evento guardados.");
  } catch (error) {
    console.error("Error guardando ajustes:", error);
    if (msg) {
      msg.dataset.state = "error";
      msg.textContent = "No se pudieron guardar los cambios. Revisa Firebase Rules o tu acceso de creador.";
    }
    toast("No se pudieron guardar los cambios. Revisa las reglas de Firebase.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Guardar cambios del evento";
    }
  }
});

bind("startVoting", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  await update(ref(db, `events/${currentEventCode}`), { status: "open" });
  toast("Votación iniciada.");
});

bind("toggleEventStatus", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  const nextStatus = currentEvent.status === "closed" ? "open" : "closed";
  await update(ref(db, `events/${currentEventCode}`), { status: nextStatus });
  toast(nextStatus === "open" ? "Evento reabierto con votación activa." : "Evento cerrado.");
});

bind("resetVotes", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  const ok = confirm("¿Seguro que quieres reiniciar todas las rondas, votos y avisos de match de este evento?");
  if (!ok) return;
  const now = Date.now();
  await remove(ref(db, `events/${currentEventCode}/votesByRound`));
  await remove(ref(db, `events/${currentEventCode}/matchPairsByRound`));
  await remove(ref(db, `events/${currentEventCode}/votes`));
  await remove(ref(db, `events/${currentEventCode}/matchPairs`));
  await remove(ref(db, `privateMatches/${currentEventCode}`));
  await update(ref(db, `events/${currentEventCode}`), {
    status: "open",
    roundStartedAt: now,
    roundDurationMs: ROUND_DURATION_MS,
    totalRounds: TOTAL_ROUNDS,
    expiresAt: now + TOTAL_EVENT_DURATION_MS
  });
  toast("Rondas reiniciadas. La ronda 1 queda activa de nuevo.");
});

bind("deleteEvent", "click", async () => {
  if (!currentEventCode || !currentEvent || !isAdmin()) return;
  const ok = confirm("¿Eliminar definitivamente este evento y sus avisos privados?");
  if (!ok) return;
  const code = currentEventCode;
  await remove(ref(db, `privateMatches/${code}`));
  await remove(ref(db, `chats/${code}`));
  await remove(ref(db, `eventSecrets/${code}`));
  await remove(ref(db, `adminSessions/${code}`));
  await remove(ref(db, `events/${code}`));
  localStorage.removeItem(adminStorageKey(code));
  clearLastCreatorAccessIfMatches(code);
  toast("Evento eliminado.");
  stopListeners();
  show("home");
});

async function claimStoredAdminAccess(code) {
  const storedKey = localStorage.getItem(adminStorageKey(code));
  if (!storedKey || !uid) return;
  try {
    await set(ref(db, `adminSessions/${code}/${uid}`), {
      active: true,
      key: storedKey,
      claimedAt: Date.now()
    });
  } catch (error) {
    console.warn("No se pudo recuperar automáticamente el acceso de creador:", error);
  }
}

function openEvent(code) {
  show("eventView");
  $("currentCode").textContent = code;
  claimStoredAdminAccess(code);

  if (eventUnsubscribe) eventUnsubscribe();
  if (privateMatchUnsubscribe) privateMatchUnsubscribe();
  if (adminSessionUnsubscribe) adminSessionUnsubscribe();

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
    knownPrivateMatches = notices;
    renderMyMatches();
    Object.entries(notices).forEach(([key, notice]) => {
      if (!autoShownMatches.has(key)) {
        autoShownMatches.add(key);
        showMatch(notice.withName, key, notice.withUid, false);
      }
    });
  });

  adminSessionUnsubscribe = onValue(ref(db, `adminSessions/${code}/${uid}`), (snap) => {
    hasAdminAccess = Boolean(snap.val()?.active);
    if (currentEvent) renderEvent(currentEvent);
  });

  if (roundTimerInterval) clearInterval(roundTimerInterval);
  roundTimerInterval = setInterval(() => {
    if (currentEvent) renderEvent(currentEvent);
  }, 1000);
}

function statusText(event) {
  const round = getRoundInfo(event);
  if (round.eventEnded || eventIsExpired(event)) return `Evento finalizado · 6/6 rondas completadas`;
  if (event.status === "waiting") return `En espera · ronda ${round.currentRound}/${round.totalRounds}`;
  if (event.status === "open") return `Ronda ${round.currentRound}/${round.totalRounds} abierta · quedan ${formatRemaining(round.msRemaining)}`;
  return `Cerrado · ronda ${round.currentRound}/${round.totalRounds}`;
}

function renderEvent(event) {
  // CLEAR_PENDING_THEME_ON_RENDER
  if (pendingThemeOverride && event?.theme === pendingThemeOverride) pendingThemeOverride = null;
  const canVote = eventCanVote(event);
  const canJoin = eventCanJoin(event);
  const isCreator = isAdmin(event);
  const participants = event.participants || {};
  const round = getRoundInfo(event);
  const allVotesByRound = event.votesByRound || {};
  const votes = allVotesByRound[round.roundKey] || {};
  const myVote = votes[uid]?.targetUid;
  const votedCount = Object.keys(votes).length;
  const max = Number(event.maxParticipants || 0);

  $("currentTitle").textContent = event.name || "Evento";
  $("currentReason").textContent = event.reason || "";
  const renderTheme = getThemeForRender(event);
  applyTheme(renderTheme);
  if ($("currentTheme")) $("currentTheme").textContent = `Estilo: ${THEME_LABELS[renderTheme]}`;
  $("votesCount").textContent = votedCount;
  $("participantCount").textContent = max > 0 ? `${Object.keys(participants).length}/${max}` : Object.keys(participants).length;
  $("eventStatus").textContent = statusText(event);
  renderRoundVisualizer(round);
  handleRoundTransition(round);
  if ($("roundProgress")) $("roundProgress").style.width = `${round.progress}%`;

  $("voteHelp").textContent = !canJoin
    ? "El evento está cerrado o caducado. Puedes ver el contador, pero no emitir nuevos votos."
    : event.status === "waiting"
      ? "La votación aún no está abierta."
      : myVote
        ? `Voto registrado en la ronda ${round.currentRound}. En la siguiente ronda podrás votar de nuevo.`
        : `Ronda ${round.currentRound}/${round.totalRounds}. Elige una tarjeta premium. Tu voto es secreto y se reinicia cada 7 minutos.`;

  renderAdminPanel(isCreator, event, participants, votes);
  renderAnnouncements(event);
  renderParticipantTools(participants);
  renderParticipants(participants, votes, canVote);
  renderMyVotesReceived(participants, votes);
  renderPrivateHistory(participants, allVotesByRound, round);
  renderDistribution(participants, votes);
  renderFinalResults(event, participants, allVotesByRound, round);
  renderPublicScreen(event);
}


function countUniqueMatchesByRound(matchPairsByRound = {}) {
  const pairs = new Set();
  Object.entries(matchPairsByRound || {}).forEach(([roundKey, pairsObj]) => {
    Object.keys(pairsObj || {}).forEach(pair => pairs.add(`${roundKey}_${pair}`));
  });
  return pairs.size;
}

function getAllVotesStats(event = {}, participants = {}) {
  const allVotesByRound = event.votesByRound || {};
  let totalVotes = 0;
  let myReceived = 0;
  let myVotesCast = 0;
  Object.values(allVotesByRound).forEach(roundVotes => {
    Object.entries(roundVotes || {}).forEach(([voterUid, vote]) => {
      totalVotes += 1;
      if (voterUid === uid) myVotesCast += 1;
      if (vote?.targetUid === uid) myReceived += 1;
    });
  });
  return {
    totalVotes,
    myReceived,
    myVotesCast,
    totalParticipants: Object.keys(participants || {}).length,
    totalMatches: countUniqueMatchesByRound(event.matchPairsByRound || {})
  };
}

function renderFinalResults(event = {}, participants = {}, allVotesByRound = {}, round = getRoundInfo(event)) {
  const box = $("finalResultsBox");
  const content = $("finalResultsContent");
  if (!box || !content) return;

  const ended = round.eventEnded || event.status === "closed" || eventIsExpired(event);
  box.classList.toggle("hidden", !ended);
  if (!ended) return;

  const stats = getAllVotesStats(event, participants);
  const amParticipant = Boolean(participants?.[uid]);
  const personalBlock = amParticipant
    ? `<div class="finalPersonal"><strong>Tu resumen privado</strong><p class="muted">Has emitido ${stats.myVotesCast} ${stats.myVotesCast === 1 ? "voto" : "votos"} y has recibido ${stats.myReceived} ${stats.myReceived === 1 ? "voto" : "votos"} durante el evento.</p></div>`
    : "";

  content.innerHTML = `
    <div class="finalGrid">
      <article class="finalCard"><span>${round.totalRounds || TOTAL_ROUNDS}</span><small>rondas completadas</small></article>
      <article class="finalCard"><span>${stats.totalParticipants}</span><small>participantes</small></article>
      <article class="finalCard"><span>${stats.totalVotes}</span><small>votos emitidos</small></article>
      <article class="finalCard"><span>${stats.totalMatches}</span><small>matches encontrados</small></article>
    </div>
    ${personalBlock}
    <p class="muted">Resumen seguro: no se muestran nombres asociados a votos ni elecciones individuales.</p>
  `;
}

function renderPublicScreen(event = {}) {
  const screen = $("publicScreen");
  if (!screen || screen.classList.contains("hidden")) return;

  const participants = event.participants || {};
  const round = getRoundInfo(event);
  const votes = (event.votesByRound || {})[round.roundKey] || {};
  const stats = getAllVotesStats(event, participants);

  $("publicRound").textContent = round.eventEnded ? "Evento finalizado" : `Ronda ${round.currentRound} de ${round.totalRounds}`;
  $("publicTimer").textContent = round.eventEnded ? "00:00" : formatRemaining(round.msRemaining);
  $("publicParticipants").textContent = String(Object.keys(participants).length);
  $("publicVotes").textContent = String(Object.keys(votes).length);
  $("publicMatches").textContent = String(stats.totalMatches);
  if ($("publicProgress")) $("publicProgress").style.width = `${round.progress}%`;
}


async function imageToDataUrl(url) {
  const response = await fetch(url, { cache: "force-cache" });
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function stickerThemeColors(theme = "dark") {
  const selected = normalizeTheme(theme);
  const palettes = {
    dark: { top: [45, 17, 48], accent: [202, 96, 124], text: [34, 18, 42], soft: [242, 231, 237] },
    passion: { top: [95, 4, 24], accent: [255, 37, 95], text: [55, 4, 18], soft: [255, 235, 239] },
    white: { top: [255, 255, 255], accent: [141, 47, 83], text: [33, 25, 37], soft: [246, 240, 233] },
    night: { top: [8, 12, 35], accent: [0, 212, 255], text: [6, 9, 26], soft: [232, 241, 255] },
    gold: { top: [38, 27, 12], accent: [216, 166, 61], text: [35, 22, 8], soft: [255, 247, 229] }
  };
  return palettes[selected] || palettes.dark;
}

function splitNameForSticker(name = "") {
  const clean = cleanName(name || "INVITADO");
  if (clean.length <= 13) return [clean.toUpperCase()];
  const words = clean.toUpperCase().split(" ");
  const lines = [];
  let current = "";
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 13 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function drawSticker(pdf, x, y, w, h, name, logoDataUrl, event = currentEvent) {
  const colors = stickerThemeColors(event?.theme || "dark");
  const r = 4;
  pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.setLineWidth(0.45);
  pdf.roundedRect(x, y, w, h, r, r, "S");

  // Top dark/colored band
  pdf.setFillColor(colors.top[0], colors.top[1], colors.top[2]);
  pdf.roundedRect(x, y, w, h * 0.30, r, r, "F");
  pdf.setFillColor(colors.top[0], colors.top[1], colors.top[2]);
  pdf.rect(x, y + h * 0.20, w, h * 0.11, "F");

  // Accent separator
  pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.setLineWidth(0.9);
  pdf.line(x + 4, y + h * 0.31, x + w - 4, y + h * 0.31);

  // Logo
  try {
    const logoSize = h * 0.20;
    pdf.addImage(logoDataUrl, "PNG", x + (w - logoSize) / 2, y + 3, logoSize, logoSize);
  } catch (error) {
    // If image fails, continue with text logo.
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("sixseven", x + w / 2, y + h * 0.27, { align: "center" });

  // Main body
  pdf.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("HOLA, SOY", x + w / 2, y + h * 0.43, { align: "center" });

  const lines = splitNameForSticker(name);
  pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  pdf.setFont("helvetica", "bold");
  const fontSize = lines.length > 1 ? 22 : (lines[0].length > 10 ? 24 : 30);
  pdf.setFontSize(fontSize);
  const lineStart = lines.length > 1 ? y + h * 0.58 : y + h * 0.63;
  lines.forEach((line, index) => {
    pdf.text(line, x + w / 2, lineStart + index * 9, { align: "center" });
  });

  // Decorative x and footer
  pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.setLineWidth(0.35);
  pdf.line(x + 13, y + h * 0.78, x + w * 0.44, y + h * 0.78);
  pdf.line(x + w * 0.56, y + h * 0.78, x + w - 13, y + h * 0.78);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  pdf.text("x", x + w / 2, y + h * 0.80, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  pdf.text("sixseven · conexión privada", x + w / 2, y + h * 0.91, { align: "center" });

  // Cut guides
  pdf.setDrawColor(185, 185, 185);
  pdf.setLineWidth(0.15);
  pdf.line(x - 2, y, x - 0.5, y);
  pdf.line(x, y - 2, x, y - 0.5);
  pdf.line(x + w + 0.5, y, x + w + 2, y);
  pdf.line(x + w, y - 2, x + w, y - 0.5);
  pdf.line(x - 2, y + h, x - 0.5, y + h);
  pdf.line(x, y + h + 0.5, x, y + h + 2);
  pdf.line(x + w + 0.5, y + h, x + w + 2, y + h);
  pdf.line(x + w, y + h + 0.5, x + w, y + h + 2);
}

async function generateStickersPdf() {
  if (!window.jspdf?.jsPDF) {
    toast("No se pudo cargar la librería PDF. Revisa tu conexión e inténtalo de nuevo.");
    return;
  }

  const participants = Object.values(currentEvent?.participants || {})
    .map(p => cleanName(p?.name || ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (!participants.length) {
    toast("Aún no hay participantes para generar pegatinas.");
    return;
  }

  try {
    toast("Generando PDF de pegatinas...");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const logoDataUrl = await imageToDataUrl("assets/sixseven-logo.png");

    const pageW = 210;
    const pageH = 297;
    const marginX = 12;
    const marginY = 12;
    const gapX = 6;
    const gapY = 7;
    const cols = 2;
    const rows = 4;
    const stickerW = (pageW - marginX * 2 - gapX) / cols;
    const stickerH = (pageH - marginY * 2 - gapY * (rows - 1)) / rows;
    const perPage = cols * rows;

    participants.forEach((name, index) => {
      if (index > 0 && index % perPage === 0) pdf.addPage();
      const local = index % perPage;
      const col = local % cols;
      const row = Math.floor(local / cols);
      const x = marginX + col * (stickerW + gapX);
      const y = marginY + row * (stickerH + gapY);
      drawSticker(pdf, x, y, stickerW, stickerH, name, logoDataUrl, currentEvent);
    });

    const safeName = (currentEvent?.name || "sixseven")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 40) || "sixseven";

    pdf.save(`pegatinas-${safeName}-${currentEventCode}.pdf`);
    toast("PDF de pegatinas generado.");
  } catch (error) {
    console.error("Error generando PDF de pegatinas:", error);
    toast("No se pudo generar el PDF de pegatinas.");
  }
}


function renderAnnouncements(event = {}) {
  const box = $("announcementsBox");
  const list = $("announcementsList");
  if (!box || !list) return;
  const entries = Object.entries(event.announcements || {})
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 5);

  box.classList.toggle("hidden", entries.length === 0);
  list.innerHTML = "";
  entries.forEach(item => {
    const row = document.createElement("div");
    row.className = "announcementItem";
    row.innerHTML = `<strong>${formatDate(item.createdAt || Date.now())}</strong><p>${escapeHtml(item.text || "")}</p>`;
    list.appendChild(row);
  });
}

function renderParticipantTools(participants = {}) {
  const box = $("participantToolsBox");
  if (!box) return;
  box.classList.toggle("hidden", !participants?.[uid] || isAdmin());
}

async function deleteMyParticipation() {
  if (!currentEventCode || !currentEvent || !uid) return;
  const participant = currentEvent.participants?.[uid];
  if (!participant) return toast("No estás registrado como participante en este evento.");
  const ok = confirm("¿Quieres salir y borrar tu participación? Se eliminarán tu alias, votos emitidos, votos asociados y chats de match relacionados.");
  if (!ok) return;

  try {
    const updates = {};
    updates[`events/${currentEventCode}/participants/${uid}`] = null;
    if (participant.normalizedName) {
      updates[`events/${currentEventCode}/nameIndex/${participant.normalizedName}`] = null;
    }
    updates[`privateMatches/${currentEventCode}/${uid}`] = null;

    Object.entries(currentEvent.votesByRound || {}).forEach(([roundKey, roundVotes]) => {
      updates[`events/${currentEventCode}/votesByRound/${roundKey}/${uid}`] = null;
      Object.entries(roundVotes || {}).forEach(([voterUid, vote]) => {
        if (vote?.targetUid === uid) {
          updates[`events/${currentEventCode}/votesByRound/${roundKey}/${voterUid}`] = null;
        }
      });
    });

    Object.entries(knownPrivateMatches || {}).forEach(([matchKey]) => {
      updates[`chats/${currentEventCode}/${matchKey}`] = null;
    });

    Object.entries(currentEvent.participants || {}).forEach(([otherUid]) => {
      if (otherUid === uid) return;
      const pair = pairKey(uid, otherUid);
      for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
        const matchKey = `${round}_${pair}`;
        updates[`events/${currentEventCode}/matchPairsByRound/${round}/${pair}`] = null;
        updates[`privateMatches/${currentEventCode}/${otherUid}/${matchKey}`] = null;
        updates[`chats/${currentEventCode}/${matchKey}`] = null;
      }
    });

    await update(ref(db), updates);
    toast("Tu participación se ha borrado.");
    stopListeners();
    show("home");
  } catch (error) {
    console.error("Error borrando participación:", error);
    toast("No se pudo borrar la participación. Revisa las reglas de Firebase.");
  }
}

async function qrDataUrlForEvent(code) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(buildInviteUrl(code))}`;
  return await imageToDataUrl(url);
}

async function generatePosterPdf() {
  if (!window.jspdf?.jsPDF) {
    toast("No se pudo cargar la librería PDF. Revisa tu conexión.");
    return;
  }

  try {
    toast("Generando cartel PDF con QR...");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const logoDataUrl = await imageToDataUrl("assets/sixseven-logo.png");
    const qrDataUrl = await qrDataUrlForEvent(currentEventCode);
    const colors = stickerThemeColors(currentEvent?.theme || "dark");

    pdf.setFillColor(colors.top[0], colors.top[1], colors.top[2]);
    pdf.rect(0, 0, 210, 297, "F");

    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(18, 18, 174, 261, 8, 8, "F");

    pdf.addImage(logoDataUrl, "PNG", 78, 26, 54, 54);

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.setFontSize(24);
    pdf.text("sixseven", 105, 90, { align: "center" });

    pdf.setFontSize(18);
    pdf.text(currentEvent?.name || "Evento privado", 105, 108, { align: "center", maxWidth: 150 });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(90, 82, 96);
    pdf.text(`Tipo de conexión: ${currentEvent?.reason || "Privado"}`, 105, 120, { align: "center" });
    pdf.text("6 rondas de 7 minutos · voto privado · match mutuo", 105, 128, { align: "center" });

    pdf.addImage(qrDataUrl, "PNG", 60, 140, 90, 90);

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    pdf.setFontSize(18);
    pdf.text(`Código: ${currentEventCode}`, 105, 244, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 82, 96);
    pdf.text("Escanea el QR para participar. Solo para personas adultas y con consentimiento.", 105, 258, { align: "center", maxWidth: 150 });
    pdf.text(buildInviteUrl(currentEventCode), 105, 266, { align: "center", maxWidth: 150 });

    const safeName = (currentEvent?.name || "sixseven")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 40) || "sixseven";

    pdf.save(`cartel-${safeName}-${currentEventCode}.pdf`);
    toast("Cartel PDF generado.");
  } catch (error) {
    console.error("Error generando cartel:", error);
    toast("No se pudo generar el cartel PDF.");
  }
}



function markAdminSettingsDirty() {
  adminSettingsDirty = true;
  const msg = $("adminSettingsMsg");
  if (msg && msg.dataset.state !== "saving") msg.textContent = "Hay cambios sin guardar.";
}

function clearAdminSettingsDirty() {
  adminSettingsDirty = false;
  const msg = $("adminSettingsMsg");
  if (msg) {
    delete msg.dataset.state;
  }
}

function shouldSkipAdminPopulate() {
  const active = document.activeElement;
  return Boolean(adminSettingsDirty || active?.closest?.(".adminSettingsBox"));
}

function readAdminMaxParticipants() {
  const raw = $("adminMaxParticipants")?.value;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : Number(currentEvent?.maxParticipants || 67);
}

function renderAdminPanel(isCreator, event, participants = {}, votes = {}) {
  const panel = $("adminPanel");
  panel.classList.toggle("hidden", !isCreator);
  if (!isCreator || !currentEventCode) return;

  const startBtn = $("startVoting");
  if (startBtn) {
    startBtn.classList.add("hidden");
    startBtn.disabled = true;
  }

  $("toggleEventStatus").textContent = event.status === "closed" ? "Reabrir votación" : "Cerrar evento";
  populateAdminSettings(event);
  const inviteUrl = buildInviteUrl(currentEventCode);
  $("qrImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(inviteUrl)}`;
  renderAdminParticipants(participants, votes);
}

function populateAdminSettings(event) {
  if (!event) return;
  if (shouldSkipAdminPopulate()) return;

  if ($("adminEventName")) $("adminEventName").value = event.name || "";
  if ($("adminEventReason")) {
    $("adminEventReason").value = VALID_REASONS.includes(event.reason) ? event.reason : "__custom__";
    syncCustomReason("adminEventReason", "adminEventReasonCustom", event.reason || "");
  }
  if ($("adminEventTheme")) $("adminEventTheme").value = normalizeTheme(event.theme || "dark");

  if ($("adminMaxParticipants")) {
    const value = String(Number(event.maxParticipants ?? 67));
    const optionExists = Array.from($("adminMaxParticipants").options || []).some(option => option.value === value);
    $("adminMaxParticipants").value = optionExists ? value : "0";
  }

  if ($("adminCloseEntryRound2")) $("adminCloseEntryRound2").checked = event.closeEntryRound2 === true;
  if ($("adminSoundEnabled")) $("adminSoundEnabled").checked = event.soundEnabled === true;
  if ($("adminRecoveryQuestion")) $("adminRecoveryQuestion").value = event.recoveryQuestion || "";
}

function renderAdminParticipants(participants = {}, votes = {}) {
  const box = $("adminParticipants");
  if (!box) return;
  box.innerHTML = "";
  const entries = Object.entries(participants).sort(([, a], [, b]) => (a.name || "").localeCompare(b.name || ""));
  if (!entries.length) {
    box.innerHTML = `<p class="muted">Aún no hay participantes.</p>`;
    return;
  }
  entries.forEach(([participantUid, participant]) => {
    const received = Object.values(votes || {}).filter(v => v?.targetUid === participantUid).length;
    const row = document.createElement("div");
    row.className = "adminParticipantRow";
    row.innerHTML = `
      <span><strong>${escapeHtml(participant.name || "Participante")}</strong><small>${received} ${received === 1 ? "voto recibido" : "votos recibidos"}</small></span>
      <button type="button" class="btn danger outline small" ${participantUid === uid ? "disabled" : ""}>Eliminar</button>
    `;
    row.querySelector("button")?.addEventListener("click", () => removeParticipant(participantUid, participant.name || "Participante"));
    box.appendChild(row);
  });
}

async function removeParticipant(participantUid, participantName) {
  if (!currentEventCode || !isAdmin()) return;
  if (participantUid === uid) return toast("No puedes eliminarte desde el panel del creador.");
  const ok = confirm(`¿Eliminar a ${participantName} del evento? También se borrarán sus votos y posibles matches.`);
  if (!ok) return;
  try {
    const updates = {};
    updates[`events/${currentEventCode}/participants/${participantUid}`] = null;
    updates[`privateMatches/${currentEventCode}/${participantUid}`] = null;
    Object.entries(currentEvent?.votesByRound || {}).forEach(([roundKey, roundVotes]) => {
      updates[`events/${currentEventCode}/votesByRound/${roundKey}/${participantUid}`] = null;
      Object.entries(roundVotes || {}).forEach(([voterUid, vote]) => {
        if (vote?.targetUid === participantUid) updates[`events/${currentEventCode}/votesByRound/${roundKey}/${voterUid}`] = null;
      });
    });
    Object.entries(currentEvent?.participants || {}).forEach(([otherUid]) => {
      const pair = pairKey(otherUid, participantUid);
      for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
        const key = `${round}_${pair}`;
        updates[`events/${currentEventCode}/matchPairsByRound/${round}/${pair}`] = null;
        updates[`privateMatches/${currentEventCode}/${otherUid}/${key}`] = null;
        updates[`chats/${currentEventCode}/${key}`] = null;
      }
    });
    if (participantUid && currentEvent?.participants?.[participantUid]?.normalizedName) {
      updates[`events/${currentEventCode}/nameIndex/${currentEvent.participants[participantUid].normalizedName}`] = null;
    }
    await update(ref(db), updates);
    toast("Participante eliminado.");
  } catch (error) {
    console.error("Error eliminando participante:", error);
    toast("No se pudo eliminar. Revisa las reglas de Firebase.");
  }
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
      btn.title = participant.name || "Participante";
      btn.disabled = Boolean(myVote) || !canVote;
      btn.innerHTML = `
        <span class="personAvatar"><img src="assets/icon-user.svg" alt="" /></span>
        <span class="personBody">
          <strong class="personName">${escapeHtml(participant.name || "Participante")}</strong>
          <small class="personMeta">${escapeHtml(participantCardMeta(participantUid, myVote, canVote))}</small>
        </span>
        <span class="personAction">${myVote === participantUid ? "Elegida" : (canVote && !myVote ? "Elegir" : "Privado")}</span>
      `;
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

  const round = getRoundInfo(currentEvent);
  if (round.eventEnded) return toast("El evento ha terminado tras completar las 6 rondas.");
  const myVoteRef = ref(db, `events/${currentEventCode}/votesByRound/${round.roundKey}/${uid}`);
  const existing = await get(myVoteRef);
  if (existing.exists()) return toast("Ya has votado. Solo se permite un voto por ronda.");

  try {
    await set(myVoteRef, {
      targetUid,
      createdAt: nowMs()
    });
    toast("Voto registrado. Te avisaremos si hay coincidencia mutua.");

    const reciprocal = await get(ref(db, `events/${currentEventCode}/votesByRound/${round.roundKey}/${targetUid}`));
    if (reciprocal.exists() && reciprocal.val().targetUid === uid) {
      await createPrivateMatchNotice(targetUid, targetName, participants, round.roundKey);
    }
  } catch (error) {
    console.error("Error votando:", error);
    toast("No se pudo registrar el voto. Revisa las reglas de Firebase.");
  }
}

async function createPrivateMatchNotice(targetUid, targetName, participants, roundKey = "1") {
  const pair = pairKey(uid, targetUid);
  const key = `${roundKey}_${pair}`;
  const pairRef = ref(db, `events/${currentEventCode}/matchPairsByRound/${roundKey}/${pair}`);
  const tx = await runTransaction(pairRef, currentValue => currentValue || true);
  if (!tx.committed) return;

  await update(ref(db), {
    [`privateMatches/${currentEventCode}/${uid}/${key}`]: {
      withUid: targetUid,
      withName: targetName,
      round: roundKey,
      createdAt: nowMs()
    },
    [`privateMatches/${currentEventCode}/${targetUid}/${key}`]: {
      withUid: uid,
      withName: currentParticipantName || participants?.[uid]?.name || "otra persona",
      round: roundKey,
      createdAt: nowMs()
    },
    [`chats/${currentEventCode}/${key}/members/${uid}`]: true,
    [`chats/${currentEventCode}/${key}/members/${targetUid}`]: true,
    [`chats/${currentEventCode}/${key}/memberNames/${uid}`]: currentParticipantName || participants?.[uid]?.name || "Yo",
    [`chats/${currentEventCode}/${key}/memberNames/${targetUid}`]: targetName,
    [`chats/${currentEventCode}/${key}/round`]: roundKey,
    [`chats/${currentEventCode}/${key}/createdAt`]: nowMs()
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


function renderPrivateHistory(participants = {}, allVotesByRound = {}, round = getRoundInfo(currentEvent)) {
  const box = $("privateHistoryBox");
  const list = $("privateHistoryList");
  if (!box || !list) return;

  const amParticipant = Boolean(participants?.[uid]);
  box.classList.toggle("hidden", !amParticipant);
  if (!amParticipant) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = "";
  for (let i = 1; i <= TOTAL_ROUNDS; i += 1) {
    const roundVotes = allVotesByRound?.[String(i)] || {};
    const vote = roundVotes?.[uid];
    const isCurrent = i === Number(round.currentRound) && !round.eventEnded;
    const done = Boolean(vote?.targetUid);
    const item = document.createElement("div");
    item.className = "historyRound";
    item.innerHTML = `
      <div class="historyRoundNumber">${i}</div>
      <div>
        <strong>Ronda ${i}${isCurrent ? " · actual" : ""}</strong>
        <small>${done ? "Has votado en esta ronda." : i < Number(round.currentRound) || round.eventEnded ? "No consta voto en esta ronda." : "Pendiente."}</small>
      </div>
      <span class="historyBadge ${done ? "done" : "pending"}">${done ? "Votada" : "Sin voto"}</span>
    `;
    list.appendChild(item);
  }
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

function safeMessageText(value = "") {
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

function chatMessageKey() {
  return `${Date.now()}_${uid || "anon"}_${Math.random().toString(36).slice(2, 8)}`;
}

function renderChatMessages(messages = {}, withName = "") {
  const list = $("matchChatMessages");
  if (!list) return;
  const entries = Object.entries(messages || {})
    .map(([id, msg]) => ({ id, ...msg }))
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

  if (!entries.length) {
    list.innerHTML = `<p class="muted chatEmpty">Aún no hay mensajes. Puedes empezar con un saludo discreto.</p>`;
    return;
  }

  list.innerHTML = "";
  entries.forEach(msg => {
    const mine = msg.senderUid === uid;
    const row = document.createElement("div");
    row.className = `chatMessage ${mine ? "mine" : "theirs"}`;
    row.innerHTML = `
      <div class="chatBubble">
        <small>${mine ? "Tú" : escapeHtml(withName || "Match")}</small>
        <p>${escapeHtml(msg.text || "")}</p>
      </div>
    `;
    list.appendChild(row);
  });
  list.scrollTop = list.scrollHeight;
}

function subscribeToMatchChat(matchKey = "", withName = "") {
  if (activeChatUnsubscribe) activeChatUnsubscribe();
  activeChatUnsubscribe = null;
  if (!currentEventCode || !matchKey || !uid) return;

  activeChatUnsubscribe = onValue(ref(db, `chats/${currentEventCode}/${matchKey}/messages`), (snap) => {
    renderChatMessages(snap.val() || {}, withName);
  });
}

async function sendMatchChatMessage(matchKey = "") {
  const input = $("matchChatInput");
  const text = safeMessageText(input?.value || "");
  if (!currentEventCode || !matchKey || !uid) return;
  if (!text) return toast("Escribe un mensaje antes de enviar.");

  try {
    const msgKey = chatMessageKey();
    await set(ref(db, `chats/${currentEventCode}/${matchKey}/messages/${msgKey}`), {
      senderUid: uid,
      senderName: currentParticipantName || currentEvent?.participants?.[uid]?.name || "Yo",
      text,
      createdAt: Date.now()
    });
    input.value = "";
  } catch (error) {
    console.error("Error enviando mensaje privado:", error);
    toast("No se pudo enviar el mensaje. Revisa las reglas de Firebase.");
  }
}


function renderMyMatches() {
  const box = $("myMatchesBox");
  const list = $("myMatchesList");
  if (!box || !list) return;

  const entries = Object.entries(knownPrivateMatches || {})
    .filter(([, notice]) => notice?.withName)
    .sort(([, a], [, b]) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  box.classList.toggle("hidden", entries.length === 0);
  list.innerHTML = "";

  if (!entries.length) return;

  entries.forEach(([matchKey, notice]) => {
    const item = document.createElement("div");
    item.className = "matchListItem";
    const roundText = notice.round ? `Ronda ${notice.round}` : "Match privado";
    item.innerHTML = `
      <span>
        <strong>${escapeHtml(notice.withName || "Match")}</strong>
        <small>${escapeHtml(roundText)} · chat privado disponible</small>
      </span>
      <button type="button" class="btn secondary small">Abrir chat</button>
    `;
    item.querySelector("button")?.addEventListener("click", () => {
      showMatch(notice.withName, matchKey, notice.withUid, true);
    });
    list.appendChild(item);
  });
}


function showMatch(withName, matchKey = "", withUid = "", reopened = false) {
  if (!withName) return;
  const box = $("matchAlert");
  box.classList.remove("hidden");
  box.innerHTML = `
    <h3>${reopened ? "💬 Chat privado" : "✨ Match privado"}</h3>
    <p>Tú y <strong>${escapeHtml(withName)}</strong> os habéis elegido mutuamente.</p>
    <p>Ahora podéis usar este chat privado. Solo las dos personas del match pueden leer y escribir aquí.</p>

    <div class="matchChat" aria-label="Chat privado del match">
      <div id="matchChatMessages" class="matchChatMessages">
        <p class="muted chatEmpty">Cargando chat privado...</p>
      </div>
      <div class="quickReactions">
        <button type="button" class="btn ghost quickReaction" data-message="👋 Hola, me alegra el match.">👋 Hola</button>
        <button type="button" class="btn ghost quickReaction" data-message="☕ ¿Tomamos algo?">☕ ¿Tomamos algo?</button>
        <button type="button" class="btn ghost quickReaction" data-message="😊 Me alegra el match.">😊 Me alegra</button>
      </div>
      <div class="matchChatForm">
        <input id="matchChatInput" type="text" maxlength="500" placeholder="Escribe un mensaje privado..." autocomplete="off" />
        <button id="sendMatchChat" class="btn primary small" type="button">Enviar</button>
      </div>
      <p class="muted chatPrivacy">Chat privado entre las dos personas del match. Mensajes visibles solo dentro de este evento.</p>
    </div>

    <div class="match-actions">
      <button id="closeMatch" class="btn secondary" type="button">Cerrar</button>
      ${matchKey ? `<button id="ackMatch" class="btn ghost" type="button">Cerrar y mantener chat</button>` : ""}
    </div>
  `;

  subscribeToMatchChat(matchKey, withName);

  document.querySelectorAll(".quickReaction").forEach(button => {
    button.addEventListener("click", () => {
      const input = $("matchChatInput");
      if (input) input.value = button.dataset.message || "";
      sendMatchChatMessage(matchKey);
    });
  });
  $("sendMatchChat")?.addEventListener("click", () => sendMatchChatMessage(matchKey));
  $("matchChatInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMatchChatMessage(matchKey);
  });

  $("closeMatch")?.addEventListener("click", () => {
    box.classList.add("hidden");
    if (activeChatUnsubscribe) activeChatUnsubscribe();
    activeChatUnsubscribe = null;
    toast("Chat cerrado. Puedes reabrirlo desde “Tus matches”.");
  });

  $("ackMatch")?.addEventListener("click", () => {
    box.classList.add("hidden");
    if (activeChatUnsubscribe) activeChatUnsubscribe();
    activeChatUnsubscribe = null;
    toast("Chat cerrado. Puedes reabrirlo desde “Tus matches”.");
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


// MEJORA_DEFAULT_ENTRADA_ABIERTA
// Evita que el navegador restaure marcada la opción de cerrar entrada en ronda 2.
try {
  if ($("closeEntryRound2")) $("closeEntryRound2").checked = false;
} catch (_) {}


// MEJORA_MAX_PARTICIPANTES_67
// Valor por defecto para nuevos eventos.
try {
  const maxInput = $("maxParticipants");
  if (maxInput && (!maxInput.value || maxInput.value === "0" || maxInput.value === "8")) {
    maxInput.value = "67";
  }
} catch (_) {}


// MEJORA_ESTILOS_VISUALES_REPASADOS
// Los estilos visuales disponibles son:
// dark, passion, white, night y gold.

window.addEventListener("DOMContentLoaded", () => {
  bindInitialNavigation();
});

setTimeout(bindInitialNavigation, 0);

// SIXSEVEN_APP_READY_CONFIRMED
window.SIXSEVEN_APP_READY = true;
window.dispatchEvent(new CustomEvent("sixseven:ready"));
