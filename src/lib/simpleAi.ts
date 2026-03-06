import type { Move } from "chess.js";
import { ChessEngine } from "./chessEngine";

export type AiSelectedMove = Move | null;

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

const evaluateMove = (move: Move): number => {
  let score = 0;

  if (move.captured) {
    const value = PIECE_VALUES[move.captured] ?? 0;
    score += value * 10;
  }

  if (move.san.includes("+")) {
    score += 2;
  }

  if (move.san.includes("#")) {
    score += 100;
  }

  return score;
};

export const chooseSimpleAiMove = (engine: ChessEngine): AiSelectedMove => {
  const moves = engine.getLegalMoves();
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of moves) {
    const score = evaluateMove(move);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  const chosen =
    bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? moves[0];
  return chosen;
};

