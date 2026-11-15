<template>
  <div class="coin-balance" :title="$t('common.coins', { n: formatCoins(col.coins) }, col.coins)" role="status" :aria-label="$t('common.balance')">
    <span class="coin" aria-hidden="true"><Icon name="coin" :size="15" /></span>
    <span v-countup="col.coins" class="amount mono"></span>
    <span class="label">{{ $t('common.coinsWord') }}</span>
  </div>
</template>

<script setup>
import Icon from '@/components/Icon.vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { formatCoins } from '@/utils/cards'

const col = useCollectionStore()
</script>

<style scoped>
.coin-balance {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 6px;
  border-radius: 99px;
  border: 1px solid rgb(232 193 90 / 0.35);
  background: linear-gradient(90deg, rgb(232 193 90 / 0.16), rgb(232 193 90 / 0.04));
  white-space: nowrap;
}

.coin {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #5a3d00;
  background: radial-gradient(circle at 35% 30%, #fff3c4, #e8c15a 45%, #b5850f);
  box-shadow: 0 0 12px rgb(232 193 90 / 0.4), inset 0 -2px 3px rgb(0 0 0 / 0.25);
}

.amount { font-size: 15px; font-weight: 700; color: #ffe08a; }
.label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
</style>
