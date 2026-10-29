/**
 * Génère une paire de clés VAPID pour les notifications push (aucune dépendance).
 *   node scripts/vapid-keys.mjs
 * - Clé publique : VITE_VAPID_PUBLIC_KEY (Netlify, .env.local) et secret VAPID_PUBLIC_KEY
 * - Clé privée   : secret VAPID_PRIVATE_KEY de la fonction Supabase (jamais dans le front)
 */
import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pub = publicKey.export({ format: 'jwk' })
const priv = privateKey.export({ format: 'jwk' })
const b64u = (s) => Buffer.from(s, 'base64url')

// Clé publique au format « point non compressé » (0x04 || x || y), en base64url
const raw = Buffer.concat([Buffer.from([4]), b64u(pub.x), b64u(pub.y)]).toString('base64url')
console.log(`VAPID_PUBLIC_KEY=${raw}`)
console.log(`VAPID_PRIVATE_KEY=${priv.d}`)
