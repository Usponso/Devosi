<template>
  <div class="home">
    <!-- Hero Next Race -->
    <section class="hero" v-if="store.nextRace">
      <div class="hero-bg">
        <div class="hero-lines">
          <div class="hline" v-for="i in 8" :key="i" :style="{ animationDelay: `${i * 0.3}s` }"></div>
        </div>
      </div>
      <div class="container hero-content">
        <div class="hero-label">
          <span class="badge badge-red">
            <span>●</span> Prochain Grand Prix
          </span>
        </div>
        <h1 class="hero-title font-display">{{ store.nextRace.name }}</h1>
        <div class="hero-meta">
          <div class="hero-flag">
            <img v-if="store.nextRace.flag.includes('http')" :src="store.nextRace.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" />
            <span v-else>{{ store.nextRace.flag }}</span>
          </div>
          <div class="hero-info">
            <div class="hero-circuit">{{ store.nextRace.circuit }}</div>
            <div class="hero-date">{{ formatDate(store.nextRace.date) }}</div>
          </div>
        </div>

        <div class="hero-countdown" v-if="countdown">
          <div class="countdown-block" v-for="(val, unit) in countdown" :key="unit">
            <span class="countdown-num font-display">{{ val }}</span>
            <span class="countdown-unit">{{ unit }}</span>
          </div>
        </div>

        <div class="hero-details">
          <!-- <div class="hero-detail">
            <span class="detail-icon">⬡</span>
            <span class="detail-label">Tours</span>
            <span class="detail-val font-mono">{{ store.nextRace.laps > 0 ? store.nextRace.laps : '—' }}</span>
          </div>
          <div class="hero-detail">
            <span class="detail-icon">◎</span>
            <span class="detail-label">Distance</span>
            <span class="detail-val font-mono">{{ store.nextRace.distance || '—' }}</span>
          </div> -->
          <div class="hero-detail">
            <span class="detail-icon">◈</span>
            <span class="detail-label">Course</span>
            <span class="detail-val font-mono">#{{ store.nextRace.round }}/{{ store.races.length }}</span>
          </div>
        </div>

        <router-link :to="`/season/${store.nextRace.id}`" class="hero-cta">
          Voir le Grand Prix <span>→</span>
        </router-link>
      </div>
    </section>

    <section class="section container" v-else>

    </section>

    <!-- Season Progress -->
    <section class="section container">
      <div class="section-header">
        <h2 class="section-title font-display">Saison {{ store.seasonYear }}</h2>
        <router-link to="/season" class="section-link">Calendrier complet →</router-link>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: seasonProgress + '%' }"></div>
        </div>
        <div class="progress-info">
          <span class="font-mono text-dim">{{ store.completedRaces.length }} / {{ store.races.length }} courses</span>
          <span class="font-mono text-red">{{ seasonProgress }}%</span>
        </div>
      </div>
    </section>

    <!-- Driver Standings Preview -->
    <section class="section container">
      <div class="section-header">
        <h2 class="section-title font-display">Classement Pilotes</h2>
        <router-link to="/drivers" class="section-link">Tout voir →</router-link>
      </div>
      <div class="standings-list">
        <router-link
          v-for="(driver, idx) in store.driverStandings.slice(0, 5)"
          :key="driver.id"
          :to="`/drivers/${driver.id}`"
          class="standing-row card card-clickable"
          :style="{ '--team-color': driver.color }"
        >
          <div class="standing-pos" :class="`pos-${idx + 1}`">
            <span v-if="idx < 3">{{ ['①','②','③'][idx] }}</span>
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <div class="standing-flag">
            <img v-if="driver.flag.includes('http')" :src="driver.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle;" />
            <span v-else>{{ driver.flag }}</span>
          </div>
          <div class="standing-info">
            <div class="standing-name">{{ driver.name }}</div>
            <div class="standing-team" :style="{ color: driver.color }">{{ driver.team }}</div>
          </div>
          <div class="standing-wins">
            <span class="wins-val">{{ driver.wins }}</span>
            <span class="wins-label">Victoires</span>
          </div>
          <div class="standing-pts">
            <span class="pts-val font-display">{{ driver.points }}</span>
            <span class="pts-label">PTS</span>
          </div>
          <div class="standing-bar-wrap">
            <div class="standing-bar" :style="{ width: (driver.points / store.driverStandings[0].points * 100) + '%', background: driver.color }"></div>
          </div>
        </router-link>
      </div>
    </section>

    <!-- Last Race Result -->
    <section class="section container" v-if="lastRace">
      <div class="section-header">
        <h2 class="section-title font-display">Dernier Grand Prix</h2>
        <router-link :to="`/season/${lastRace.id}`" class="section-link">Détails →</router-link>
      </div>
      <div class="last-race card">
        <div class="last-race-header">
          <div class="last-race-flag">
            <img v-if="lastRace.flag.includes('http')" :src="lastRace.flag" style="width: 1.33em; height: 1em; object-fit: cover; border-radius: 0.15em; vertical-align: middle; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" />
            <span v-else>{{ lastRace.flag }}</span>
          </div>
          <div>
            <div class="last-race-name font-display">{{ lastRace.name }}</div>
            <div class="last-race-date text-muted">{{ formatDate(lastRace.date) }} · {{ lastRace.circuit }}</div>
          </div>
        </div>
        <div class="podium">
          <div class="podium-row" v-for="(r, i) in lastRace.results.slice(0, 3)" :key="i">
            <div class="podium-pos font-display" :class="`pos-${i + 1}`">P{{ i + 1 }}</div>
            <div class="podium-driver">
              <span class="podium-code font-mono">{{ r.driver }}</span>
              <span class="podium-name">{{ getDriverByCode(r.driver)?.name }}</span>
            </div>
            <div class="podium-time font-mono text-dim">{{ r.time }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Team Standings Preview -->
    <section class="section container">
      <div class="section-header">
        <h2 class="section-title font-display">Classement Constructeurs</h2>
        <router-link to="/teams" class="section-link">Tout voir →</router-link>
      </div>
      <div class="teams-grid">
        <router-link
          v-for="(team, idx) in store.teamStandings.slice(0, 4)"
          :key="team.id"
          :to="`/teams/${team.id}`"
          class="team-card card card-clickable"
          :style="{ '--tc': team.color }"
        >
          <div class="tc-accent" :style="{ background: team.color }"></div>
          <div class="tc-pos font-display">{{ idx + 1 }}</div>
          <div class="tc-name">{{ team.name }}</div>
          <div class="tc-pts font-display" :style="{ color: team.color }">{{ team.points }}</div>
          <div class="tc-label text-muted">PTS</div>
        </router-link>
      </div>
    </section>

    <!-- Latest News -->
    <section class="section container">
      <div class="section-header">
        <h2 class="section-title font-display">Dernières News</h2>
        <router-link to="/news" class="section-link">Tout voir →</router-link>
      </div>
      <div class="news-grid">
        <router-link
          v-for="article in store.featuredNews.slice(0, 2)"
          :key="article.id"
          to="/news"
          class="news-card card card-clickable"
        >
          <div class="news-cat badge badge-gray">{{ article.category }}</div>
          <div class="news-title">{{ article.title }}</div>
          <div class="news-summary text-dim">{{ article.summary }}</div>
          <div class="news-footer">
            <span class="text-muted font-mono" style="font-size:11px">{{ formatDate(article.date) }}</span>
            <span class="text-red" style="font-size:12px">{{ article.readTime }} →</span>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useF1Store } from '@/stores/f1Store'

