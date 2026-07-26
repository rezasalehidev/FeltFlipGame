import type { Card } from "./card";

export interface HandResult {
  name: string;
  rank: number;
  score: number;
}

export interface Player {
  id: string;
  name: string;
  isYou: boolean;
  chips: number;
  wins: number;
  cards: Card[];
  result: HandResult | null;
}
