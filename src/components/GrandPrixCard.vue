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
    required: true
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
  endDate: {
    type: String,
    required: true
  },
  raceHour: {
    type: String,
    required: true
  }
});

const { fp1, fp2, fp3, sprint, qualifying, endDate, raceHour } = toRefs(props);
const raceDate = new Date(endDate.value + ' ' + raceHour.value);
const fp1Date = new Date(fp1?.value?.date + ' ' + fp1?.value?.time);
const fp2Date = new Date(fp2?.value?.date + ' ' + fp2?.value?.time);
let sprintDate = new Date();
let fp3Date = new Date();
if(sprint?.value != undefined){
  sprintDate = new Date(sprint?.value?.date + ' ' + sprint?.value?.time);
} else {
  fp3Date = new Date(fp3?.value?.date + ' ' + fp3?.value?.time);
}
const qualifyingDate = new Date(qualifying?.value?.date + ' ' + qualifying?.value?.time);
let date = utils.methods.formatDate(fp1.value.date, endDate.value);
</script>

<template>
  <div class="card">
    <div class="card-title">{{`${raceName}`}}</div>
    <div class="card-track">
      <img :src="`/assets/img/tracks/${circuitId}.png`"/>
    </div>
    <div class="card-header">
      <div class="location">
        <img :src="`/assets/img/countries/${country}.png`" />{{`${locality}`}}
      </div>
      <div class="date">
        {{date}}
      </div>
    </div>
    <div class="card-body">
      <div class="first-practice">
        <img src="/assets/img/icons/practice.png"/>
        {{`FP1 : ${fp1Date.toLocaleDateString()} - ${fp1Date.toLocaleTimeString()}`}}
      </div>
      <div v-if="sprint" class="qualifying">
        <img src="/assets/img/icons/qualifying.webp"/>
        {{`QUALI : ${qualifyingDate.toLocaleDateString()} - ${qualifyingDate.toLocaleTimeString()}`}}
      </div>
      <div class="second-practice">
        <img src="/assets/img/icons/practice.png"/>
        {{`FP2 : ${fp2Date.toLocaleDateString()} - ${fp2Date.toLocaleTimeString()}`}}
      </div>
      <div v-if="sprint" class="sprint">
        <img src="/assets/img/icons/sprint.png"/>
        {{`SPRINT : ${sprintDate.toLocaleDateString()} - ${sprintDate.toLocaleTimeString()}`}}
      </div>
      <div v-if="!sprint" class="third-practice">
        <img src="/assets/img/icons/practice.png"/>
        {{`FP3 : ${fp3Date.toLocaleDateString()} - ${fp3Date.toLocaleTimeString()}`}}
      </div>
      <div v-if="!sprint" class="qualifying">
        <img src="/assets/img/icons/qualifying.webp"/>
        {{`QUALI : ${qualifyingDate.toLocaleDateString()} - ${qualifyingDate.toLocaleTimeString()}`}}
      </div>
      <div class="race">
        <img src="/assets/img/icons/flag.png"/>
        {{`RACE : ${raceDate.toLocaleDateString()} - ${raceDate.toLocaleTimeString()}`}}
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
.card-title{
  text-align: center;
  font-size: 1.2em;
  margin-bottom: .6em;
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
</style>