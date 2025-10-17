<script setup lang="ts">
import {toRefs} from "vue";
import utils from "@/mixins/utils";
import type {PropType} from "vue";

interface Session{
  date: string,
  time: string
}

const props = defineProps({
  round: {
    type: String,
    required: true
  },
  isNext: {
    type: Boolean,
    required: true
  },
  raceName: {
    type: String,
    required: true
  },
  locality: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  circuitId: {
    type: String,
    required: true
  },
  fp1: {
    type: Object as PropType<Session>,
    required: true
  },
  fp2: {
    type: Object as PropType<Session>,
    required: false
  },
  fp3: {
    type: Object as PropType<Session>,
    required: false
  },
  qualifying: {
    type: Object as PropType<Session>,
    required: true
  },
  sprint: {
    type: Object as PropType<Session>,
    required: false
  },
  sprintQualifying: {
    type: Object as PropType<Session>,
    required: false
  },
  endDate: {
    type: String,
    required: true
  },
  raceHour: {
    type: String,
    required: true
  }
});

const { fp1, fp2, fp3, sprint, qualifying, sprintQualifying, endDate, raceHour } = toRefs(props);
const raceDate = new Date(endDate.value + ' ' + raceHour.value);
const fp1Date = new Date(fp1?.value?.date + ' ' + fp1?.value?.time);
let sprintDate = new Date();
let sprintQualifyingDate = new Date();
let fp2Date = new Date();
let fp3Date = new Date();
if(sprint?.value != undefined){
  sprintDate = new Date(sprint?.value?.date + ' ' + sprint?.value?.time);
  sprintQualifyingDate = new Date(sprintQualifying?.value?.date + ' ' + sprintQualifying?.value?.time);
} else {
  fp2Date = new Date(fp2?.value?.date + ' ' + fp2?.value?.time);
  fp3Date = new Date(fp3?.value?.date + ' ' + fp3?.value?.time);
}
const qualifyingDate = new Date(qualifying?.value?.date + ' ' + qualifying?.value?.time);
let date = utils.methods.formatDate(fp1.value.date, endDate.value);
</script>

