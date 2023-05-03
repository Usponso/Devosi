<script setup lang="ts">
import { useRoute } from 'vue-router'
import NavBar from "@/components/NavBar.vue";
import {onMounted, ref} from "vue";
import {getRaceBySeasonAndRound, getRaceResult} from "@/apis/races";
import * as RaceResult from "@/types/RaceResult";

const route = useRoute();
let gp = ref([]);
let result = ref<RaceResult.default[]>([]);
let podium = ref<RaceResult.default[]>([]);

onMounted(async() => {
  let tmp = await getRaceBySeasonAndRound('current', ''+route.params.round);
  gp.value = tmp.MRData.RaceTable.Races[0];

  tmp = await getRaceResult('current', ''+route.params.round);
  result.value = tmp.MRData.RaceTable.Races[0]?.Results;

  podium.value = result.value?.slice(0,3);
});
</script>

<template>
  <div class="container">
    <NavBar/>
    <div class="go-back-container">
        <a class="go-back" @click="this.$router.go(-1)">&lt; Back</a>
    </div>
    <div v-if="gp" class="gp-details">
      <div class="track">
        <div :class="`track-name`">
          {{gp['Circuit'] ? gp['Circuit']['Location']['country'] : ''}}
          {{gp['raceName']}}
        </div>
        <div class="track-infos">
          <img v-if="gp['Circuit']" :src="`/assets/img/tracks/${gp['Circuit'].circuitId}.png`" :alt="`Circuit of ${gp['Circuit'].circuitId}`"/>

          <div v-if="podium" class="podium">
            <div class="podium_item">
              <img :src="`/assets/img/drivers/${podium[1] ? podium[1].Driver.driverId : ''}.png`"/>
              <div class="podium_rank second">2</div>
            </div>
            <div class="podium_item">
              <img :src="`/assets/img/drivers/${podium[0] ? podium[0].Driver.driverId : ''}.png`"/>
              <div class="podium_rank first">1</div>
            </div>
            <div class="podium_item">
              <img :src="`/assets/img/drivers/${podium[2] ? podium[2].Driver.driverId : ''}.png`"/>
              <div class="podium_rank third">3</div>
            </div>
          </div>

          <div v-else class="podium">
            Podium not available for the moment
          </div>

        </div>
      </div>
    </div>
    <div class="result">
      <table v-if="result" class="result-table">
        <thead>
        <tr>
          <th>Pos</th>
          <th>Driver (Constructor)</th>
          <th>Time</th>
          <th>Grid pos</th>
          <th>Gain/Loss pos</th>
          <th>Fastest lap</th>
          <th>Points</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="res in result as RaceResult[]" :key="res.position">
          <td>{{res.positionText!}}</td>
          <td class="result-table--driver">
              <img :src="`/assets/img/drivers/${res.Driver ? res.Driver.driverId : ''}.png`"/>
              {{res.Driver?.givenName + ' ' + res.Driver?.familyName}}
          </td>
          <td>{{res.Time?.time}}</td>
          <td>{{res.grid!}}</td>
          <td :class="`${parseInt(res.grid)-parseInt(res.positionText) > 0 ? 'gain' : parseInt(res.grid)-parseInt(res.positionText) == 0 ? 'equals' : 'loss'}`">
              {{(isNaN(parseInt(res.grid)-parseInt(res.positionText)) || (res.grid == 0))
                ? ''
                : parseInt(res.grid)-parseInt(res.positionText) > 0
                ? '🢁 '+(Math.abs(parseInt(res.grid)-parseInt(res.positionText)))
                : parseInt(res.grid)-parseInt(res.positionText) < 0
                ? '🢃 ' + (Math.abs(parseInt(res.grid)-parseInt(res.positionText)))
                : '= ' + (parseInt(res.grid)-parseInt(res.positionText)) }}
          </td>
          <td :class="`${res.FastestLap?.rank == 1 ? 'fastest' : ''}`">{{res.FastestLap?.Time.time}}</td>
          <td>{{res.points != 0 ? '+ '+res.points : ''}}</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.gp-details{
  margin-top: 2em;
}
.gp-details .track{
  background-color: #2b2a24;
  border: 2px solid #f2da00;
  border-radius: .8em;
  min-height: 10vh;
  padding: 1.2em;
}
.gp-details .track .track-name{
  text-align: center;
}
.gp-details .track .track-infos{
  display: grid;
  grid-template-columns: repeat(2,50%);
  gap: 2em;
  margin-top: 1em;
  align-items: center;
}
.gp-details .track .track-infos img{
  width: 100%;
}
.gp-details .podium{
  display: flex;
  justify-self: center;
  align-self: center;
  align-items: flex-end;
  justify-content: center;
}
.gp-details .podium_item{
  text-align: center;
  width: 7em;
}
.gp-details .podium_item .driver{
  font-weight: bold;
}
.gp-details .podium_rank{
  display: flex;
  justify-content: center;
  align-items: center;
  border: 4px solid white;
  color: white;
  font-weight: bold;
}
.gp-details .podium .first{
  background-color: gold;
  height: 8em;
}
.gp-details .podium .second{
  background-color: silver;
  height: 6em;
  border-right: 0px;
}
.gp-details .podium .third{
  background-color: #C77B30;
  height: 4em;
  border-left: 0px;
}
.result{
    margin-top: 2em;
    overflow-x: scroll;
    background-color: #2b2a24;
    border-radius: .8em;
    border: 2px solid #f2da00;
}
.result-table{
  width: 100%;
  border-spacing: 2em;
}
.result-table thead{
    text-align: left;
}
.result-table--driver{
    display: flex;
    align-items: center;
    gap: 1em;
}
.result-table img{
    max-width: 5em;
}
.result-table .gain{
    color: green;
    font-weight: bold;
}
.result-table .loss{
    color: red;
    font-weight: bold;
}
.result-table .equals{
    color: yellow;
    font-weight: bold;
}
.result-table .fastest{
    color: #ED00FF;
    font-weight: bold;
}
@media screen and (min-width: 1100px) {
    .result::-webkit-scrollbar{
        display: none;
    }
}
@media screen and (max-width: 1000px) {
    .gp-details .track .podium {
        width: 70%;
    }
}
@media screen and (max-width: 700px) {
    .gp-details .track .track-infos {
        grid-template-columns: 1fr;
    }
}
</style>