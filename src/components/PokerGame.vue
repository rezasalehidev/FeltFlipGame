<script setup lang="ts">
import { computed, ref } from 'vue'
import Table3D from './Table3D.vue'
import PlayerModal from './PlayerModal.vue'
import type { Card, Phase, Player, PlayerModalData } from '../types'
import {
  ANTE,
  botHoldIndexes,
  createPlayers,
  dealRound,
  drawReplacements,
  evaluateHand,
  findWinners,
} from '../utils/poker'

const props = defineProps<{
  username: string
}>()

const emit = defineEmits<{
  logout: []
}>()

const players = ref<Player[]>(createPlayers(props.username))
const phase = ref<Phase>('idle')
const pot = ref(0)
const status = ref('Press Play. Click a player name for score & stats.')
const winnerIds = ref<string[]>([])
const held = ref<boolean[]>([false, false, false, false, false])
const deck = ref<Card[]>([])
const busy = ref(false)
const selectedPlayerId = ref<string | null>(null)

const you = computed(() => players.value.find((p) => p.isYou)!)
const canStart = computed(
  () =>
    !busy.value &&
    (phase.value === 'idle' || phase.value === 'showdown') &&
    players.value.every((p) => p.chips >= ANTE),
)
const holdCount = computed(() => held.value.filter(Boolean).length)
const discardCount = computed(() => 5 - holdCount.value)

const modalPlayer = computed<PlayerModalData | null>(() => {
  if (!selectedPlayerId.value) return null
  const player = players.value.find((p) => p.id === selectedPlayerId.value)
  if (!player) return null

  const canSeeCards =
    player.isYou || phase.value === 'showdown' || player.cards.every((c) => c.flipped)

  return {
    id: player.id,
    name: player.name,
    isYou: player.isYou,
    chips: player.chips,
    wins: player.wins,
    handName: player.result?.name ?? 'No hand yet',
    handRank: player.result?.rank ?? 0,
    handScore: player.result?.score ?? 0,
    isWinner: winnerIds.value.includes(player.id),
    cardsSummary: !player.cards.length
      ? 'Waiting for deal'
      : canSeeCards
        ? player.cards.map((c) => `${c.label}${c.symbol}`).join('  ')
        : 'Hidden',
  }
})

function openPlayerModal(playerId: string) {
  selectedPlayerId.value = playerId
}

