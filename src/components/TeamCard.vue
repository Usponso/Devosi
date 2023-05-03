<script setup lang="ts">
const props = defineProps({
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
        <div class="card--constructor-rank">
            {{ `${rank}` }}
            <span class="card--constructor-name">{{ `&nbsp${constructorName}` }}</span>
        </div>
        <div class="card--logo-constructor">
            <img :src="`/assets/img/teams/${constructorId}.png`">
        </div>
        <div class="card--car-photo">
            <img :src="`/assets/img/cars/${constructorId}.png`">
        </div>
        <div class="card--constructor-points">
            {{ `${points} pts` }}
        </div>
    </div>
</template>

<style scoped>
.card{
    padding: 2em 2em 0em 0em;
    display: grid;
    grid-template-columns: 1fr 1fr .5fr;
    grid-template-rows: 1fr 2.5fr;
    border-radius: .5em;
    font-weight: bold;
}
.card--constructor-rank{
    grid-column-start: 1;
    grid-column-end: 3;
    grid-row: 1;
    font-size: 1.5em;
    font-family: 'Formula1-Black', 'Russo One', monospace;
    margin-left: 1em;
    display: flex;
    align-items: center;
}
.card--constructor-name{
    font-family: Formula1, 'Russo One', monospace;
}
.card--logo-constructor{
    grid-column-start: 3;
    text-align: right;
    min-height: 4em;
}
.card--logo-constructor img{
    max-height: 3.8em;
    max-width: 50%;
}
.card--car-photo{
    grid-column-start: 1;
    grid-column-end: 3;
    grid-row-start: 2;
    grid-row-end: 3;
    position: relative;
    overflow: hidden;
}
.card--car-photo img{
    position: absolute;
    bottom: 0;
    width: 100%;
    margin-left: -6em;
}
.card--constructor-points{
    grid-column: 3;
    grid-row: 2;
    place-self: center;
}
@media screen and (min-width: 1700px) {
    .card{
        grid-template-rows: .5fr 1fr 2fr;
    }
    .card--car-photo, .card--constructor-points{
        grid-row-start: 2;
        grid-row-end: 4;
    }
}
@media screen and (max-width: 1400px) {
    .card{
        padding: 1em 1em 0em 0em;
        grid-template-rows: .5fr 2fr;
        grid-template-columns: 1fr 1.5fr 1fr;
    }
}
@media screen and (max-width: 1000px) {
    .card{
        padding: 1em 1em 0em 0em;
        grid-template-rows: .5fr 1fr;
        grid-template-columns: 1fr 1.5fr 1fr;
    }
}
@media screen and (max-width: 700px) {
    .card{
        padding: 1em 1em 0em 0em;
        grid-template-rows: .5fr 2fr;
        grid-template-columns: 1fr 1.5fr 1fr;
    }
}
@media screen and (max-width: 500px) {
    .card{
        grid-template-rows: .5fr 1fr;
    }
}
@media screen and (max-width: 500px) {
    .card--constructor-name{
        font-size: .8em;
    }
    .card--logo-constructor img{
        width: 100%;
    }
    .card--car-photo img{
        margin-left: -3em;
    }
}
</style>