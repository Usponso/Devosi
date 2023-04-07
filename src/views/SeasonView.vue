<script setup>
import NavBar from "@/components/NavBar.vue";
import GrandPrixCard from "@/components/GrandPrixCard.vue";
import {onMounted, ref} from "vue";
import {getAllRacesBySeason} from "@/apis/races";

let races = ref([]);

onMounted(async() => {
  let tmp = await getAllRacesBySeason('current');
  races.value = tmp.MRData.RaceTable.Races;
});
</script>

<template>
  <div class="container">
    <NavBar/>
    <div class="card-list">
      <RouterLink :to="{name: 'gp', params: {'round': race.round}}" v-for="race in races">
        <GrandPrixCard
            :round="race.round"
            :fp1="race['FirstPractice']"
            :fp2="race['SecondPractice']"
            :fp3="!race['Sprint'] ? race['ThirdPractice'] : undefined"
            :qualifying="race['Qualifying']"
            :sprint="race['Sprint'] ? race['Sprint'] : undefined"
            :end-date="race.date"
            :circuit-id="race['Circuit'].circuitId"
            :country="race['Circuit']['Location'].country"
            :locality="race['Circuit']['Location'].locality"
            :race-name="race['raceName']"
            :race-hour="race['time']"
        />
      </RouterLink>
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