const store = useF1Store()

const seasonProgress = computed(() => {
  if (!store.races.length) return 0
  return Math.round((store.completedRaces.length / store.races.length) * 100)
})

const lastRace = computed(() => {
  const completed = store.completedRaces
  return completed[completed.length - 1] || null
})

const getDriverByCode = (code) => store.drivers.find(d => d.shortName === code)

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Countdown
const countdown = ref(null)
let timer = null

const updateCountdown = () => {
  if (!store.nextRace) return
  const now = new Date()
  const target = new Date(store.nextRace.date)
  const diff = target - now
  if (diff <= 0) { countdown.value = null; return }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)
  countdown.value = { Jours: String(days).padStart(2, '0'), Heures: String(hours).padStart(2, '0'), Min: String(mins).padStart(2, '0'), Sec: String(secs).padStart(2, '0') }
}

onMounted(() => {
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
/* Hero */
.hero {
  position: relative;
  min-height: 520px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  background: radial-gradient(ellipse at 70% 50%, rgba(232, 0, 45, 0.08) 0%, transparent 70%);
  margin-top: 40px;
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-lines {
  position: absolute;
  inset: 0;
}

.hline {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(232,0,45,0.15) 30%, rgba(232,0,45,0.05) 60%, transparent 100%);
  animation: hlineMove 6s ease-in-out infinite;
}

.hline:nth-child(1) { top: 20%; }
.hline:nth-child(2) { top: 35%; }
.hline:nth-child(3) { top: 50%; }
.hline:nth-child(4) { top: 65%; }
.hline:nth-child(5) { top: 80%; }
.hline:nth-child(6) { top: 10%; opacity: 0.5; }
.hline:nth-child(7) { top: 45%; opacity: 0.3; }
.hline:nth-child(8) { top: 90%; opacity: 0.2; }

@keyframes hlineMove {
  0%, 100% { transform: scaleX(0.3); transform-origin: left; opacity: 0.3; }
  50% { transform: scaleX(1); transform-origin: left; opacity: 1; }
}

.hero-content {
  position: relative;
  z-index: 1;
  padding-top: 60px;
  padding-bottom: 60px;
}

.hero-label { margin-bottom: 16px; }

.hero-title {
  font-size: clamp(48px, 6vw, 88px);
  line-height: 1;
  color: var(--white);
  margin-bottom: 24px;
  max-width: 700px;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.hero-flag {
  font-size: 40px;
  line-height: 1;
}

.hero-circuit {
  font-size: 18px;
  font-weight: 500;
  color: var(--white);
}

.hero-date {
  font-size: 14px;
  color: var(--white-muted);
  margin-top: 2px;
}

/* Countdown */
.hero-countdown {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.countdown-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 20px;
  width: 20%;
}

.countdown-num {
  font-size: 36px;
  line-height: 1;
  color: var(--white);
}

.countdown-unit {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--white-muted);
  margin-top: 4px;
}

/* Hero details */
.hero-details {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.hero-detail {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-icon {
  font-size: 12px;
  color: var(--red);
}

.detail-label {
  font-size: 12px;
  color: var(--white-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.detail-val {
  font-size: 13px;
  color: var(--white);
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--red);
  color: white;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: opacity var(--transition), transform var(--transition);
}

.hero-cta:hover {
  opacity: 0.9;
  transform: translateX(2px);
}

/* Sections */
.section {
  padding: 48px 0;
  border-bottom: 1px solid var(--border);
}

.section:last-child { border-bottom: none; }

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  font-size: 32px;
}

.section-link {
  font-size: 13px;
  color: var(--red);
  text-decoration: none;
  font-weight: 500;
  transition: opacity var(--transition);
}

.section-link:hover { opacity: 0.8; }

/* Progress bar */
.progress-bar-wrap { display: flex; flex-direction: column; gap: 8px; }

.progress-bar {
  height: 6px;
  background: var(--surface2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--red), #ff4d6d);
  border-radius: 3px;
  transition: width 1s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: -2px;
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 0 8px var(--red);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

/* Standings list */
.standings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.standing-row {
  display: grid;
  grid-template-columns: 40px 32px 1fr auto auto 120px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  text-decoration: none;
  color: var(--white);
  border-left: 3px solid var(--team-color, transparent);
}

.standing-pos {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  text-align: center;
}

.standing-flag { font-size: 18px; }

.standing-info { min-width: 0; }

.standing-name {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.standing-team {
  font-size: 12px;
  font-weight: 500;
  margin-top: 2px;
}

.standing-wins {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.wins-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
}

.wins-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--white-muted);
  text-transform: uppercase;
}

.standing-pts {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.pts-val {
  font-size: 28px;
  color: var(--white);
}

.pts-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--white-muted);
  text-transform: uppercase;
}

.standing-bar-wrap {
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
}

.standing-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.8s ease;
}

/* Last race */
.last-race {
  padding: 24px;
}

.last-race-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.last-race-flag { font-size: 36px; }

.last-race-name { font-size: 24px; }

.last-race-date { font-size: 13px; margin-top: 4px; }

.podium {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.podium-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.podium-pos {
  font-size: 28px;
  min-width: 48px;
}

.podium-driver {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.podium-code {
  font-size: 14px;
  font-weight: 700;
  color: var(--white);
  background: rgba(255,255,255,0.06);
  padding: 3px 8px;
  border-radius: 4px;
}

.podium-name {
  font-size: 15px;
  font-weight: 500;
}

.podium-time {
  font-size: 13px;
}

/* Teams grid */
.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.team-card {
  position: relative;
  padding: 20px;
  text-decoration: none;
  color: var(--white);
  overflow: hidden;
}

.tc-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0.8;
}

.tc-pos {
  font-size: 48px;
  opacity: 0.15;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--tc);
}

.tc-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.tc-pts {
  font-size: 40px;
  line-height: 1;
}

.tc-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 2px;
}

/* News grid */
.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.news-card {
  padding: 24px;
  text-decoration: none;
  color: var(--white);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.news-cat { align-self: flex-start; }

.news-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.news-summary {
  font-size: 14px;
  line-height: 1.6;
  flex: 1;
}

.news-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

@media (max-width: 768px) {
  .hero-countdown { flex-wrap: wrap; }
  .hero-details { flex-wrap: wrap; gap: 12px; }
  .standing-row { grid-template-columns: 36px 28px 1fr auto; }
  .standing-bar-wrap, .standing-wins { display: none; }
}
</style>
