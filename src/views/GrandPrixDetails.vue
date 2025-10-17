<script setup lang="ts">
import { useRoute } from 'vue-router'
import NavBar from "@/components/NavBar.vue";
import {onMounted, ref} from "vue";
import {getRaceBySeasonAndRound, getRaceResult} from "@/apis/races";
import utils from "../mixins/utils";
import type {Result} from "@/types/Result";
import type {Session} from "@/types/Session";
import type {GrandPrix} from "@/types/GrandPrix";
import {NationalityEnum} from "@/types/NationalityEnum";

const route = useRoute();
let gp = ref<GrandPrix>();
let result = ref<Result[]>([]);
let podium = ref<Result[]>([]);
let race = ref<Session>();
let fp1 = ref<Session>();
let fp2 = ref<Session>();
let fp3 = ref<Session>();
let qualifying = ref<Session>();
let sprint = ref<Session>();
let sprintQualifying = ref<Session>();
let country = ref<string>();

onMounted(async() => {
  let tmp = await getRaceBySeasonAndRound('current', ''+route.params.round);
  gp.value = tmp.MRData.RaceTable.Races[0];
  race.value = {time: gp.value!.time, date: gp.value!.date};
  country.value = gp.value['Circuit']['Location']['country'];
  let tmpResult = await getRaceResult('current', ''+route.params.round);
  result.value = tmpResult.MRData.RaceTable.Races[0]?.Results;
  podium.value = result.value?.slice(0,3);
  fp1.value = gp.value!.FirstPractice;
  fp2.value = gp.value!.SecondPractice;
  fp3.value = gp.value!.ThirdPractice;
  qualifying.value = gp.value!.Qualifying;
  sprint.value = gp.value!.Sprint ? gp.value!.Sprint : undefined;
  sprintQualifying.value = gp.value!.SprintQualifying ? gp.value.SprintQualifying : undefined;
});
</script>

