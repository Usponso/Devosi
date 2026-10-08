/**
 * v-countup : anime un nombre de 0 (ou de sa valeur précédente) jusqu'à la valeur liée.
 * Usage : <span v-countup="driver.points" />  ou  v-countup="{ value: 12.5, decimals: 1 }"
 */
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const DURATION = 900
const easeOutCubic = (t) => 1 - (1 - t) ** 3

function parse(binding) {
  const v = binding.value
  return typeof v === 'object' && v !== null ? { value: v.value, decimals: v.decimals ?? 0 } : { value: v, decimals: 0 }
}

function animate(el, from, to, decimals) {
  cancelAnimationFrame(el._countupRaf)
  const format = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  if (prefersReducedMotion() || from === to || !Number.isFinite(to)) {
    el.textContent = Number.isFinite(to) ? format(to) : '—'
    return
  }
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / DURATION)
    el.textContent = format(from + (to - from) * easeOutCubic(t))
    if (t < 1) el._countupRaf = requestAnimationFrame(step)
  }
  el._countupRaf = requestAnimationFrame(step)
}

export const countup = {
  mounted(el, binding) {
    const { value, decimals } = parse(binding)
    el._countupValue = value
    animate(el, 0, value, decimals)
  },
  updated(el, binding) {
    const { value, decimals } = parse(binding)
    if (value === el._countupValue) return
    animate(el, el._countupValue ?? 0, value, decimals)
    el._countupValue = value
  },
  unmounted(el) {
    cancelAnimationFrame(el._countupRaf)
  },
}
