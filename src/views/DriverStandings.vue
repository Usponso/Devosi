<script setup lang="ts">
import DriverCard from "@/components/DriverCard.vue";
import NavBar from "@/components/NavBar.vue";
import {onMounted, ref} from "vue";
import {getDriverStandings} from "@/apis/standings";
import DriverCardLoader from "@/components/loaders/DriverCardLoader.vue";

const standings = ref([]);
const loaded = ref(false);
const rounds = ref(null);

onMounted(async () => {
  getDriverStandings("2025").then((res) => {
    standings.value = res.MRData.StandingsTable.StandingsLists[0];
    rounds.value = res.MRData.StandingsTable.round;
    loaded.value = true;
  });
});
</script>

<template>
    <div class="container">
      <NavBar/>
      <div v-if="loaded" class="card-list">
        <RouterLink v-if="rounds" :to="{name: 'driverDetails', params: {'id': driver.Driver.driverId}}" v-for="driver in standings.DriverStandings">
          <DriverCard
              :driver-id="driver.Driver.driverId"
              :driver-firstname="driver.Driver.givenName"
              :driver-name="driver.Driver.familyName"
              :driver-number="driver.Driver.permanentNumber"
              :rank="driver.positionText"
              :points="driver.points"
              :constructor-id="driver.Constructors[0].constructorId"
              :constructor-name="driver.Constructors[0].name"
          />
        </RouterLink>
        <div v-else>
          The season has not started yet, waiting for the new one !
        </div>
      </div>
      <DriverCardLoader v-else v-for="i in 20" :key="i"/>
    </div>
</template>

<style scoped>
.card-list{
    margin-top: 5em;
    display: grid;
    grid-template-columns: repeat(2,1fr);
    gap: 2em;
}
.card-list a{
    text-decoration: none;
    color: white;
}
@media screen and (max-width: 1000px){
  .card-list{
      grid-template-columns: 1fr;
  }
}
</style>