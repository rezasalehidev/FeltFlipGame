import type { Player } from '../../types'
import { OPP_SPREAD, OPP_Z, YOU_Z } from './constants'

export interface SeatLayout {
  originX: number
  originZ: number
  scale: number
}

export function getSeatLayout(
  player: Player,
  opponentIndex: number,
  opponentCount: number,
): SeatLayout {
  if (player.isYou) {
    return { originX: 0, originZ: YOU_Z, scale: 1.2 }
  }
  return {
    originX: (opponentIndex - (opponentCount - 1) / 2) * OPP_SPREAD,
    originZ: OPP_Z,
    scale: 1.0,
  }
}