function closePlayerModal() {
  selectedPlayerId.value = null
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function toggleHold(index: number) {
  if (phase.value !== 'choose' || busy.value) return
  const next = [...held.value]
  next[index] = !next[index]
  held.value = next
}

async function flipPlayerCards(playerIndex: number, faceUp: boolean) {
  for (let i = 0; i < players.value[playerIndex].cards.length; i += 1) {
    await wait(140)
    const cards = [...players.value[playerIndex].cards]
    cards[i] = { ...cards[i], flipped: faceUp }
    players.value[playerIndex] = { ...players.value[playerIndex], cards }
  }
}

async function startHand() {
  if (!canStart.value) return

  busy.value = true
  phase.value = 'dealing'
  winnerIds.value = []
  held.value = [false, false, false, false, false]
  status.value = 'Dealing 3D cards…'

  let nextPot = 0
  players.value = players.value.map((p) => {
    nextPot += ANTE
    return { ...p, chips: p.chips - ANTE, cards: [], result: null }
  })
  pot.value = nextPot

  const round = dealRound(players.value.length, 5)
  deck.value = round.deck
  players.value = players.value.map((p, i) => ({
    ...p,
    cards: round.hands[i],
    result: null,
  }))

  const youIndex = players.value.findIndex((p) => p.isYou)
  await flipPlayerCards(youIndex, true)

  players.value[youIndex] = {
    ...players.value[youIndex],
    result: evaluateHand(players.value[youIndex].cards),
  }

  phase.value = 'choose'
  status.value = 'YOUR TURN: click your 3D cards to HOLD, then Draw.'
  busy.value = false
}

async function confirmDraw() {
  if (phase.value !== 'choose' || busy.value) return

  busy.value = true
  phase.value = 'drawing'
  status.value = discardCount.value
    ? `Drawing ${discardCount.value} new card(s)…`
    : 'Standing pat…'

  const youIndex = players.value.findIndex((p) => p.isYou)
  const youDraw = drawReplacements(
    players.value[youIndex].cards,
    held.value,
    deck.value,
    true,
  )
  deck.value = youDraw.deck
  players.value[youIndex] = {
    ...players.value[youIndex],
    cards: youDraw.cards,
    result: evaluateHand(youDraw.cards),
  }
  held.value = [false, false, false, false, false]
  await wait(450)

  status.value = 'Bots are drawing…'
  for (let p = 0; p < players.value.length; p += 1) {
    if (players.value[p].isYou) continue
    const botHold = botHoldIndexes(players.value[p].cards)
    const botDraw = drawReplacements(players.value[p].cards, botHold, deck.value, false)
    deck.value = botDraw.deck
    players.value[p] = { ...players.value[p], cards: botDraw.cards }
    await wait(280)
  }

  status.value = 'Showdown!'
  await wait(350)

  for (let p = 0; p < players.value.length; p += 1) {
    if (players.value[p].isYou) continue
    await flipPlayerCards(p, true)
  }

  players.value = players.value.map((p) => ({
    ...p,
    result: evaluateHand(p.cards),
  }))

  const winners = findWinners(players.value)
  winnerIds.value = winners.map((w) => w.id)

  const share = Math.floor(pot.value / winners.length)
  const remainder = pot.value - share * winners.length
  const potWon = pot.value

  players.value = players.value.map((p) => {
    if (!winnerIds.value.includes(p.id)) return p
    const bonus = p.id === winners[0].id ? remainder : 0
    return {
      ...p,
      chips: p.chips + share + bonus,
      wins: p.wins + 1,
    }
  })

  if (winners.length === 1) {
    const w = winners[0]
    status.value = w.isYou
      ? `You win with ${w.result!.name}! (+${potWon})`
      : `${w.name} wins with ${w.result!.name}.`
  } else {
    status.value = `Split pot: ${winners.map((w) => w.name).join(', ')}`
  }

  pot.value = 0
  phase.value = 'showdown'
  busy.value = false
}

function resetTable() {
  if (busy.value) return
  players.value = createPlayers(props.username)
  pot.value = 0
  phase.value = 'idle'
  winnerIds.value = []
  held.value = [false, false, false, false, false]
  deck.value = []
  status.value = 'Table reset. Press Play to start.'
}
</script>

<template>
  <div class="table">
    <header class="hero">
      <p class="brand">FeltFlip</p>
      <h1>5-Card Draw · Three.js</h1>
      <p class="tagline">Welcome, <strong>{{ username }}</strong> — hold, draw, win.</p>
      <button class="btn ghost logout" type="button" :disabled="busy" @click="emit('logout')">
        Log out
      </button>
    </header>

    <div class="actions">
      <button
        v-if="phase === 'idle' || phase === 'showdown'"
        class="btn play"
        type="button"
        :disabled="!canStart"
        @click="startHand"
      >
        {{ phase === 'idle' ? '▶ Play' : '▶ Next hand' }} (−{{ ANTE }})
      </button>

      <button
        v-if="phase === 'choose'"
        class="btn play"
        type="button"
        :disabled="busy"
        @click="confirmDraw"
      >
        {{ discardCount === 0 ? 'Stand pat — Showdown' : `Draw ${discardCount} · Showdown` }}
      </button>

      <button
        v-if="phase === 'dealing' || phase === 'drawing'"
        class="btn play"
        type="button"
        disabled
      >
        {{ phase === 'dealing' ? 'Dealing…' : 'Drawing…' }}
      </button>

      <button class="btn ghost" type="button" :disabled="busy" @click="resetTable">
        Reset chips
      </button>
    </div>

    <p class="howto-inline">
      <template v-if="phase === 'choose'">
        Click your <strong>3D cards</strong> to HOLD, or click a <strong>name</strong> for score.
        Holding {{ holdCount }}/5.
      </template>
      <template v-else-if="phase === 'idle'">
        1) <strong>Play</strong> → 2) hold cards → 3) <strong>Draw</strong>. Click a name anytime for stats.
      </template>
      <template v-else-if="phase === 'showdown'">
        Hand over. Click a <strong>name</strong> to see score, or press <strong>Next hand</strong>.
      </template>
      <template v-else>Please wait…</template>
    </p>

    <div class="hud">
      <div class="stat">
        <span class="label">Your chips</span>
        <strong>{{ you.chips }}</strong>
      </div>
      <div class="stat">
        <span class="label">Pot</span>
        <strong>{{ pot }}</strong>
      </div>
      <div class="stat wide">
        <span class="label">Status</span>
        <strong class="status">{{ status }}</strong>
      </div>
    </div>

    <Table3D
      :players="players"
      :held="held"
      :phase="phase"
      :pot="pot"
      :winner-ids="winnerIds"
      :selectable="phase === 'choose'"
      @toggle-hold="toggleHold"
      @select-player="openPlayerModal"
    />

    <PlayerModal
      v-if="modalPlayer"
      :player="modalPlayer"
      @close="closePlayerModal"
    />

    <details class="howto">
      <summary>How to play</summary>
      <ol>
        <li>Press <strong>Play</strong> — you and 3 bots each pay {{ ANTE }} chips.</li>
        <li>Click your Three.js cards to <strong>HOLD</strong> the ones you want.</li>
        <li>Press <strong>Draw</strong> — unheld cards are replaced. Bots draw too.</li>
        <li>Showdown — best poker hand wins the pot.</li>
      </ol>
    </details>
  </div>
