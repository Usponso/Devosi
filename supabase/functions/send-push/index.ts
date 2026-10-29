/**
 * Envoi des notifications push (Web Push) : met les rappels planifiés dans la file,
 * récupère les notifications à envoyer et les pousse sur chaque appareil abonné.
 * Les abonnements expirés (404 / 410) sont supprimés.
 *
 * Appelée par la base : pg_cron toutes les 5 min et pg_net pour les envois immédiats,
 * avec l'en-tête `Authorization: Bearer <PUSH_SECRET>`.
 *
 * Secrets (supabase secrets set) : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
 * PUSH_SECRET. SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

type Subscription = { endpoint: string; p256dh: string; auth: string }
type Notification = { id: number; title: string; body: string; url: string; tag: string; subscriptions: Subscription[] }

const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Secret manquant : ${name}`)
  return value
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${env('PUSH_SECRET')}`) {
    return new Response('Non autorisé', { status: 401 })
  }

  webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

  const queued = await db.rpc('queue_scheduled_notifications')
  if (queued.error) console.error('[push] file', queued.error.message)

  const { data, error } = await db.rpc('claim_notifications', { p_limit: 200 })
  if (error) return new Response(error.message, { status: 500 })

  const expired: string[] = []
  let sent = 0
  await Promise.all(
    (data as Notification[]).flatMap((n) =>
      n.subscriptions.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: n.tag }),
            { TTL: 6 * 3600, urgency: n.tag === 'social' ? 'high' : 'normal' },
          )
          sent++
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) expired.push(s.endpoint)
          else console.error('[push] envoi', status, (err as Error).message)
        }
      }),
    ),
  )

  if (expired.length) await db.rpc('remove_push_subscriptions', { p_endpoints: expired })
  return Response.json({ notifications: data.length, sent, expired: expired.length })
})
