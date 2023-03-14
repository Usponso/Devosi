<template>
  <div class="navbar">
    <div class="brand">
      Devosi
    </div>
    <div class="links">
      <RouterLink to="/">Season</RouterLink>
      <RouterLink to="/">Drivers</RouterLink>
      <RouterLink to="/">Teams</RouterLink>
      <RouterLink to="/">News</RouterLink>
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
</style>