</template>

<style scoped>
.table {
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
  animation: rise 0.7s ease both;
}

.hero {
  text-align: center;
  margin-bottom: 1.25rem;
}

.brand {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(2.4rem, 7vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #f0c14b;
  line-height: 1;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  animation: brand-glow 2.8s ease-in-out infinite;
}

h1 {
  margin: 0.5rem 0 0;
  font-size: clamp(1rem, 2.5vw, 1.15rem);
  font-weight: 500;
  color: #d7ebe3;
}

.tagline {
  margin: 0.35rem 0 0;
  color: rgba(215, 235, 227, 0.72);
  font-size: 0.92rem;
}

.tagline strong {
  color: #f0c14b;
}

.logout {
  margin-top: 0.85rem;
}

.hud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat {
  min-width: 7rem;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  background: rgba(8, 28, 24, 0.55);
  border: 1px solid rgba(240, 193, 75, 0.18);
  text-align: center;
}

.stat.wide {
  min-width: min(100%, 280px);
  flex: 1 1 220px;
}

.stat .label {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(215, 235, 227, 0.65);
}

.stat strong {
  font-size: 1.15rem;
  color: #f7f2e4;
}

.stat strong.status {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.35;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.howto-inline {
  margin: 0 0 1.1rem;
  text-align: center;
  color: rgba(215, 235, 227, 0.78);
  font-size: 0.92rem;
}

.howto-inline strong {
  color: #f0c14b;
}

.btn {
  appearance: none;
  border: 1px solid rgba(240, 193, 75, 0.45);
  background: linear-gradient(180deg, #f0c14b, #d4a017);
  color: #1a2a22;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.7rem 1.25rem;
  border-radius: 999px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
}

.btn.play {
  font-size: 1.05rem;
  padding: 0.85rem 1.6rem;
}

.btn.play:not(:disabled) {
  animation: pulse 1.6s ease-in-out infinite;
}

.btn.ghost {
  background: transparent;
  color: #d7ebe3;
  border-color: rgba(215, 235, 227, 0.28);
  box-shadow: none;
  animation: none;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.65;
  cursor: default;
  animation: none;
}

.howto {
  margin: 1.35rem auto 0;
  max-width: 640px;
  color: rgba(215, 235, 227, 0.78);
  font-size: 0.92rem;
}

.howto summary {
  cursor: pointer;
  color: #f0c14b;
  font-weight: 600;
}

.howto ol {
  margin: 0.65rem 0 0;
  padding-left: 1.2rem;
}

.howto li {
  margin-bottom: 0.35rem;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes brand-glow {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.12);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
}
</style>
