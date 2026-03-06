import type { PieceSymbol, Square } from "chess.js";
import type { LastMove, PlayerColor, UiBoard } from "../lib/chessEngine";

type BoardProps = {
  board: UiBoard;
  onSquareClick: (square: Square) => void;
  selectedSquare: Square | null;
  legalTargets: Square[];
  lastMove: LastMove | null;
};

const pieceToUnicode = (pieceType: PieceSymbol, color: PlayerColor): string => {
  if (color === "w") {
    switch (pieceType) {
      case "p":
        return "♙";
      case "r":
        return "♖";
      case "n":
        return "♘";
      case "b":
        return "♗";
      case "q":
        return "♕";
      case "k":
        return "♔";
      default:
        return "";
    }
  }

  switch (pieceType) {
    case "p":
      return "♟";
    case "r":
      return "♜";
    case "n":
      return "♞";
    case "b":
      return "♝";
    case "q":
      return "♛";
    case "k":
      return "♚";
    default:
      return "";
  }
};

export function Board({
  board,
  onSquareClick,
  selectedSquare,
  legalTargets,
  lastMove,
}: BoardProps) {
  return (
    <div className="chess-board">
      {board.map((row, rankIndex) =>
        row.map((square, fileIndex) => {
          const isLight = (rankIndex + fileIndex) % 2 === 0;
          const isSelected = square.square === selectedSquare;
          const isLegalTarget = legalTargets.includes(square.square);
          const isLastMoveSquare =
            lastMove &&
            (square.square === lastMove.from || square.square === lastMove.to);

          const classes = [
            "chess-square",
            isLight ? "light" : "dark",
            isSelected ? "selected" : "",
            isLegalTarget ? "legal-target" : "",
            isLastMoveSquare ? "last-move" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const glyph = square.piece
            ? pieceToUnicode(square.piece.type, square.piece.color)
            : "";

          return (
            <button
              key={square.square}
              type="button"
              className={classes}
              onClick={() => onSquareClick(square.square)}
              aria-label={square.square}
            >
              <span className="piece">{glyph}</span>
            </button>
          );
        }),
      )}
    </div>
  );
}

