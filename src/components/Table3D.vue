<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Phase, Player } from '../types'
import { PokerTable } from '../utils/three'

const props = defineProps<{
  players: Player[]
  held: boolean[]
  phase: Phase
  pot: number
  winnerIds: string[]
  selectable: boolean
}>()

const emit = defineEmits<{
  toggleHold: [index: number]
  selectPlayer: [playerId: string]
}>()

const host = ref<HTMLDivElement | null>(null)
let table: PokerTable | null = null

function syncTable() {
  table?.sync({
    players: props.players,
    held: props.held,
    phase: props.phase,
    pot: props.pot,
    winnerIds: props.winnerIds,
    selectable: props.selectable,
  })
}

onMounted(() => {
  if (!host.value) return
  table = new PokerTable(host.value, {
    onToggleHold: (index) => emit('toggleHold', index),
    onSelectPlayer: (playerId) => emit('selectPlayer', playerId),
  })
  syncTable()
})

watch(
  () => [props.players, props.held, props.phase, props.pot, props.winnerIds, props.selectable],
  () => syncTable(),
  { deep: true },
)

onBeforeUnmount(() => {
  table?.destroy()
  table = null
})
</script>

<template>
  <div ref="host" class="table3d" aria-label="Three.js poker table"></div>
</template>

<style scoped>
.table3d {
  width: 100%;
  height: min(82vh, 820px);
  min-height: 520px;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(240, 193, 75, 0.16);
  box-shadow:
    inset 0 0 0 4px rgba(8, 30, 24, 0.35),
    0 18px 40px rgba(0, 0, 0, 0.35);
  background: #071612;
  cursor: pointer;
}
</style>
