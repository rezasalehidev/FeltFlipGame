import type { Card } from './card'

export type Phase = 'idle' | 'dealing' | 'choose' | 'drawing' | 'showdown'

export interface DealRoundResult {
  hands: Card[][]
  deck: Card[]
}

export interface DrawResult {
  cards: Card[]
  deck: Card[]
}
