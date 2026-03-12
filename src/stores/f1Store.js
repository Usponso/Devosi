import { defineStore } from 'pinia'
import {
  fetchDriverStandings,
  fetchConstructorStandings,
  fetchSeasonSchedule,
  fetchRaceResults,
} from '@/services/f1Api'

// Enrichissement des équipes avec des données statiques (non fournies par l'API)
const TEAM_META = {
  red_bull: {
    base: 'Milton Keynes, Royaume-Uni',
    principal: 'Christian Horner',
    engine: 'Honda RBPT',
    chassis: 'RB21',
    founded: 2005,
    championships: 6,
    bio: "L'écurie dominante de la décennie, Red Bull Racing redéfinit les standards de la Formule 1 moderne.",
  },
  mclaren: {
    base: 'Woking, Royaume-Uni',
    principal: 'Andrea Stella',
    engine: 'Mercedes',
    chassis: 'MCL39',
    founded: 1963,
    championships: 8,
    bio: 'Le grand retour de McLaren au sommet après des années de reconstruction.',
  },
  ferrari: {
    base: 'Maranello, Italie',
    principal: 'Frédéric Vasseur',
    engine: 'Ferrari',
    chassis: 'SF-25',
    founded: 1950,
    championships: 16,
    bio: "La Scuderia Ferrari, l'écurie la plus titrée de l'histoire, se bat pour son retour au sommet.",
  },
  mercedes: {
    base: 'Brackley, Royaume-Uni',
    principal: 'Toto Wolff',
    engine: 'Mercedes',
    chassis: 'W16',
    founded: 2010,
    championships: 8,
    bio: "L'empire Mercedes cherche à retrouver sa domination perdue.",
  },
  aston_martin: {
    base: 'Silverstone, Royaume-Uni',
    principal: 'Mike Krack',
    engine: 'Mercedes',
    chassis: 'AMR25',
    founded: 2021,
    championships: 0,
    bio: "L'Aston Martin Aramco Cognizant cherche à briller après des investissements massifs.",
  },
  williams: {
    base: 'Grove, Royaume-Uni',
    principal: 'James Vowles',
    engine: 'Mercedes',
    chassis: 'FW47',
    founded: 1977,
    championships: 7,
    bio: 'La reconstruction de Williams se poursuit sous la houlette de James Vowles.',
  },
  alpine: {
    base: 'Enstone, Royaume-Uni',
    principal: 'Oliver Oakes',
    engine: 'Renault',
    chassis: 'A525',
    founded: 1981,
    championships: 2,
    bio: "Alpine F1 Team, anciennement Renault, cherche à retrouver le devant de la scène.",
  },
  rb: {
    base: 'Faenza, Italie',
    principal: 'Laurent Mekies',
    engine: 'Honda RBPT',
    chassis: 'VCARB 02',
    founded: 2006,
    championships: 0,
    bio: "L'équipe sœur de Red Bull, anciennement AlphaTauri, se reconstruit avec de jeunes talents.",
  },
  sauber: {
    base: 'Hinwil, Suisse',
    principal: 'Mattia Binotto',
    engine: 'Ferrari',
    chassis: 'C45',
    founded: 1993,
    championships: 0,
    bio: "Sauber prépare sa transition vers Audi en 2026, avec un effectif de jeunes pilotes prometteurs.",
  },
  haas: {
    base: 'Kannapolis, États-Unis',
    principal: 'Ayao Komatsu',
    engine: 'Ferrari',
    chassis: 'VF-25',
    founded: 2016,
    championships: 0,
    bio: "Haas F1 Team, la seule équipe américaine du paddock, vise le milieu de grille.",
  },
}

