<script setup lang="ts">
const props = defineProps({
    driverId: {
        type: String,
        required: true
    },
    driverName: {
        type: String,
        required: true
    },
    driverFirstname: {
      type: String,
      required: true
    },
    driverNumber: {
      type: String,
      required: true
    },
    points: {
        type: String,
        required: true
    },
    rank: {
        type: String,
        required: true
    },
    constructorId: {
        type: String,
        required: true
    },
    constructorName: {
        type: String,
        required: true
    }
});
</script>

<template>
  <div :class="`card card--${constructorId}`">
    <div class="card--driver-rank">
        <!-- + (rank == 1 ? 'st' : rank == 2 ? 'nd' : rank == 3 ? 'rd' : 'th') -->
        {{ rank }}
    </div>
    <div class="card--driver-constructor">
        <img :src="`/assets/img/teams/${constructorId}.png`">
    </div>
    <div class="card--driver-photo">
      <img :src="`/assets/img/drivers/${driverId}.png`">
    </div>
    <div class="card--driver-helmet">
        <img :src="`/assets/img/helmets/${driverId}.png`">
    </div>
    <div class="card--driver-points">
        {{ `${points} pts` }}
    </div>
    <div class="card--driver-presentation">
        <img :src="`/assets/img/numbers/${driverId}.png`">
        <p>{{ `${driverFirstname} ${driverName}` }}</p>
    </div>
  </div>
</template>

<style scoped>
.card{
    padding: 2em 2em 0em 2em;
    display: grid;
    grid-template-columns: repeat(3,1fr);
    grid-template-rows: 1fr 2fr 1fr;
    border-radius: .5em;
    font-weight: bold;
}
.card--driver-rank{
    grid-column: 1;
    grid-row: 1;
    font-size: 1.5em;
    font-family: 'Formula1-Black';
}
.card--driver-constructor{
    grid-column-start: 3;
    text-align: right;
    min-height: 4em;
}
.card--driver-constructor img{
    max-height: 3.8em;
    max-width: 50%;
}
.card--driver-photo{
    grid-column-start: 1;
    grid-row-start: 2;
    grid-row-end: 4;
    position: relative;
}
.card--driver-photo img{
    position: absolute;
    bottom: 0;
    width: 100%;
}
.card--driver-helmet{
    grid-column: 2;
    grid-row: 2;
}
.card--driver-helmet img{
  width: 100%;
}
.card--driver-points{
    grid-column: 3;
    grid-row: 2;
    place-self: center;
}
.card--driver-presentation{
    grid-column-start: 2;
    grid-column-end: 4;
    place-self: center;
    align-items: center;
    display: flex;
}
.card--driver-presentation img{
    width: 90px;
    height: 100%;
}
@media screen and (max-width: 700px){
    .card{
        grid-template-rows: 20% 1fr 1fr;
    }
}
</style>