<template>
  <div class="container">
    <NavBar/>
    <div class="go-back-container">
      <RouterLink to="/season" class="go-back">🡄 go back</RouterLink>
    </div>
    <div v-if="gp" class="gp-details">
      <div class="track">
        <div class="track-name">
          <img v-if="country" :src="`/assets/img/countries/${country}.png`" :alt="`${country} flag`"/>
          {{gp['raceName']}}
        </div>
        <div class="track-infos">
          <img v-if="gp['Circuit']" :src="`/assets/img/tracks/${gp['Circuit'].circuitId}.png`" :alt="`Circuit of ${gp['Circuit'].circuitId}`"/>

          <div v-if="podium && podium.length" class="podium">
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
      <div class="schedule">
        <div class="gp-day-card first-day">
          <span class="header">{{fp1 ? utils.methods.getDateFormatted(fp1.date)[0] + " " + utils.methods.getDateFormatted(fp1.date)[1] : ""}}</span>
          <div class="sessions">
            <div class="sessions--line">
              <img src="/assets/img/icons/practice.png" alt="Practice logo"/>
              {{fp1 ? `FP1 : ${utils.methods.getTimeFormatted(fp1)}` : ""}}
            </div>
            <div v-if="fp2" class="sessions--line">
              <img :src="`/assets/img/icons/practice.png`" alt="Second practice logo"/>
              {{`FP2 : ${fp2 ? utils.methods.getTimeFormatted(fp2) : ''}`}}
            </div>
            <div v-else class="sessions--line">
              <img :src="`/assets/img/icons/qualifying.png`" alt="Sprint qualifying logo"/>
              {{`SPRINT QUALI : ${sprintQualifying ? utils.methods.getTimeFormatted(sprintQualifying) : ''}`}}
            </div>
          </div>
        </div>
        <div class="gp-day-card second-day">
          <span class="header">
            {{fp3
              ? utils.methods.getDateFormatted(fp3.date)[0] + " " + utils.methods.getDateFormatted(fp3.date)[1]
              : qualifying
                ? utils.methods.getDateFormatted(qualifying.date)[0] + " " + utils.methods.getDateFormatted(qualifying.date)[1]
                : ""}}
          </span>
          <div class="sessions">
            <div class="sessions--line" v-if="sprint">
              <img src="/assets/img/icons/sprint.png" alt="Sprint race logo"/>
              {{`SPRINT RACE : ${utils.methods.getTimeFormatted(sprint)}`}}
            </div>
            <div class="sessions--line" v-else>
              <img src="/assets/img/icons/practice.png" alt="Third practice logo"/>
              {{fp3 ? `FP3 : ${utils.methods.getTimeFormatted(fp3)}` : ""}}
            </div>
            <div class="sessions--line" v-if="qualifying">
              <img src="/assets/img/icons/qualifying.png" alt="Qualifying logo"/>
              {{qualifying ? `QUALIFYING : ${utils.methods.getTimeFormatted(qualifying)}` : ""}}
            </div>
          </div>
        </div>
        <div class="gp-day-card third-day">
          <span class="header">{{ race ? utils.methods.getDateFormatted(race.date)[0] + " " + utils.methods.getDateFormatted(race.date)[1] : "" }}</span>
          <div class="sessions">
            <div class="sessions--line">
              <img src="/assets/img/icons/flag.png" alt="Chequered flag logo"/>
              {{race ? `RACE : ${utils.methods.getTimeFormatted(race)}` : ""}}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="result" class="result">
      <table class="result-table">
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
        <tr v-for="res in result as Result[]" :key="res.position">
          <td>{{res.positionText!}}</td>
          <td class="result-table--driver">
              <img :src="`/assets/img/drivers/${res.Driver ? res.Driver.driverId : ''}.png`" :alt="res.Driver ? `${res.Driver.givenName} ${res.Driver.familyName} photo` : 'Driver photo'"/>
              {{res.Driver?.givenName + ' ' + res.Driver?.familyName}}
          </td>
          <td>{{res.Time?.time}}</td>
          <td>{{res.grid!}}</td>
          <td :class="`${parseInt(res.grid)-parseInt(res.positionText) > 0 ? 'gain' : parseInt(res.grid)-parseInt(res.positionText) == 0 ? 'equals' : 'loss'}`">
              {{(isNaN(parseInt(res.grid)-parseInt(res.positionText)) || (res.grid == '0'))
                ? ''
                : parseInt(res.grid)-parseInt(res.positionText) > 0
                ? '🢁 '+(Math.abs(parseInt(res.grid)-parseInt(res.positionText)))
                : parseInt(res.grid)-parseInt(res.positionText) < 0
                ? '🢃 ' + (Math.abs(parseInt(res.grid)-parseInt(res.positionText)))
                : '= ' + (parseInt(res.grid)-parseInt(res.positionText)) }}
          </td>
          <td :class="`${res.FastestLap?.rank == '1' ? 'fastest' : ''}`">{{res.FastestLap?.Time.time}}</td>
          <td>{{res.points != '0' ? '+ '+res.points : ''}}</td>
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
.gp-details .track,.weekend-details{
  background-color: #2b2a24;
  border: 2px solid #f2da00;
  border-radius: .8em;
  min-height: 10vh;
  padding: 1.2em;
}
.gp-details .weekend-details {
  display: flex;
  justify-content: space-evenly;
  margin-top: 2em;
  gap: 2em;
  text-align: center;
}
.gp-details .schedule {
  display: flex;
  justify-content: space-evenly;
  margin-top: 2em;
  gap: 2em;
  text-align: center;
}
.gp-details .schedule .gp-day-card {
  border: 1px solid #f2da00;
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 1em;
}

.gp-day-card .header {
  background-color: #f2da00;
  color: black;
  padding: 1em;
  border-radius: 1em 1em 0 0;
  font-weight: bold;
}
.gp-details .track .track-name {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .4em;
}
.gp-details .track .track-name img {
  margin-right: .3em;
  height: 2.5vh;
  border-radius: .3em;
}
.gp-details .track .track-infos{
  display: grid;
  grid-template-columns: repeat(2,50%);
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
.sessions {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.sessions img {
  width: 1.4em;
}
.sessions--line {
  margin: 1em;
  display: flex;
  gap: 0.5em;
  align-items: center;
  justify-content: center;
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