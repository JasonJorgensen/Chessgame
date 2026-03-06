"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, Square } from "chess.js";
import {
  ChessEngine,
  type GameStatus,
  type LastMove,
  type PlayerColor,
  type UiBoard,
} from "../lib/chessEngine";
import { chooseSimpleAiMove } from "../lib/simpleAi";
import { Board } from "./Board";

type PlayerSide = "white" | "black";
type ChessGameProps = {
  aiDelayMs?: number;
  initialFen?: string;
  playerColor?: PlayerColor;
};

type StatusText = {
  headline: string;
  detail?: string;
};

const statusToText = (status: GameStatus): StatusText => {
  const turnText = status.turn === "w" ? "White" : "Black";

  if (status.inCheckmate) {
    const winner = status.turn === "w" ? "Black" : "White";
    return {
      headline: `Checkmate · ${winner} wins`,
      detail: `${turnText} is checkmated.`,
    };
  }

  if (status.inStalemate) {
    return {
      headline: "Draw · Stalemate",
      detail: "The side to move has no legal moves.",
    };
  }

  if (status.inDraw) {
    return {
      headline: "Draw",
      detail: "The game ended in a draw.",
    };
  }

  let detail = `${turnText} to move.`;
  if (status.inCheck) {
    detail += " (in check)";
  }

  return {
    headline: "In progress",
    detail,
  };
};

const getAiColor = (playerColor: Color): Color => (playerColor === "w" ? "b" : "w");

export function ChessGame({
  aiDelayMs = 250,
  initialFen,
  playerColor = "w",
}: ChessGameProps) {
  const engineRef = useRef<ChessEngine | null>(null);
  const pendingAiTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const [board, setBoard] = useState<UiBoard>([]);
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const playerSide: PlayerSide = playerColor === "w" ? "white" : "black";
  const aiColor = getAiColor(playerColor);

  const syncFromEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setBoard(engine.getBoard());
    const gameStatus = engine.getStatus();
    setStatus(gameStatus);
    setLastMove(engine.getLastMove());
  }, []);

  const clearPendingAiMove = useCallback(() => {
    if (pendingAiTimeoutRef.current !== null) {
      window.clearTimeout(pendingAiTimeoutRef.current);
      pendingAiTimeoutRef.current = null;
    }
  }, []);

  const resetGame = useCallback(() => {
    clearPendingAiMove();
    if (!engineRef.current) {
      engineRef.current = new ChessEngine();
    } else {
      engineRef.current.reset();
    }
    setSelectedSquare(null);
    setLegalTargets([]);
    setIsAiThinking(false);
    syncFromEngine();
  }, [clearPendingAiMove, syncFromEngine]);

  useEffect(() => {
    mountedRef.current = true;
    if (!engineRef.current) {
      engineRef.current = new ChessEngine(initialFen);
    }
    syncFromEngine();
    return () => {
      mountedRef.current = false;
      clearPendingAiMove();
    };
  }, [clearPendingAiMove, initialFen, syncFromEngine]);

  const scheduleAiMove = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const currentStatus = engine.getStatus();
    if (currentStatus.isGameOver || engine.getTurn() !== aiColor) {
      return;
    }

    clearPendingAiMove();
    setIsAiThinking(true);

    pendingAiTimeoutRef.current = window.setTimeout(() => {
      pendingAiTimeoutRef.current = null;

      const currentEngine = engineRef.current;
      if (!currentEngine) {
        if (mountedRef.current) {
          setIsAiThinking(false);
        }
        return;
      }

      const currentStatus = currentEngine.getStatus();
      if (currentStatus.isGameOver || currentEngine.getTurn() !== aiColor) {
        if (mountedRef.current) {
          setIsAiThinking(false);
          syncFromEngine();
        }
        return;
      }

      const aiMove = chooseSimpleAiMove(currentEngine);
      if (aiMove) {
        currentEngine.makeMove(aiMove.from, aiMove.to, aiMove.promotion);
      }

      if (mountedRef.current) {
        setIsAiThinking(false);
        syncFromEngine();
      }
    }, aiDelayMs);
  }, [aiColor, aiDelayMs, clearPendingAiMove, syncFromEngine]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      const engine = engineRef.current;
      if (!engine || !status || isAiThinking) return;

      if (engine.getTurn() === aiColor) {
        return;
      }

      if (status.isGameOver) {
        return;
      }

      if (!selectedSquare) {
        const movesFromSquare = engine.getLegalMoves(square);
        if (movesFromSquare.length === 0) {
          return;
        }
        setSelectedSquare(square);
        setLegalTargets(movesFromSquare.map((m) => m.to));
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      const move = engine.makeMove(selectedSquare, square);
      if (!move) {
        const movesFromSquare = engine.getLegalMoves(square);
        if (movesFromSquare.length > 0) {
          setSelectedSquare(square);
          setLegalTargets(movesFromSquare.map((m) => m.to));
        }
        return;
      }

      setSelectedSquare(null);
      setLegalTargets([]);
      syncFromEngine();
      scheduleAiMove();
    },
    [aiColor, isAiThinking, scheduleAiMove, selectedSquare, status, syncFromEngine],
  );

  const uiStatus = status ? statusToText(status) : null;

  return (
    <div className="chess-app">
      <header className="chess-header">
        <h1>Play Chess vs Computer</h1>
        <p>
          You are playing as{" "}
          <strong>{playerSide === "white" ? "White" : "Black"}</strong>.
        </p>
      </header>

      <main className="chess-main">
        <section className="board-section">
          {board.length > 0 && (
            <Board
              board={board}
              onSquareClick={handleSquareClick}
              selectedSquare={selectedSquare}
              legalTargets={legalTargets}
              lastMove={lastMove}
            />
          )}
        </section>

        <section className="sidebar">
          <div className="status-card">
            <h2>{uiStatus?.headline ?? "Loading..."}</h2>
            <p>{uiStatus?.detail}</p>
            {isAiThinking && <p className="ai-thinking">Computer is thinking…</p>}
          </div>

          <button
            type="button"
            className="new-game-button"
            onClick={resetGame}
          >
            New Game
          </button>

          <div className="hint">
            <p>Tap or click a piece, then its destination square to move.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

