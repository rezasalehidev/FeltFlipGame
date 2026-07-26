import type { HandResult } from "./player";

export interface PlayerModalData {
  id: string;
  name: string;
  isYou: boolean;
  chips: number;
  wins: number;
  handName: string;
  handRank: number;
  handScore: number;
  isWinner: boolean;
  cardsSummary: string;
}

export function emptyHandResult(): HandResult {
  return { name: "—", rank: 0, score: 0 };
}
