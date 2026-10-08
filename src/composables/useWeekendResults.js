import { onUnmounted, ref, watch } from 'vue'
import { findWeekendSessions, fetchSessionDrivers, fetchSessionResult } from '@/services/openf1'
import { useF1Store } from '@/stores/f1Store'
import { getTeamColor } from '@/data/teams'
import { weekendSessions } from '@/utils/race'

const POLL_MS = 60 * 1000
const HOUR = 60 * 60 * 1000

/**
 * Résultats des séances d'un week-end via OpenF1 (essais libres, qualifs, sprint, course).
 * OpenF1 publie les classements à la fin de chaque séance : tant qu'une séance est en cours
 * ou vient de se terminer sans résultat, on réinterroge l'API chaque minute.
 *
 * @param {import('vue').Ref<object|null>} raceRef - course au format interne
 * @param {(race: object) => string[]} [keysFor] - séances à charger (par défaut : toutes sauf la course)
 * @returns {{ sessions: Ref<Array>, loading: Ref<boolean> }}
 *   sessions : [{ key, label, short, start, end, status: 'upcoming'|'live'|'done', rows: [...] }]
 */
export function useWeekendResults(raceRef, keysFor = () => ['fp1', 'fp2', 'fp3', 'sprintQualifying', 'sprint', 'qualifying']) {
  const store = useF1Store()
  const sessions = ref([])
  const loading = ref(false)
  let timer = null
  let currentId = null

  /** Pilote de la saison (classement Jolpica) ou, à défaut, infos OpenF1 (pilotes de réserve en EL) */
  function enrich(row, openf1Drivers) {
    const driver = store.drivers.find((d) => d.number === row.number)
    const o = openf1Drivers?.get(row.number)
    return {
      ...row,
      driverId: driver?.id ?? null,
      code: driver?.shortName ?? o?.code ?? String(row.number),
      name: driver?.name ?? o?.code ?? `#${row.number}`,
      team: driver?.team ?? o?.team ?? '',
      teamId: driver?.teamId ?? null,
      color: driver?.color ?? o?.color ?? getTeamColor(null),
    }
  }

  async function load() {
    const race = raceRef.value
    if (!race) return
    const raceId = race.id
    loading.value = !sessions.value.length

    try {
      const labels = Object.fromEntries(weekendSessions(race).map((s) => [s.key, s]))
      const keys = keysFor(race)
      const found = (await findWeekendSessions(race)).filter((s) => keys.includes(s.key))
      const now = Date.now()

      const withResults = await Promise.all(
        found.map(async (s) => {
          const status = s.end.getTime() < now ? 'done' : s.start.getTime() <= now ? 'live' : 'upcoming'
          let rows = []
          if (status !== 'upcoming') {
            const [result, drivers] = await Promise.all([
              fetchSessionResult(s),
              // Liste des pilotes encore mouvante juste après la séance : cache court
              fetchSessionDrivers(s.sessionKey, now - s.end.getTime() > 6 * HOUR ? undefined : POLL_MS).catch(() => null),
            ])
            rows = result.map((r) => enrich(r, drivers))
          }
          return {
            ...s,
            label: labels[s.key]?.label ?? s.key,
            short: labels[s.key]?.short ?? s.key,
            status,
            rows,
          }
        }),
      )

      if (raceRef.value?.id !== raceId) return
      sessions.value = withResults.sort((a, b) => a.start - b.start)
    } catch (err) {
      console.warn('[Weekend] Séances OpenF1 indisponibles :', err)
    } finally {
      loading.value = false
      schedulePoll()
    }
  }

  /** Relance tant qu'une séance est en cours ou fraîchement terminée sans classement */
  function schedulePoll() {
    clearTimeout(timer)
    const now = Date.now()
    const pending = sessions.value.some(
      (s) => s.status === 'live' || (s.status === 'done' && !s.rows.length && now - s.end.getTime() < 3 * HOUR),
    )
    const startsSoon = sessions.value.some((s) => s.status === 'upcoming' && s.start.getTime() - now < POLL_MS)
    if (pending || startsSoon) timer = setTimeout(load, POLL_MS)
  }

  watch(
    () => raceRef.value?.id,
    (id) => {
      if (id === currentId) return
      currentId = id
      sessions.value = []
      clearTimeout(timer)
      load()
    },
    { immediate: true },
  )

  onUnmounted(() => clearTimeout(timer))

  return { sessions, loading }
}
