<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import GrandPrixCard from "@/components/GrandPrixCard.vue";
import {onMounted, ref} from "vue";
import {getAllRacesBySeason, getNextRace} from "@/apis/races";
import GrandPrixCardLoader from "@/components/loaders/GrandPrixCardLoader.vue";
import {useElementVisibility} from "@vueuse/core";
import type {GrandPrix} from "@/types/GrandPrix";

let races = ref<GrandPrix[]>([]);
let nextRace = ref<GrandPrix[]>([]);
let nextCircuitId = ref("");
const el = ref(null);
const isVisible = useElementVisibility(el);

onMounted(() => {
  getAllRacesBySeason('current').then(res => {
    races.value = res.MRData.RaceTable.Races;
    getNextRace().then(res =>  {
      nextRace.value = res.MRData.RaceTable.Races;
      if(nextRace.value.length)
        nextCircuitId.value = res.MRData.RaceTable.Races[0].Circuit.circuitId;
    });
  }).catch(e => {
    console.log(e);
  });
});
</script>

<template>
  <div class="container">
    <NavBar/>
    <div class="card-list">
      <GrandPrixCardLoader v-if="!races.length" v-for="i in 24" :key="i"/>
      <RouterLink v-else :to="{name: 'gp', params: {'round': race.round}}" v-for="race in races">
        <GrandPrixCard
            :ref="nextCircuitId === race['Circuit'].circuitId ? 'el' : ''"
            :round="race.round"
            :is-next="nextCircuitId === race['Circuit'].circuitId"
            :fp1="race['FirstPractice']"
            :fp2="race['SecondPractice'] ? race['SecondPractice'] : undefined"
            :fp3="race['ThirdPractice'] ? race['ThirdPractice'] : undefined"
            :qualifying="race['Qualifying']"
            :sprint="race['Sprint'] ? race['Sprint'] : undefined"
            :end-date="race.date"
            :circuit-id="race['Circuit'].circuitId"
            :country="race['Circuit']['Location'].country"
            :locality="race['Circuit']['Location'].locality"
            :race-name="race['raceName']"
            :race-hour="race['time']"
            :id="race['Circuit'].circuitId"
        />
      </RouterLink>
      <div v-if="!isVisible && races.length" class="go-to-next-race">
        <a :href="`#${nextCircuitId}`">🏁 Go to the next race</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-list{
  margin-top: 5em;
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 2em;
}
.card-list a{
  text-decoration: none;
  color: white;
}
.go-to-next-race {
  position: fixed;
  bottom: 1em;
  right: 1em;
  background-color: #2b2a24;
  border: 1px solid #f2da00;
  padding: 1em;
  border-radius: .3em;
}
@media screen and (min-width: 2200px){
    .card-list{
        grid-template-columns: repeat(5,1fr);
    }
}
@media screen and (min-width: 1600px) and (max-width: 2199px){
    .card-list{
        grid-template-columns: repeat(4,1fr);
    }
}
@media screen and (max-width: 1200px) {
    .card-list{
        grid-template-columns: repeat(2,1fr);
    }
}
@media screen and (max-width: 800px) {
    .card-list{
        grid-template-columns: 1fr;
    }
}
</style>