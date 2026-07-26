<script setup lang="ts">
import type { Card } from '../types'

defineProps<{
  card: Card
  delay?: number
  compact?: boolean
  held?: boolean
  selectable?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    class="card"
    :class="{
      flipped: card.flipped,
      compact: compact,
      held: held,
      selectable: selectable,
      [card.color]: true,
    }"
    :style="{ '--delay': `${delay ?? 0}ms` }"
    :disabled="!selectable"
    :aria-pressed="held ? 'true' : 'false'"
    :aria-label="
      card.flipped
        ? `${card.label} of ${card.suit}${held ? ', held' : ''}`
        : 'Face-down card'
    "
    @click="selectable && emit('select')"
  >
    <div class="card-inner">
      <div class="card-face card-back">
        <span class="pattern" aria-hidden="true">♠</span>
      </div>
      <div class="card-face card-front">
        <div class="corner top">
          <span class="rank">{{ card.label }}</span>
          <span class="suit">{{ card.symbol }}</span>
        </div>
        <span class="center-suit" aria-hidden="true">{{ card.symbol }}</span>
        <div class="corner bottom">
          <span class="rank">{{ card.label }}</span>
          <span class="suit">{{ card.symbol }}</span>
        </div>
        <span v-if="held" class="hold-badge">HOLD</span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 120px;
  aspect-ratio: 2.5 / 3.5;
  padding: 0;
  border: 0;
  background: transparent;
  perspective: 1200px;
  animation: deal-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay);
  font: inherit;
  color: inherit;
}

.card:disabled {
  cursor: default;
}

.card.selectable {
  cursor: pointer;
}

.card.compact {
  max-width: 72px;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.35s cubic-bezier(0.34, 1.15, 0.64, 1);
  border-radius: 10px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
}

.card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card.flipped.held .card-inner,
.card.flipped.selectable:hover .card-inner {
  transform: translateY(-10px) rotateY(180deg);
  box-shadow:
    0 0 0 2px #f0c14b,
    0 14px 28px rgba(0, 0, 0, 0.4);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.14);
}

.card-back {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1), transparent 45%),
    repeating-linear-gradient(45deg, #163d32 0 8px, #124033 8px 16px),
    linear-gradient(145deg, #1b4d3e, #0a221c);
}

.pattern {
  font-size: 1.6rem;
  color: #f0c14b;
  opacity: 0.85;
}

.card.compact .pattern {
  font-size: 1.1rem;
}

.card-front {
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 0.4rem 0.45rem;
  background: radial-gradient(circle at 70% 12%, #fffdf8, #f3e6c8 60%, #e8d6ad 100%);
  transform: rotateY(180deg);
  border-color: rgba(90, 60, 20, 0.15);
  color: #1a1a1a;
}

.card.compact .card-front {
  padding: 0.25rem 0.3rem;
}

.card.red .card-front {
  color: #c62828;
}

.card.black .card-front {
  color: #1c2430;
}

.corner {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  gap: 0.05rem;
}

.corner.top {
  justify-self: start;
}

.corner.bottom {
  justify-self: end;
  transform: rotate(180deg);
}

.rank {
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(0.8rem, 2.2vw, 1.1rem);
  font-weight: 700;
}

.card.compact .rank {
  font-size: 0.7rem;
}

.suit {
  font-size: clamp(0.65rem, 1.8vw, 0.85rem);
}

.card.compact .suit {
  font-size: 0.55rem;
}

.center-suit {
  place-self: center;
  font-size: clamp(1.5rem, 5vw, 2.4rem);
}

.card.compact .center-suit {
  font-size: 1.15rem;
}

.hold-badge {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #1a2a22;
  background: #f0c14b;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
}

@keyframes deal-in {
  from {
    opacity: 0;
    transform: translateY(-24px) rotateY(-24deg) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateY(0) scale(1);
  }
}
</style>
