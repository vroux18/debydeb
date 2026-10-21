// Génère la paire de clés VAPID pour les notifications push.
// Usage : node tools/vapid.mjs
const { subtle } = globalThis.crypto;
const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
const pub = Buffer.from(raw).toString('base64url');
const jwk = await subtle.exportKey('jwk', kp.privateKey);
console.log('Clé publique (config.js > vapidPublicKey et secret VAPID_PUBLIC_KEY) :\n' + pub + '\n');
console.log('Clé privée (secret VAPID_PRIVATE_JWK, à ne jamais publier) :\n' + JSON.stringify(jwk));
