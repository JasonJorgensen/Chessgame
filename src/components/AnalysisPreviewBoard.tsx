"use client";

import { useMemo } from "react";
import { Chess, type Square } from "chess.js";
import type { StylePreset } from "../lib/stylePresets";
import { getPieceRenderers } from "../lib/pieceThemes";

type AnalysisPreviewBoardProps = {
  baseFen: string;
  moves: string[];
  stylePreset: StylePreset;
  orientation: "white" | "black";
};

type PreviewMove = {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
};

const parseUciMove = (move: string): PreviewMove | null => {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
    return null;
  }

  return {
    from: move.slice(0, 2) as Square,
    to: move.slice(2, 4) as Square,
    promotion: move[4] as PreviewMove["promotion"],
  };
};

const buildPreview = (
  baseFen: string,
  moves: string[],
  orientation: "white" | "black",
) => {
  const game = baseFen === "start" ? new Chess() : new Chess(baseFen);
  const firstMove = moves[0] ? parseUciMove(moves[0]) : null;

  if (firstMove) {
    game.move(firstMove);
  }

  const board = game.board();
  const ranks =
    orientation === "white" ? board : [...board].reverse().map((row) => [...row].reverse());

  return {
    board: ranks,
    highlightedSquares: firstMove ? [firstMove.from, firstMove.to] : [],
  };
};

export function AnalysisPreviewBoard({
  baseFen,
  moves,
  stylePreset,
  orientation,
}: AnalysisPreviewBoardProps) {
  const preview = useMemo(
    () => buildPreview(baseFen, moves, orientation),
    [baseFen, moves, orientation],
  );

  const renderers = getPieceRenderers(stylePreset.pieceTheme);

  return (
    <div className="analysis-preview-popover">
      <div className="analysis-preview-board">
        {preview.board.map((row, rankIndex) =>
          row.map((piece, fileIndex) => {
            const boardRank = orientation === "white" ? rankIndex : 7 - rankIndex;
            const boardFile = orientation === "white" ? fileIndex : 7 - fileIndex;
            const fileChar = String.fromCharCode("a".charCodeAt(0) + boardFile);
            const square = `${fileChar}${8 - boardRank}` as Square;
            const pieceKey = piece
              ? `${piece.color}${piece.type.toUpperCase()}`
              : null;
            const PieceRenderer = pieceKey ? renderers[pieceKey] : null;
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            const isHighlighted = preview.highlightedSquares.includes(square);

            return (
              <div
                key={square}
                className="analysis-preview-square"
                style={{
                  backgroundColor: isLight
                    ? stylePreset.lightSquare
                    : stylePreset.darkSquare,
                  boxShadow: isHighlighted
                    ? `inset 0 0 0 2px ${stylePreset.selectedRing}`
                    : undefined,
                }}
              >
                {PieceRenderer ? (
                  <PieceRenderer
                    svgStyle={{ width: "82%", height: "82%" }}
                  />
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