// Bios des pilotes (non fournis par l'API Ergast)
const DRIVER_BIOS = {
  max_verstappen: 'Quadruple champion du monde, Max Verstappen est l\'un des pilotes les plus complets de l\'histoire de la F1.',
  norris: 'Talent générationnel chez McLaren, Lando Norris monte en puissance et vise le titre mondial.',
  piastri: 'Rookie de l\'année 2023, Oscar Piastri confirme son statut de futur champion.',
  leclerc: 'Le porte-drapeau de Ferrari, Charles Leclerc allie vitesse pure et technique irréprochable.',
  russell: 'Leader de Mercedes, George Russell est méthodique et régulier dans sa quête du podium.',
  hamilton: 'Septuple champion du monde, Lewis Hamilton rejoint Ferrari pour écrire le dernier chapitre de sa légende.',
  antonelli: 'La nouvelle pépite Mercedes, Andrea Kimi Antonelli impressionne à seulement 18 ans en F1.',
  albon: 'Alexander Albon est devenu un pillar de Williams, apportant expérience et régularité.',
  sainz: 'Vainqueur à Singapour, Carlos Sainz apporte son expérience précieuse chez Williams.',
  alonso: 'Double champion du monde, Fernando Alonso continue de défier le temps avec une passion intacte.',
  hulkenberg: 'Nico Hülkenberg, l\'un des pilotes les plus expérimentés du paddock, guide la jeune Sauber.',
  hadjar: 'Isack Hadjar, l\'un des plus grands espoirs français, fait ses débuts remarqués en F1.',
  bearman: 'Oliver Bearman confirme son talent exceptionnel chez Haas après son remplacement remarqué chez Ferrari.',
  lawson: 'Liam Lawson, le talent néo-zélandais, impose son style agressif en F1.',
  ocon: 'Esteban Ocon, solide et régulier, retrouve de l\'allant chez Haas.',
  stroll: 'Lance Stroll poursuit sa progression chez Aston Martin.',
  tsunoda: 'Yuki Tsunoda, le poivre de la grille, apporte de l\'énergie et de la vitesse chez RB.',
  gasly: 'Pierre Gasly, le Nordiste de la F1, vise le top avec Alpine.',
  bortoleto: 'Gabriel Bortoleto, champion de F2, fait ses débuts fracassants chez Sauber.',
  colapinto: 'Franco Colapinto, le prometteur Argentin, cherche à s\'imposer en F1.',
  doohan: 'Jack Doohan, fils de champion MotoGP, vise à marquer ses premiers points en F1.',
}

// Année courante pour le select (2026 = saison en cours, mais données dispo jusqu'en 2025)
const DEFAULT_SEASON = 'current'

