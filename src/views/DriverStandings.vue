<script setup lang="ts">
import DriverCard from "@/components/DriverCard.vue";
import NavBar from "@/components/NavBar.vue";
import {onMounted, ref} from "vue";
import {getDriverStandings} from "@/apis/standings";
import DriverCardLoader from "@/components/loaders/DriverCardLoader.vue";

const standings = ref([]);

onMounted(async () => {
   let tmp = await getDriverStandings("current");
   standings.value = tmp.MRData.StandingsTable.StandingsLists[0];
});

</script>

<template>
    <div class="container">
      <NavBar/>
      <div class="card-list">
        <DriverCardLoader v-for="i in 20" v-if="!standings.DriverStandings" :key="i"/>
        <RouterLink to="#" v-for="driver in standings.DriverStandings" v-else>
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
      </div>
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