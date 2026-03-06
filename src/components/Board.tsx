"use client";

import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import type { Square } from "chess.js";
import type { LastMove } from "../lib/chessEngine";
import type { StylePreset } from "../lib/stylePresets";
import { getPieceRenderers } from "../lib/pieceThemes";

const Chessboard = dynamic(
  () => import("react-chessboard").then((module) => module.Chessboard),
  { ssr: false },
);

export type AnalysisArrow = {
  startSquare: string;
  endSquare: string;
  color: string;
};

type BoardProps = {
  fen: string;
  boardWidth: number;
  stylePreset: StylePreset;
  orientation: "white" | "black";
  selectedSquare: Square | null;
  legalTargets: Square[];
  lastMove: LastMove | null;
  analysisArrow: AnalysisArrow[];
  disabled?: boolean;
  onSquareClick: (square: Square) => void;
  onPieceDrop: (sourceSquare: Square, targetSquare: Square | null) => boolean;
};

const createSquareStyles = ({
  legalTargets,
  selectedSquare,
  lastMove,
  stylePreset,
}: Pick<
  BoardProps,
  "legalTargets" | "selectedSquare" | "lastMove" | "stylePreset"
>): Record<string, CSSProperties> => {
  const squareStyles: Record<string, CSSProperties> = {};

  for (const target of legalTargets) {
    squareStyles[target] = {
      boxShadow: `inset 0 0 0 999px ${stylePreset.moveHint}`,
      borderRadius: "0",
    };
  }

  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...(squareStyles[selectedSquare] ?? {}),
      boxShadow: `inset 0 0 0 4px ${stylePreset.selectedRing}`,
    };
  }

  if (lastMove) {
    for (const square of [lastMove.from, lastMove.to]) {
      squareStyles[square] = {
        ...(squareStyles[square] ?? {}),
        outline: "3px solid rgba(255, 255, 255, 0.4)",
        outlineOffset: "-3px",
      };
    }
  }

  return squareStyles;
};

export function Board({
  fen,
  boardWidth,
  stylePreset,
  orientation,
  selectedSquare,
  legalTargets,
  lastMove,
  analysisArrow,
  disabled = false,
  onSquareClick,
  onPieceDrop,
}: BoardProps) {
  return (
    <div className="board-shell" style={{ width: `${boardWidth}px` }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: !disabled,
          allowDragOffBoard: true,
          showNotation: true,
          pieces: getPieceRenderers(stylePreset.pieceTheme),
          arrows: analysisArrow,
          animationDurationInMs: 160,
          boardStyle: {
            width: "100%",
            borderRadius: "26px",
            overflow: "hidden",
            boxShadow: "0 24px 65px rgba(15, 23, 42, 0.35)",
          },
          lightSquareStyle: {
            backgroundColor: stylePreset.lightSquare,
          },
          darkSquareStyle: {
            backgroundColor: stylePreset.darkSquare,
          },
          squareStyles: createSquareStyles({
            legalTargets,
            selectedSquare,
            lastMove,
            stylePreset,
          }),
          canDragPiece: ({ piece }) => !disabled && piece?.pieceType?.startsWith(orientation[0]),
          onSquareClick: ({ square }) => onSquareClick(square as Square),
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            onPieceDrop(sourceSquare as Square, targetSquare as Square | null),
        }}
      />
    </div>
  );
}

