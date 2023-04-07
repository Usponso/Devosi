<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import { getNextRace } from "@/apis/races";
import {onMounted, ref} from "vue";

let nextRace = ref([]);
const days = ref(0);
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
let startTime: Date;
let circuitId = ref("");
let gpName = ref("");

// Get needed infos on mounted hook
onMounted(async() => {
  let tmp = await getNextRace();
  nextRace.value = tmp.MRData.RaceTable;
  startTime = new Date(tmp.MRData.RaceTable.Races[0].date + ' ' + tmp.MRData.RaceTable.Races[0].time);
  circuitId.value = tmp.MRData.RaceTable.Races[0].Circuit.circuitId;
  gpName.value = tmp.MRData.RaceTable.Races[0].raceName;
});

// Countdown refresh every seconds
setInterval(() => {
  const currentDate = new Date();
  const countdownTime = startTime - currentDate;
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
      <p :class="nextRace ? 'gp-name ' + circuitId : 'gp-name'">{{ nextRace ? gpName : "Grand Prix" }}</p>
      <p class="gp-countdown">{{ `${formatDate(days)}d : ${formatDate(hours%24)}h : ${formatDate(minutes%60)}m : ${formatDate(seconds%60)}s` }}</p>
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
  -webkit-text-fill-color: transparent;
  margin-bottom: 0px;
}
.gp-countdown{
  font-size: 2em;
  font-weight: bold;
  margin-top: .5em;
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