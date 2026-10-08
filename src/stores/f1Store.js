import { defineStore } from 'pinia'
import {
  fetchDriverStandings,
  fetchConstructorStandings,
  fetchSeasonSchedule,
  fetchSeasonResults,
  fetchSeasonSprints,
  fetchSeasonQualifying,
} from '@/services/jolpica'
import { TEAM_META, DRIVER_BIOS } from '@/data/teams'
import { applySeasonCounts } from '@/utils/stats'
import { toDate } from '@/utils/race'

const CURRENT_YEAR = new Date().getFullYear()

export const useF1Store = defineStore('f1', {
  state: () => ({
    drivers: [],          // classement pilotes
    teams: [],            // classement constructeurs
    races: [],            // calendrier enrichi des résultats
    news: [],             // actualités (section masquée pour l'instant)
    loading: false,
    resultsLoading: false,
    error: null,
    lastFetch: null,
    standingsRound: 0,    // manche à laquelle correspond le classement
    season: 'current',    // 'current' ou une année ex: '2023'
    seasonYear: CURRENT_YEAR,
  }),

  getters: {
    driverStandings: (state) => [...state.drivers].sort((a, b) => a.position - b.position || b.points - a.points),
    teamStandings: (state) => [...state.teams].sort((a, b) => a.position - b.position || b.points - a.points),
    completedRaces: (state) => state.races.filter((r) => r.completed),
    upcomingRaces: (state) => state.races.filter((r) => !r.completed),
    nextRace: (state) => state.races.find((r) => !r.completed) ?? null,
    lastRace() {
      const done = this.completedRaces
      return done[done.length - 1] ?? null
    },
    isCurrentSeason: (state) => state.seasonYear === CURRENT_YEAR,
    featuredNews: (state) => state.news.filter((n) => n.featured),
  },

  actions: {
    /**
     * Change la saison et recharge toutes les données
     * @param {string|number} year - Année (ex: 2023) ou 'current'
     */
    async changeSeason(year) {
      const newSeason = String(year)
      if (newSeason === this.season && this.drivers.length) return

      this.season = newSeason
      this.seasonYear = newSeason === 'current' ? CURRENT_YEAR : parseInt(newSeason)
      this.drivers = []
      this.teams = []
      this.races = []
      this.error = null

      await this.loadData()
    },

    /**
     * Charge classements + calendrier (bloquant), puis les résultats groupés de la saison.
     */
    async loadData() {
      if (this.loading) return
      this.loading = true
      this.error = null
      const season = this.season

      try {
        const [driverData, constructorStandings, schedule] = await Promise.all([
          fetchDriverStandings(season),
          fetchConstructorStandings(season),
          fetchSeasonSchedule(season),
        ])
        if (season !== this.season) return

        if (schedule.length) this.seasonYear = schedule[0].season
        const withMeta = this.seasonYear === CURRENT_YEAR

        this.standingsRound = driverData.round
        this.drivers = driverData.standings.map((d) => ({ ...d, bio: withMeta ? DRIVER_BIOS[d.id] ?? '' : '' }))
        this.teams = constructorStandings.map((t) => ({ ...t, ...(withMeta ? TEAM_META[t.id] ?? {} : {}) }))
        // Statut provisoire basé sur le classement, affiné dès que les résultats arrivent
        this.races = schedule.map((race) => ({ ...race, completed: race.round <= driverData.round }))
        this.lastFetch = Date.now()
      } catch (err) {
        console.error('[F1Store] Erreur lors du chargement :', err)
        this.error = err.message
        return
      } finally {
        this.loading = false
      }

      await this.loadSeasonResults()
    },

    /** Résultats de course, sprints et qualifs de toute la saison en quelques requêtes */
    async loadSeasonResults() {
      const season = this.season
      this.resultsLoading = true
      try {
        const [results, sprints, qualifying] = await Promise.all([
          fetchSeasonResults(season),
          fetchSeasonSprints(season).catch(() => new Map()),
          fetchSeasonQualifying(season).catch(() => new Map()),
        ])
        if (season !== this.season) return

        const now = new Date()
        this.races = this.races.map((race) => {
          const raceResults = results.get(race.round) ?? []
          return {
            ...race,
            results: raceResults,
            sprintResults: sprints.get(race.round) ?? [],
            qualifyingResults: qualifying.get(race.round) ?? [],
            // Terminée = résultats publiés (ou date largement passée si l'API n'est pas encore à jour)
            completed: raceResults.length > 0 || (race.completed && toDate(race.date, race.time) < now),
            laps: raceResults[0]?.laps ?? 0,
          }
        })
        this.syncCurrentTeams()
        applySeasonCounts(this.drivers, this.teams, this.races)
      } catch (err) {
        console.warn('[F1Store] Résultats de la saison indisponibles :', err)
      } finally {
        this.resultsLoading = false
      }
    },

    /**
     * Écurie actuelle d'un pilote = celle de sa dernière course disputée
     * (le classement liste toutes ses écuries de la saison, sans ordre fiable).
     */
    syncCurrentTeams() {
      const latest = new Map()
      for (const race of this.races) {
        for (const res of race.results) latest.set(res.driverId, res)
      }
      for (const driver of this.drivers) {
        const res = latest.get(driver.id)
        if (!res || res.constructorId === driver.teamId) continue
        driver.teamId = res.constructorId
        driver.team = res.constructor
        driver.color = res.color
      }
    },

    // ------------------------------------------------------------------
    // Accès par ID
    // ------------------------------------------------------------------

    getDriverById(id) {
      return this.drivers.find((d) => d.id === String(id))
    },

    getTeamById(id) {
      return this.teams.find((t) => t.id === String(id))
    },

    getDriversByTeam(teamId) {
      return this.driverStandings.filter((d) => d.teamId === String(teamId))
    },

    getRaceById(id) {
      return this.races.find((r) => r.id === parseInt(id))
    },
  },
})
