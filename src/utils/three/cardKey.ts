import type { Card } from '../../types'

export function faceKey(card: Card): string {
  return `${card.rank}-${card.suit}`
}

export function tableSignature(players: { id: string; cards: Card[] }[]): string {
  return players
    .map((p) => `${p.id}:${p.cards.map((c) => faceKey(c)).join(',')}`)
    .join('|')
}
