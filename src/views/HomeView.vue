<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import { getNextRace } from "@/apis/races";
import {onMounted, ref} from "vue";
import HomeLoader from "@/components/loaders/HomeLoader.vue";
import type {GrandPrix} from "@/types/GrandPrix";

let nextRace = ref<GrandPrix[]>([]);
const loading = ref<boolean>(true);
const days = ref(0);
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
let startTime: Date;
let circuitId = ref("");
let gpName = ref("");

// Get needed infos on mounted hook
onMounted(async() => {
  loading.value = true;
  getNextRace().then((res) => {
    nextRace.value = res.MRData.RaceTable.Races;
    if(res.MRData.RaceTable.Races.length) {
      startTime = new Date(res.MRData.RaceTable.Races[0].date + ' ' + res.MRData.RaceTable.Races[0].time);
      circuitId.value = res.MRData.RaceTable.Races[0].Circuit.circuitId;
      gpName.value = res.MRData.RaceTable.Races[0].raceName;
    }
    loading.value = false;
  });
});

// Countdown refresh every seconds
setInterval(() => {
  const currentDate = new Date();
  const countdownTime = startTime.getTime() - currentDate.getTime();
  seconds.value = parseInt(''+countdownTime / 1000);
  minutes.value = parseInt(''+seconds.value / 60);
  hours.value = parseInt(''+minutes.value / 60);
  days.value = parseInt(''+hours.value / 24);
}, 1000);

// Adding a leading 0 when the number is < 10
function formatDate(value: number){
  if(value < 10){
    return '0'+value;
  } else {
    return value;
  }
}
</script>

<template>
  <div class="container">
    <NavBar/>
    <main class="home">
      <p v-if="nextRace.length" :class="nextRace ? 'gp-name ' + circuitId : 'gp-name'">{{ nextRace ? gpName : "Grand Prix" }}</p>
      <p v-else-if="!loading" class="">The season has ended.</p>
      <HomeLoader v-else/>
      <p v-if="nextRace.length" class="gp-countdown">{{ `${formatDate(days)}d : ${formatDate(hours%24)}h : ${formatDate(minutes%60)}m : ${formatDate(seconds%60)}s` }}</p>
      <p v-else-if="!loading" class="">We will be back soon, stay tuned !</p>
      <RouterLink v-if="nextRace.length" class="schedule-btn" :to="`gp/${nextRace[0].round}`">
        <!--<img src="/assets/img/icons/flag.png" alt="race flag icon"/>-->
        go to details
      </RouterLink>
    </main>
  </div>
</template>

<style scoped>
.home{
  display: flex;
  flex-direction: column;
  height: 80vh;
  align-items: center;
  justify-content: center;
}
.gp-name{
  text-align: center;
  font-size: 3em;
  font-weight: bold;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0px;
}
.gp-countdown{
  font-size: 2em;
  font-weight: bold;
  margin-top: .5em;
}
.schedule-btn{
  text-decoration: none;
  color: #F2DA00;
  padding: .8em;
  display: flex;
  gap: .6em;
  border: 1px solid #F2DA00;
  border-radius: .5em;
  align-items: center;
}
.schedule-btn img{
  width: 4vh;
}
@media screen and (max-width: 900px){
    .gp-name{
        font-size: 1.8em;
    }
    .gp-countdown{
        font-size: 1em;
    }
}
</style>