<template>
  <div :class="isNext ? 'card is-next' : 'card'">
    <div class="card-content">
        <div :class="isNext ? 'card-title live' : 'card-title'">
            <div v-if="isNext" class="live-mark blink-it"></div>
            {{raceName}}
        </div>
        <div class="card-track">
            <img :src="`/assets/img/tracks/${circuitId}.png`" :alt="`${circuitId} track`"/>
        </div>
        <div class="card-header">
            <div class="location">
                <img :src="`/assets/img/countries/${country}.png`"  alt="Race country flag"/>{{`${locality}`}}
            </div>
            <div class="date">
                {{date}}
            </div>
        </div>
        <div class="card-body">
            <div class="first-practice">
                <img src="/assets/img/icons/practice.png" alt="Practice logo"/>
                {{`FP1 : ${fp1Date.toLocaleDateString()} - ${utils.methods.getTimeFormatted(fp1)}`}}
            </div>
            <div v-if="sprintQualifying" class="qualifying">
                <img src="/assets/img/icons/qualifying.png" alt="Sprint qualifying logo"/>
                {{`SPRINT QUALI : ${sprintQualifyingDate.toLocaleDateString()} - ${utils.methods.getTimeFormatted(sprintQualifying)}`}}
            </div>
            <div v-else class="second-practice">
                <img :src="`/assets/img/icons/${sprint ? 'qualifying' : 'practice'}.png`" alt="Second practice logo"/>
                {{`${sprint ? 'SPRINT QUALI' : 'FP2'} : ${fp2Date.toLocaleDateString()} - ${sprint ? utils.methods.getTimeFormatted(sprint) : fp2 ? utils.methods.getTimeFormatted(fp2) : ''}`}}
            </div>
            <div v-if="sprint" class="sprint">
                <img src="/assets/img/icons/sprint.png" alt="Sprint logo"/>
                {{`SPRINT RACE : ${sprintDate.toLocaleDateString()} - ${utils.methods.getTimeFormatted(sprint)}`}}
            </div>
            <div v-else class="third-practice">
                <img src="/assets/img/icons/practice.png" alt="Third practice logo"/>
                {{`FP3 : ${fp3Date.toLocaleDateString()} - ${utils.methods.getTimeFormatted(fp3!)}`}}
            </div>
            <div v-if="qualifying" class="qualifying">
                <img src="/assets/img/icons/qualifying.png" alt="Qualifying logo"/>
                {{`QUALI : ${qualifyingDate.toLocaleDateString()} - ${utils.methods.getTimeFormatted(qualifying)}`}}
            </div>
            <div class="race">
                <img src="/assets/img/icons/flag.png" alt="Chequered flag logo"/>
                {{`RACE : ${raceDate.toLocaleDateString()} - ${utils.methods.getTimeFormatted({date: `${raceDate.getFullYear()}-${raceDate.getMonth()}-${raceDate.getDate()}`, time: raceHour})}`}}
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.card{
  background-color: #2b2a24;
  border: 2px solid #f2da00;
  border-radius: .8em;
  min-height: 10vh;
  padding: 1.2em;
}
.is-next{
    position: relative;
    overflow: hidden;
    place-items: center;
    z-index: 1;
    border: none
}
.is-next::before{
    content: '';
    width: 50%;
    height: 200%;
    left: 25%;
    top: -50%;
    background: #f2da00;
    position: absolute;
    animation: rotate 5s linear infinite;
    z-index: -20;
}
.is-next::after{
    content:'';
    position: absolute;
    background: #2b2a24;
    inset: 5px;
    border-radius: 5px;
    z-index: -10;
}
.card-title{
  text-align: center;
  font-size: 1.2em;
  margin-bottom: .6em;
}
.live {
    display: flex;
    justify-content: center;
    gap: .2em;
}
.live-mark {
    width: 20px;
    height: 20px;
    background-color: red;
    border-radius: 50%;
}
.card-track img{
  width: 100%;
}
.card-header{
  margin-top: 1em;
  margin-bottom: 1em;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.card-header .date{
  text-align: right;
}
.card-header img{
  width: 10%;
}
.card-header .location img{
  margin-right: .5em;
  border-radius: .1em;
}
.card-body{
  font-weight: normal;
}
.card-body div{
  display: flex;
  gap: .5em;
  align-items: center;
}
.card-body img{
  width: 1.4em;
}
.blink-it {
    animation: blinker 1s linear infinite;
}
@keyframes blinker {
    50% {
        opacity: 0;
    }
}
@keyframes rotate {
    0%{
        transform: rotate(0deg);
    }

    100%{
        transform: rotate(360deg);
    }
}
.ribbon {
    width: 150px;
    height: 150px;
    overflow: hidden;
    position: absolute;
}
.ribbon::before,
.ribbon::after {
    position: absolute;
    z-index: -1;
    content: '';
    display: block;
    border: 5px solid #2980b9;
}
.ribbon span {
    position: absolute;
    display: block;
    width: 225px;
    padding: 15px 0;
    background-color: #3498db;
    box-shadow: 0 5px 10px rgba(0,0,0,.1);
    color: #fff;
    font: 700 18px/1 'Lato', sans-serif;
    text-shadow: 0 1px 1px rgba(0,0,0,.2);
    text-transform: uppercase;
    text-align: center;
}

/* top left*/
.ribbon-top-left {
    top: -10px;
    left: -10px;
}
.ribbon-top-left::before,
.ribbon-top-left::after {
    border-top-color: transparent;
    border-left-color: transparent;
}
.ribbon-top-left::before {
    top: 0;
    right: 0;
}
.ribbon-top-left::after {
    bottom: 0;
    left: 0;
}
.ribbon-top-left span {
    right: -25px;
    top: 30px;
    transform: rotate(-45deg);
}
</style>