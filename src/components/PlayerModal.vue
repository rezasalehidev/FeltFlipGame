<script setup lang="ts">
import type { PlayerModalData } from '../types'

defineProps<{
  player: PlayerModalData
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="backdrop" role="dialog" aria-modal="true" @click.self="emit('close')">
    <div class="modal">
      <header class="head">
        <div>
          <p class="eyebrow">{{ player.isYou ? 'Your profile' : 'Player profile' }}</p>
          <h2>{{ player.name }}</h2>
        </div>
        <button class="close" type="button" aria-label="Close" @click="emit('close')">
          ×
        </button>
      </header>

      <div class="grid">
        <div class="stat">
          <span class="label">Chips</span>
          <strong>{{ player.chips }}</strong>
        </div>
        <div class="stat">
          <span class="label">Wins</span>
          <strong>{{ player.wins }}</strong>
        </div>
        <div class="stat">
          <span class="label">Hand rank</span>
          <strong>{{ player.handRank || '—' }}</strong>
        </div>
        <div class="stat highlight">
          <span class="label">Score</span>
          <strong>{{ player.handScore }}</strong>
        </div>
      </div>

      <div class="block">
        <span class="label">Current hand</span>
        <p class="hand">
          {{ player.handName }}
          <span v-if="player.isWinner" class="badge">Winner</span>
        </p>
      </div>

      <div class="block">
        <span class="label">Cards</span>
        <p class="cards">{{ player.cardsSummary }}</p>
      </div>

      <button class="btn" type="button" @click="emit('close')">Close</button>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(3, 12, 10, 0.72);
  backdrop-filter: blur(6px);
  animation: fade 0.2s ease both;
}

.modal {
  width: min(420px, 100%);
  padding: 1.35rem 1.25rem 1.25rem;
  border-radius: 18px;
  background: linear-gradient(165deg, #12352c, #0a1f1a 70%);
  border: 1px solid rgba(240, 193, 75, 0.28);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.45);
  animation: rise 0.25s ease both;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(215, 235, 227, 0.6);
}

h2 {
  margin: 0.2rem 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.7rem;
  color: #f0c14b;
  line-height: 1.1;
}

.close {
  appearance: none;
  border: 0;
  background: rgba(255, 255, 255, 0.06);
  color: #f7f2e4;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-bottom: 0.9rem;
}

.stat,
.block {
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: rgba(4, 18, 14, 0.55);
  border: 1px solid rgba(240, 193, 75, 0.12);
}

.stat.highlight {
  border-color: rgba(240, 193, 75, 0.4);
  background: rgba(240, 193, 75, 0.1);
}

.label {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(215, 235, 227, 0.6);
}

.stat strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 1.25rem;
  color: #f7f2e4;
}

.stat.highlight strong {
  color: #f0c14b;
}

.block {
  margin-bottom: 0.65rem;
}

.hand,
.cards {
  margin: 0.35rem 0 0;
  color: #f7f2e4;
  font-weight: 600;
}

.cards {
  font-weight: 500;
  color: rgba(215, 235, 227, 0.88);
}

.badge {
  display: inline-block;
  margin-left: 0.45rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(125, 222, 168, 0.2);
  color: #7ddea8;
  font-size: 0.72rem;
  font-weight: 700;
  vertical-align: middle;
}

.btn {
  width: 100%;
  margin-top: 0.55rem;
  appearance: none;
  border: 1px solid rgba(240, 193, 75, 0.45);
  background: linear-gradient(180deg, #f0c14b, #d4a017);
  color: #1a2a22;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  cursor: pointer;
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
