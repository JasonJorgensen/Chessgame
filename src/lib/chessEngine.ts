import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";

export type PlayerColor = Color;

export type UiPiece = {
  color: PlayerColor;
  type: PieceSymbol;
};

export type UiSquare = {
  square: Square;
  piece: UiPiece | null;
};

export type UiBoard = UiSquare[][];

export type GameStatus = {
  turn: PlayerColor;
  inCheck: boolean;
  inCheckmate: boolean;
  inDraw: boolean;
  inStalemate: boolean;
  isGameOver: boolean;
};

export type LastMove = {
  from: Square;
  to: Square;
};

export class ChessEngine {
  private game: Chess;

  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  reset() {
    this.game = new Chess();
  }

  getFen() {
    return this.game.fen();
  }

  loadFen(fen: string) {
    this.game = new Chess(fen);
  }

  getTurn(): PlayerColor {
    return this.game.turn();
  }

  getBoard(): UiBoard {
    const board = this.game.board();
    const uiBoard: UiBoard = [];

    for (let rank = 0; rank < 8; rank++) {
      const row: UiSquare[] = [];
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
        const square = `${fileChar}${8 - rank}` as Square;
        row.push({
          square,
          piece: piece
            ? {
                color: piece.color,
                type: piece.type,
              }
            : null,
        });
      }
      uiBoard.push(row);
    }

    return uiBoard;
  }

  getStatus(): GameStatus {
    const inCheckmate = this.game.isCheckmate();
    const inDraw = this.game.isDraw();
    const inStalemate = this.game.isStalemate();

    return {
      turn: this.game.turn(),
      inCheck: this.game.isCheck(),
      inCheckmate,
      inDraw,
      inStalemate,
      isGameOver: inCheckmate || inDraw || inStalemate,
    };
  }

  getLegalMoves(from?: Square): Move[] {
    if (from) {
      return this.game.moves({ square: from, verbose: true });
    }

    return this.game.moves({ verbose: true });
  }

  makeMove(from: Square, to: Square, promotion: PieceSymbol = "q"): Move | null {
    const move = this.game.move({ from, to, promotion });
    if (!move) {
      return null;
    }
    return move;
  }

  getLastMove(): LastMove | null {
    const history = this.game.history({ verbose: true });
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    return { from: last.from, to: last.to };
  }
}

export const getStatusFromFen = (fen: string): GameStatus => {
  const game = new Chess(fen);
  const inCheckmate = game.isCheckmate();
  const inDraw = game.isDraw();
  const inStalemate = game.isStalemate();

  return {
    turn: game.turn(),
    inCheck: game.isCheck(),
    inCheckmate,
    inDraw,
    inStalemate,
    isGameOver: inCheckmate || inDraw || inStalemate,
  };
};

