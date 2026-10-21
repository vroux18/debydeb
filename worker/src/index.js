// Serveur de rappels de Maille à maille (Cloudflare Worker).
// Stocke l'abonnement push et le planning, et envoie les rappels via un cron toutes les 15 minutes.

const TZ = 'Europe/Paris';

export default {
  async fetch(req, env) {
    const cors = {
      'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Maille à maille · rappels', { headers: cors });

    const path = new URL(req.url).pathname;
    let body;
    try { body = await req.json(); } catch { return new Response('JSON invalide', { status: 400, headers: cors }); }
    const id = String(body.id || '');
    if (!/^[\w-]{6,64}$/.test(id)) return new Response('id invalide', { status: 400, headers: cors });
    const key = `sub:${id}`;

    if (path === '/subscribe') {
      if (!body.sub || !body.sub.endpoint) return new Response('abonnement manquant', { status: 400, headers: cors });
      const prev = (await env.SUBS.get(key, 'json')) || {};
      await env.SUBS.put(key, JSON.stringify({ sub: body.sub, name: body.name, sessions: body.sessions || [], sent: prev.sent || {} }));
      return new Response('ok', { headers: cors });
    }
    const rec = await env.SUBS.get(key, 'json');
    if (!rec) return new Response('inconnu', { status: 404, headers: cors });

    if (path === '/sync') {
      rec.sessions = body.sessions || rec.sessions;
      rec.name = body.name || rec.name;
      await env.SUBS.put(key, JSON.stringify(rec));
      return new Response('ok', { headers: cors });
    }
    if (path === '/unsubscribe') {
      await env.SUBS.delete(key);
      return new Response('ok', { headers: cors });
    }
    if (path === '/test') {
      const res = await sendPush(env, rec.sub, { title: 'Maille à maille', body: 'Rappel test : tes aiguilles sont prêtes.', tag: 'test' });
      return new Response(String(res.status), { status: res.ok ? 200 : 502, headers: cors });
    }
    return new Response('introuvable', { status: 404, headers: cors });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(env));
  }
};

// ---------- Planification ----------
function parisNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
  }).formatToParts(new Date()).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, min: +parts.hour * 60 + +parts.minute, sunday: parts.weekday === 'Sun' };
}
const toMin = t => { const [h, m] = String(t || '18:30').split(':').map(Number); return h * 60 + (m || 0); };
const addDay = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

// Ce qu'il faut envoyer maintenant à cet abonnement (au plus un message par passage)
export function due(rec, now) {
  const S = rec.sessions || [];
  const sent = rec.sent || {};
  const name = rec.name || '';
  const todays = S.filter(s => s.date === now.date);
  const week = (todays[0] || S.find(s => s.date > now.date) || {}).week;
  const left = S.filter(s => s.week === week && !s.s).length;

  for (const s of todays) {
    if (s.s) continue;
    if (s.kind === 'race') {
      if (now.min >= 6 * 60 && now.min < 9 * 60 && !sent[`r:${s.id}`])
        return { key: `r:${s.id}`, msg: { title: 'C\'est aujourd\'hui.', body: `21,1 km. Pars prudente, finis forte. Le dernier rang t'attend après la ligne, ${name}.`, tag: s.id } };
      continue;
    }
    const t = toMin(s.time);
    if (now.min >= t - 30 && now.min < t + 60 && !sent[`r:${s.id}`])
      return { key: `r:${s.id}`, msg: { title: `${s.title} · ${s.time}`, body: `${s.detail}. Un rang de plus t'attend.`, tag: s.id, badge: left } };
    if (now.min >= 21 * 60 + 30 && now.min < 23 * 60 && !sent[`n:${s.id}`])
      return { key: `n:${s.id}`, msg: { title: 'Le rang du jour attend', body: 'Séance du jour faite ? Note-la pour la tricoter. Pas faite ? Pas grave, on ne rattrape pas.', tag: s.id, badge: left } };
  }

  const race = S.find(s => s.kind === 'race');
  if (race && !race.s && race.date === addDay(now.date, 1) && now.min >= 19 * 60 && now.min < 22 * 60 && !sent.eve)
    return { key: 'eve', msg: { title: 'Demain, 21,1 km', body: 'Tout est déjà dans les jambes. Ce soir : pâtes, dossard épinglé, et au lit tôt.', tag: 'eve' } };

  if (now.sunday && week && (!race || race.week !== week) && now.min >= 20 * 60 + 30 && now.min < 22 * 60 && !sent[`wk:${week}`]) {
    const done = S.filter(s => s.week === week && s.s === 'done').length;
    const body = done === 3 ? 'Trois rangs sur trois. Semaine parfaite.'
      : done === 2 ? 'Deux rangs sur trois. C\'est exactement ce que le plan demande les semaines chargées.'
      : done === 1 ? 'Un rang cette semaine. On repart lundi, sans rattraper.'
      : 'Semaine sans tricot. Ça arrive. Lundi, on reprend le patron là où il en est.';
    return { key: `wk:${week}`, msg: { title: `Bilan semaine ${week}`, body, tag: `wk${week}` } };
  }
  return null;
}

async function tick(env) {
  const now = parisNow();
  let cursor;
  do {
    const list = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const k of list.keys) {
      const rec = await env.SUBS.get(k.name, 'json');
      if (!rec) continue;
      const d = due(rec, now);
      if (!d) continue;
      const res = await sendPush(env, rec.sub, d.msg);
      if (res.status === 404 || res.status === 410) { await env.SUBS.delete(k.name); continue; }
      if (res.ok) {
        rec.sent = { ...(rec.sent || {}), [d.key]: now.date };
        await env.SUBS.put(k.name, JSON.stringify(rec));
      }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
}

// ---------- Web Push (RFC 8291 aes128gcm + VAPID RFC 8292) ----------
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const concat = (...a) => { const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

export async function encrypt(sub, payload) {
  const uaPublic = unb64u(sub.keys.p256dh);
  const auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));

  const ikm = await hkdf(auth, secret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plain = concat(enc.encode(payload), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain));

  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

async function vapidAuth(env, endpoint) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })));
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

async function sendPush(env, sub, msg) {
  const body = await encrypt(sub, JSON.stringify(msg));
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapidAuth(env, sub.endpoint),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: '14400',
      urgency: 'normal'
    },
    body
  });
}
