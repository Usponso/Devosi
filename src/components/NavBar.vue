<template>
  <div class="navbar">
    <div class="brand">
      Devosi
    </div>
    <div class="links">
      <RouterLink to="/season">Season</RouterLink>
      <RouterLink to="/drivers">Drivers</RouterLink>
      <RouterLink to="/teams">Teams</RouterLink>
      <RouterLink to="/news">News</RouterLink>
    </div>
  </div>
</template>

<script>
export default {
  name: "NavBar"
}
</script>

<style scoped>
.navbar{
  color: white;
  display: flex;
  justify-content: space-between;
}
.brand{
  font-size: 1.2em;
  font-weight: bold;
  text-transform: uppercase;
}
.brand::first-letter{
  color: #F2DA00;
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
</style>