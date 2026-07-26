export type SuitId = 'hearts' | 'diamonds' | 'clubs' | 'spades'

export type CardColor = 'red' | 'black'

export interface Suit {
  id: SuitId
  symbol: string
  color: CardColor
}

export interface Rank {
  id: string
  label: string
  value: number
}

export interface Card {
  id: number
  rank: string
  label: string
  value: number
  suit: SuitId
  symbol: string
  color: CardColor
  flipped: boolean
}
