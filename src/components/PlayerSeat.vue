<script setup lang="ts">
import Card from './Card.vue'
import type { Player } from '../types'

defineProps<{
  player: Player
  revealed: boolean
  isWinner: boolean
  dealId: number
  held?: boolean[]
  selectable?: boolean
}>()

const emit = defineEmits<{
  toggleHold: [index: number]
}>()
</script>

<template>
  <section
    class="seat"
    :class="{ you: player.isYou, winner: isWinner, empty: !player.cards.length }"
  >
    <header class="meta">
      <div>
        <p class="name">{{ player.name }}</p>
        <p class="chips">{{ player.chips }} chips</p>
      </div>
      <p v-if="revealed && player.result" class="hand-name">
        {{ player.result.name }}
      </p>
      <p v-else-if="player.cards.length && player.isYou && player.result" class="hand-name">
        {{ player.result.name }}
      </p>
      <p v-else-if="player.cards.length" class="hand-name muted">
        {{ player.isYou ? 'Your cards' : 'Hidden' }}
      </p>
      <p v-else class="hand-name muted">Waiting</p>
    </header>

    <div class="cards" v-if="player.cards.length">
      <Card
        v-for="(card, index) in player.cards"
        :key="`${dealId}-${player.id}-${card.id}-${index}`"
        :card="card"
        :delay="index * 60"
        :compact="!player.isYou"
        :held="Boolean(held?.[index])"
        :selectable="Boolean(selectable && player.isYou)"
        @select="emit('toggleHold', index)"
      />
    </div>
  </section>
</template>

<style scoped>
.seat {
  padding: 0.85rem 0.9rem;
  border-radius: 16px;
  background: rgba(8, 28, 24, 0.45);
  border: 1px solid rgba(240, 193, 75, 0.12);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease;
}

.seat.you {
  border-color: rgba(240, 193, 75, 0.35);
  background: rgba(12, 40, 34, 0.65);
}

.seat.winner {
  border-color: rgba(125, 222, 168, 0.55);
  box-shadow:
    0 0 0 1px rgba(125, 222, 168, 0.25),
    0 10px 28px rgba(0, 0, 0, 0.25);
  transform: translateY(-2px);
}

.meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.name {
  margin: 0;
  font-weight: 700;
  color: #f7f2e4;
  font-size: 0.95rem;
}

.chips {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: rgba(215, 235, 227, 0.65);
}

.hand-name {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #f0c14b;
  text-align: right;
}

.hand-name.muted {
  color: rgba(215, 235, 227, 0.45);
  font-weight: 500;
}

.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: center;
}

.seat.you .cards {
  gap: 0.55rem;
}
</style>