export const useF1Store = defineStore('f1', {
  state: () => ({
    drivers: [],          // classement pilotes (avec points, team, etc.)
    teams: [],            // classement constructeurs
    races: [],            // calendrier de la saison
    news: [],             // actualités (statiques pour l'instant)
    loading: false,
    error: null,
    lastFetch: null,
    selectedDriver: null,
    selectedTeam: null,
    selectedRace: null,
    season: DEFAULT_SEASON,   // 'current' ou une année ex: '2023'
    seasonYear: new Date().getFullYear() - 1, // année réelle affichée (défaut: dernière saison complète)
  }),

  getters: {
    driverStandings: (state) => [...state.drivers].sort((a, b) => b.points - a.points),
    teamStandings: (state) => [...state.teams].sort((a, b) => b.points - a.points),
    completedRaces: (state) => state.races.filter((r) => r.completed),
    upcomingRaces: (state) => state.races.filter((r) => !r.completed),
    nextRace: (state) => state.races.find((r) => !r.completed),
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
      this.seasonYear = newSeason === 'current' ? new Date().getFullYear() - 1 : parseInt(newSeason)

      // Réinitialiser les données
      this.drivers = []
      this.teams = []
      this.races = []
      this.error = null

      await this.loadData()
    },

    /**
     * Charge toutes les données depuis l'API Ergast
     */
    async loadData() {
      if (this.loading) return
      this.loading = true
      this.error = null

      try {
        // Récupération en parallèle des standings et du calendrier
        const [driverStandings, constructorStandings, schedule] = await Promise.all([
          fetchDriverStandings(this.season),
          fetchConstructorStandings(this.season),
          fetchSeasonSchedule(this.season),
        ])

        // On récupère l'année réelle depuis les données (en cas de 'current')
        if (schedule.length && schedule[0].season) {
          this.seasonYear = parseInt(schedule[0].season)
        }

        // Enrichissement des pilotes avec les bios
        this.drivers = driverStandings.map((d) => ({
          ...d,
          bio: DRIVER_BIOS[d.id] ?? '',
        }))

        // Enrichissement des équipes avec les métadonnées statiques
        this.teams = constructorStandings.map((t) => ({
          ...t,
          ...(TEAM_META[t.id] ?? {}),
        }))

        // Calendrier : on marque les courses passées et on enrichit avec résultats
        const today = new Date()
        const racesWithStatus = schedule.map((race) => {
          const raceDate = new Date(race.date)
          // Petite tolérance : une course est "terminée" si la date est passée d'au moins 8h
          raceDate.setHours(raceDate.getHours() + 8)
          return { ...race, completed: raceDate < today }
        })

        this.races = racesWithStatus

        // Charge les résultats des courses terminées (évite le flood sur les saisons complètes)
        this.loadRaceResults()

        this.lastFetch = Date.now()
      } catch (err) {
        console.error('[F1Store] Erreur lors du chargement :', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Charge les résultats des courses terminées en arrière-plan
     */
    async loadRaceResults() {
      const completedRaces = this.races.filter((r) => r.completed && !r.results?.length)

      for (const race of completedRaces) {
        try {
          const withResults = await fetchRaceResults(this.season, race.round)
          if (withResults) {
            const idx = this.races.findIndex((r) => r.id === race.id)
            if (idx !== -1) {
              this.races[idx] = withResults
              this.recalculateSeasonStats()
            }
          }
          // Pause de 500ms entre chaque requête pour éviter l'erreur 429 Too Many Requests de l'API Ergast
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (err) {
          console.warn(`[F1Store] Résultats non disponibles pour la course ${race.round}`, err)
        }
      }
    },

    /**
     * Recalcule les podiums et les poles de la saison en cours à partir des résultats récupérés
     */
    recalculateSeasonStats() {
      // Remise à zéro pour garantir un recomptage propre (idempotence)
      for (const d of this.drivers) {
        d.podiums = 0
        d.poles = 0
      }
      for (const t of this.teams) {
        t.podiums = 0
        t.poles = 0
      }

      for (const race of this.races) {
        if (!race.results || race.results.length === 0) continue
        for (const res of race.results) {
          const driver = this.drivers.find(d => d.id === res.driverId)
          if (driver) {
            if (res.pos <= 3) driver.podiums++
            if (res.grid === 1) driver.poles++
          }
          const team = this.teams.find(t => t.id === res.constructorId)
          if (team) {
            if (res.pos <= 3) team.podiums++
            if (res.grid === 1) team.poles++
          }
        }
      }
    },

    /**
     * Charge les résultats d'une course spécifique
     */
    async loadRaceDetail(raceId) {
      const race = this.races.find((r) => r.id === raceId)
      if (!race) return

      if (race.results?.length) return // Déjà chargé

      try {
        const withResults = await fetchRaceResults(this.season, race.round)
        if (withResults) {
          const idx = this.races.findIndex((r) => r.id === raceId)
          if (idx !== -1) {
            this.races[idx] = withResults
            this.recalculateSeasonStats()
          }
        }
      } catch (err) {
        console.warn('[F1Store] Impossible de charger les résultats :', err)
      }
    },

    // ------------------------------------------------------------------
    // Getters par ID
    // ------------------------------------------------------------------

    getDriverById(id) {
      // Support des deux types : string (API) et number (legacy)
      return this.drivers.find((d) => d.id === id || d.id === String(id))
    },

    getTeamById(id) {
      return this.teams.find((t) => t.id === id || t.id === String(id))
    },

    getDriversByTeam(teamId) {
      return this.drivers.filter((d) => d.teamId === teamId || d.teamId === String(teamId))
    },

    getRaceById(id) {
      return this.races.find((r) => r.id === parseInt(id))
    },
  },
})
