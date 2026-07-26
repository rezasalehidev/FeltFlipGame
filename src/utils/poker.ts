import type {
  Card,
  DealRoundResult,
  DrawResult,
  HandResult,
  Player,
  Rank,
  Suit,
} from '../types'

const SUITS: Suit[] = [
  { id: 'hearts', symbol: '♥', color: 'red' },
  { id: 'diamonds', symbol: '♦', color: 'red' },
  { id: 'clubs', symbol: '♣', color: 'black' },
  { id: 'spades', symbol: '♠', color: 'black' },
]

const RANKS: Rank[] = [
  { id: 'A', label: 'A', value: 14 },
  { id: 'K', label: 'K', value: 13 },
  { id: 'Q', label: 'Q', value: 12 },
  { id: 'J', label: 'J', value: 11 },
  { id: '10', label: '10', value: 10 },
  { id: '9', label: '9', value: 9 },
  { id: '8', label: '8', value: 8 },
  { id: '7', label: '7', value: 7 },
  { id: '6', label: '6', value: 6 },
  { id: '5', label: '5', value: 5 },
  { id: '4', label: '4', value: 4 },
  { id: '3', label: '3', value: 3 },
  { id: '2', label: '2', value: 2 },
]

export const ANTE = 10
export const HAND_SIZE = 5

export function createDeck(): Card[] {
  const deck: Card[] = []
  let id = 0
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: id++,
        rank: rank.id,
        label: rank.label,
        value: rank.value,
        suit: suit.id,
        symbol: suit.symbol,
        color: suit.color,
        flipped: false,
      })
    }
  }
  return deck
}

export function shuffle<T>(list: T[]): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

/** Deal hands and return leftover deck for redraws. */
export function dealRound(
  playerCount: number,
  cardsPerHand = HAND_SIZE,
): DealRoundResult {
  const deck = shuffle(createDeck())
  const hands: Card[][] = []
  let cursor = 0
  for (let p = 0; p < playerCount; p += 1) {
    hands.push(
      deck.slice(cursor, cursor + cardsPerHand).map((card) => ({
        ...card,
        flipped: false,
      })),
    )
    cursor += cardsPerHand
  }
  return { hands, deck: deck.slice(cursor) }
}

function isStraight(values: number[]): boolean {
  const unique = [...new Set(values)].sort((a, b) => a - b)
  if (unique.length !== 5) return false
  if (unique.join(',') === '2,3,4,5,14') return true
  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i] !== unique[i - 1] + 1) return false
  }
  return true
}

function scoreFromValues(values: number[]): number {
  const sorted = [...values].sort((a, b) => b - a)
  return sorted.reduce((acc, v, i) => acc + v * 15 ** (4 - i), 0)
}

export function evaluateHand(cards: Card[]): HandResult {
  if (!cards.length) return { name: '—', rank: 0, score: 0 }

  const values = cards.map((c) => c.value).sort((a, b) => a - b)
  const suits = cards.map((c) => c.suit)
  const flush = suits.every((s) => s === suits[0])
  const straight = isStraight(values)

  const counts: Record<number, number> = {}
  for (const v of values) counts[v] = (counts[v] || 0) + 1

  const byCount = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value)

  const groups = byCount.map((g) => g.count)
  const kickers = byCount.flatMap((g) => Array(g.count).fill(g.value) as number[])
  const baseScore = scoreFromValues(kickers)

  if (straight && flush) {
    const isRoyal = values.join(',') === '10,11,12,13,14'
    const straightHigh = values.join(',') === '2,3,4,5,14' ? 5 : Math.max(...values)
    return isRoyal
      ? { name: 'Royal Flush', rank: 10, score: baseScore }
      : { name: 'Straight Flush', rank: 9, score: straightHigh }
  }
  if (groups[0] === 4) return { name: 'Four of a Kind', rank: 8, score: baseScore }
  if (groups[0] === 3 && groups[1] === 2) return { name: 'Full House', rank: 7, score: baseScore }
  if (flush) return { name: 'Flush', rank: 6, score: baseScore }
  if (straight) {
    const straightHigh = values.join(',') === '2,3,4,5,14' ? 5 : Math.max(...values)
    return { name: 'Straight', rank: 5, score: straightHigh }
  }
  if (groups[0] === 3) return { name: 'Three of a Kind', rank: 4, score: baseScore }
  if (groups[0] === 2 && groups[1] === 2) return { name: 'Two Pair', rank: 3, score: baseScore }
  if (groups[0] === 2) return { name: 'One Pair', rank: 2, score: baseScore }
  return { name: 'High Card', rank: 1, score: baseScore }
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  return a.score - b.score
}

export function findWinners(players: Player[]): Player[] {
  const withResults = players.filter((p) => p.result)
  if (!withResults.length) return []

  let best = withResults[0]
  const winners: Player[] = [best]

  for (let i = 1; i < withResults.length; i += 1) {
    const p = withResults[i]
    const cmp = compareHands(p.result!, best.result!)
    if (cmp > 0) {
      best = p
      winners.length = 0
      winners.push(p)
    } else if (cmp === 0) {
      winners.push(p)
    }
  }
  return winners
}

/** Simple bot: keep pairs/trips and high cards; discard the rest. */
export function botHoldIndexes(cards: Card[]): boolean[] {
  const result = evaluateHand(cards)
  const hold = cards.map(() => false)

  if (result.rank >= 5) {
    return cards.map(() => true)
  }

  const counts: Record<number, number> = {}
  for (const c of cards) counts[c.value] = (counts[c.value] || 0) + 1

  if (result.rank >= 2) {
    for (let i = 0; i < cards.length; i += 1) {
      if ((counts[cards[i].value] || 0) >= 2) hold[i] = true
    }
    return hold
  }

  for (let i = 0; i < cards.length; i += 1) {
    if (cards[i].value >= 12) hold[i] = true
  }
  if (!hold.some(Boolean)) {
    let best = 0
    for (let i = 1; i < cards.length; i += 1) {
      if (cards[i].value > cards[best].value) best = i
    }
    hold[best] = true
  }
  return hold
}

export function drawReplacements(
  cards: Card[],
  hold: boolean[],
  deck: Card[],
  faceUp: boolean,
): DrawResult {
  const nextDeck = [...deck]
  const nextCards = cards.map((card, i) => {
    if (hold[i]) return card
    const drawn = nextDeck.shift()
    if (!drawn) return card
    return { ...drawn, flipped: faceUp }
  })
  return { cards: nextCards, deck: nextDeck }
}

export function createPlayers(displayName = 'You'): Player[] {
  return [
    { id: 'you', name: displayName, isYou: true, chips: 100, wins: 0, cards: [], result: null },
    { id: 'alex', name: 'Alex', isYou: false, chips: 100, wins: 0, cards: [], result: null },
    { id: 'sam', name: 'Sam', isYou: false, chips: 100, wins: 0, cards: [], result: null },
    { id: 'riley', name: 'Riley', isYou: false, chips: 100, wins: 0, cards: [], result: null },
  ]
}
