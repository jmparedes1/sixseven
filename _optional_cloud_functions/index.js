const { onValueCreated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

function pairKey(a, b) {
  return [a, b].sort().join("_");
}

exports.validateMatchOnVote = onValueCreated("/events/{code}/votes/{voterUid}", async (event) => {
  const code = event.params.code;
  const voterUid = event.params.voterUid;
  const vote = event.data.val();
  const targetUid = vote && vote.targetUid;

  if (!targetUid || targetUid === voterUid) return;

  const eventSnap = await db.ref(`/events/${code}`).get();
  const eventData = eventSnap.val();
  if (!eventData || eventData.status !== "open" || Date.now() > Number(eventData.expiresAt || 0)) return;

  const participants = eventData.participants || {};
  if (!participants[voterUid] || !participants[targetUid]) return;

  const reciprocalSnap = await db.ref(`/events/${code}/votes/${targetUid}`).get();
  const reciprocal = reciprocalSnap.val();
  if (!reciprocal || reciprocal.targetUid !== voterUid) return;

  const key = pairKey(voterUid, targetUid);
  const pairRef = db.ref(`/events/${code}/matchPairs/${key}`);
  const result = await pairRef.transaction((current) => current || true);
  if (!result.committed) return;

  await db.ref().update({
    [`/privateMatches/${code}/${voterUid}/${key}`]: {
      withUid: targetUid,
      withName: participants[targetUid].name || "otra persona",
      createdAt: admin.database.ServerValue.TIMESTAMP
    },
    [`/privateMatches/${code}/${targetUid}/${key}`]: {
      withUid: voterUid,
      withName: participants[voterUid].name || "otra persona",
      createdAt: admin.database.ServerValue.TIMESTAMP
    }
  });
});

exports.cleanupExpiredEvents = onSchedule("every 24 hours", async () => {
  const now = Date.now();
  const snap = await db.ref("/events").orderByChild("expiresAt").endAt(now).get();
  const updates = {};

  snap.forEach((child) => {
    const code = child.key;
    updates[`/events/${code}`] = null;
    updates[`/privateMatches/${code}`] = null;
  });

  if (Object.keys(updates).length) await db.ref().update(updates);
});
