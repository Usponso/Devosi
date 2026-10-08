import { defineStore } from 'pinia'
import { PICKABLE_TEAMS } from '@/data/teams'

const STORAGE_KEY = 'devosi:prefs'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

/** Préférences utilisateur persistées (écurie favorite) */
export const usePrefsStore = defineStore('prefs', {
  state: () => {
    const saved = load()
    return {
      favoriteTeamId: saved.favoriteTeamId ?? null,
      // Le sélecteur s'ouvre à la première visite
      pickerOpen: !saved.favoriteTeamId && !saved.skipped,
      skipped: Boolean(saved.skipped),
    }
  },

  getters: {
    favoriteTeam: (state) => PICKABLE_TEAMS.find((t) => t.id === state.favoriteTeamId) ?? null,
  },

  actions: {
    setFavoriteTeam(teamId) {
      this.favoriteTeamId = teamId
      this.pickerOpen = false
      this.persist()
    },

    skipPicker() {
      this.skipped = true
      this.pickerOpen = false
      this.persist()
    },

    persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ favoriteTeamId: this.favoriteTeamId, skipped: this.skipped }),
        )
      } catch {
        /* localStorage indisponible : préférence non conservée */
      }
    },
  },
})
