<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import {onMounted, ref} from "vue";
import {getConstructorStandings} from "@/apis/standings";
import TeamCard from "@/components/TeamCard.vue";
import TeamCardLoader from "@/components/loaders/TeamCardLoader.vue";

const standings = ref([]);

onMounted(async () => {
    let tmp = await getConstructorStandings("current");
    standings.value = tmp.MRData.StandingsTable.StandingsLists[0];
});
</script>

<template>
    <div className="container">
        <NavBar/>
        <div class="card-list">
            <TeamCardLoader v-for="i in 10" v-if="!standings.ConstructorStandings" :key="i"/>
            <RouterLink to="#" v-for="team in standings.ConstructorStandings" v-else>
                <TeamCard
                    :constructor-id="team.Constructor.constructorId"
                    :constructor-name="team.Constructor.name"
                    :points="team.points"
                    :rank="team.position"
                />
            </RouterLink>
        </div>
    </div>
</template>

<style scoped>
.card-list {
    margin-top: 5em;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2em;
}

.card-list a {
    text-decoration: none;
    color: white;
}

@media screen and (max-width: 900px) {
    .card-list {
        grid-template-columns: 1fr;
    }
}
</style>