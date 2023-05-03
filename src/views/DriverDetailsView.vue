<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import {getDriverProfile} from "@/apis/driver";
import {useRoute} from "vue-router";
import type DriverProfile from "@/types/DriverProfile";
import NavBar from "@/components/NavBar.vue";
import {NationalityEnum} from "@/types/NationalityEnum";

const route = useRoute();
let driverProfile = ref<DriverProfile>({
    driverId: '',
    permanentNumber: '99',
    nationality: 'Nationality',
    givenName: 'Driver',
    familyName: 'Name',
    code: 'DRI',
    races: '0',
    wins: '0',
    podiums: '0',
    dateOfBirth: '1998-01-01',
    Constructor: {
        constructorId: '',
        name: 'Constructor',
        nationality: 'Constructor nationality'
    }
});

onMounted(() => {
    document.body.classList.add('overflow-hidden'); // best solution found atm
    getDriverProfile(route.params.id as string).then((res) => {
        driverProfile.value = res;
    });
});
onUnmounted(() => {
   document.body.classList.remove('overflow-hidden'); // best solution found atm
});
</script>

<template>
    <div class="container">
        <NavBar/>
        
        <div class="go-back-container">
            <a class="go-back" @click="this.$router.go(-1)">&lt; Back</a>
        </div>

        <div v-if="driverProfile.code" class="driver-profile">
            <div class="driver-header">
                <div class="driver-presentation">
                    <div class="driver-name">
                        {{driverProfile.givenName}}<span class="bold uppercase">&nbsp{{driverProfile.familyName}}</span>
                    </div>
                    <img v-if="driverProfile.driverId" :src="`/assets/img/numbers-profile/${driverProfile.driverId}.png`" alt="Driver number">
                </div>
                <img v-if="driverProfile.Constructor.constructorId" :src="`/assets/img/teams-profile/${driverProfile.Constructor.constructorId}.png`" alt="Constructor logo" class="driver-constructor-logo">
            </div>

            <div class="driver-information">
                <div class="nationality">
                    <span class="bold">Nationality</span>
                    <img v-if="driverProfile.nationality != 'Nationality'" :src="`/assets/img/countries/${NationalityEnum[driverProfile.nationality]}.png`" :alt="`${driverProfile.nationality} flag`" style="margin-right: .3em"/>
                    {{driverProfile.nationality}}
                </div>
                <div class="date-of-birth">
                    <span class="bold">Date of birth</span>
                    {{new Date(driverProfile.dateOfBirth).toLocaleDateString()}}
                </div>
                <div class="stats">
                    <div class="races">
                        <span class="bold">Races</span>
                        {{driverProfile.races}}
                    </div>
                    <div class="wins">
                        <span class="bold">Wins</span>
                        {{driverProfile.wins}}
                    </div>
                    <div class="podiums">
                        <span class="bold">Podiums</span>
                        {{driverProfile.podiums}}
                    </div>
                </div>
            </div>

            <div class="car-photo">
                <img v-if="driverProfile.Constructor.constructorId" :src="`/assets/img/cars-profile/${driverProfile.Constructor.constructorId}.png`" :alt="`${driverProfile.Constructor.name} car photo`">
            </div>
            <div class="driver-photo">
                <img :src="`/assets/img/drivers-profile/${driverProfile.driverId}.png`" :alt="`${driverProfile.givenName} ${driverProfile.familyName} photo`"/>
            </div>
        </div>
        <div class="driver-invalid" v-else>
            The driver id is not valid
        </div>
    </div>
</template>

<style scoped>
.driver-invalid {
    text-align: center;
    margin-top: 40vh;
}
.driver-profile {
    margin-top: 2em;
    padding: 7em;
}
.driver-header {
    display: flex;
    justify-content: space-between;
}
.driver-presentation {
    display: flex;
    align-items: center;
    font-size: 2em;
    gap: .5em;
}
.driver-presentation img {
  max-width: 20%;
}
.driver-constructor-logo {
  max-height: 10vh;
}
.driver-constructor-logo img {
    width: 100%;
}
.driver-information {
    margin-top: 2em;
    font-size: 1.1em;
}
.driver-information span {
    margin-right: 1em;
}
.driver-information .nationality {
    display: flex;
    align-items: center;
}
.driver-information .nationality img {
    height: 3vh;
    border-radius: .1em;
}
.driver-information .date-of-birth {
    margin-top: 1em;
}
.driver-information .stats {
    margin-top: 1em;
    display: flex;
    gap: 2em;
}
.car-photo img {
    width: 50vw;
    bottom: 2em;
    position: absolute;
}
.driver-photo {
    overflow: hidden;
}
.driver-photo img {
    position: absolute;
    right: 4em;
    bottom: -9em;
}
@media screen and (max-width: 1200px) {
    .driver-photo img {
        right: 2em;
        width: 60%;
    }
}
@media screen and (max-width: 1000px) {
    .driver-profile {
        padding: 4em;
    }
}
@media screen and (max-width: 850px) {
    .driver-profile {
        padding: 3em;
    }
    .driver-header {
        flex-direction: column-reverse;
        align-items: center;
    }
    .driver-presentation {
        place-content: center;
    }
    .driver-constructor-logo {
        max-width: 10vw;
    }
    .driver-information .nationality img {
        border-radius: .3em;
    }
    .driver-information .stats {
        justify-content: space-between;
    }
    .driver-information .stats span {
        margin-right: 0;
    }
    .driver-information .stats div {
        display: flex;
        flex-direction: column;
        text-align: center;
    }
    .driver-photo img {
        width: 90%;
        right: 1.2em;
    }
    .car-photo {
        text-align: center;
        margin-top: 1em;
    }
    .car-photo img {
        position: inherit;
    }
}
@media screen and (max-width: 600px) {
    .driver-profile {
        padding: 1em;
    }
    .driver-constructor-logo {
        max-width: 20vw;
        width: fit-content;
    }
    .driver-presentation {
        margin-top: 1em;
    }
    .driver-name {
        font-size: .6em;
    }
    .driver-information {
        font-size: 1em;
    }
    .driver-photo img {
        bottom: -2em;
    }
    .car-photo img {
        width: 80vw;
    }
}
@media screen and (max-width: 300px) {
    .driver-profile {
        padding: 0;
    }
    .driver-profile {
        font-size: .6em;
    }
}
/* for landscape small devices */
@media screen and (max-width: 900px) and (max-height: 450px) {
    .driver-photo {
        display: none;
    }
    .car-photo {
        display: none;
    }
}
@media screen and (max-height: 700px) {
    .driver-photo img {
        bottom: -8em;
    }
}
</style>