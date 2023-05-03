<script setup lang="ts">
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {ref} from "vue";

const open = ref(false);
</script>

<template>
  <nav class="navbar">
    <div class="brand">
      <RouterLink to="/">DEVOSI</RouterLink>
    </div>
    <div class="links">
      <RouterLink to="/season">Season</RouterLink>
      <RouterLink to="/drivers">Drivers</RouterLink>
      <RouterLink to="/teams">Teams</RouterLink>
      <RouterLink to="/news">News</RouterLink>
    </div>
  </nav>
  <nav class="navbar-mobile">
      <div class="navbar-mobile-nav">
          <div class="brand">
              <RouterLink to="/">DEVOSI</RouterLink>
          </div>
          <button @click="open = !open" class="navbar-mobile--toggle">
              <font-awesome-icon v-if="!open" :icon="['fas', 'bars']" />
              <font-awesome-icon v-else :icon="['fas', 'xmark']" />
          </button>
      </div>
      <div class="links" v-if="open">
          <RouterLink to="/season">Season</RouterLink>
          <RouterLink to="/drivers">Drivers</RouterLink>
          <RouterLink to="/teams">Teams</RouterLink>
          <RouterLink to="/news">News</RouterLink>
      </div>
  </nav>
</template>

<style scoped>
.navbar{
  color: white;
  display: flex;
  justify-content: space-between;
}
.navbar-mobile{
    display: none;
}
.navbar-mobile--toggle{
    background-color: transparent;
    color: white;
    padding: 0;
    border-width: 0;
    font-size: 2em;
}
.brand{
  font-size: 1.2em;
  font-weight: bold;
  text-transform: uppercase;
}
.brand::first-letter{
  color: #F2DA00;
}
.brand a{
  text-decoration: none;
  color: white;
}
.links{
  display: flex;
  gap: 2em;
}
.links a{
  text-decoration: none;
  color: white;
}
.links a:hover{
  color: #F2DA00;
}
.links a.router-link-active {
  text-decoration: underline;
  text-decoration-color: #F2DA00;
  text-underline-offset: .8em;
  text-decoration-thickness: .25em;
}
@media screen and (max-width: 600px) {
    .navbar{
        display: none;
    }
    .navbar-mobile{
        display: block;
    }
    .navbar-mobile-nav{
        display: flex;
        place-content: space-between;
    }
    .navbar-mobile .links{
        z-index: 99999;
        background-color: #2b2a24;
        width: -webkit-fill-available;
        padding: 2em;
        margin: 2em 2em 0em 0em;
        position: absolute;
        flex-direction: column;
        border: 2px solid #f2da00;
        border-radius: 5px;
        text-align: center;
    }
    .brand{
        font-size: 1.5em;
    }
}
</style>