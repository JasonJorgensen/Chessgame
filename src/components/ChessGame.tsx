"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import {
  ChessEngine,
  type GameStatus,
  type LastMove,
  type PlayerColor,
} from "../lib/chessEngine";
import {
  createOnlineRoom,
  fetchOnlineRoom,
  resetOnlineRoom,
  sendOnlineMove,
  type OnlineRoomSnapshot,
} from "../lib/gameRoomApi";
import { chooseSimpleAiMove } from "../lib/simpleAi";
import {
  AnalysisRuntime,
  type AnalysisResult,
  type EngineDifficulty,
} from "../lib/analysis.runtime";
import {
  STYLE_PRESET_OPTIONS,
  STYLE_PRESETS,
  type StylePresetName,
} from "../lib/stylePresets";
import { AnalysisPanel } from "./AnalysisPanel";
import { Board } from "./Board";

type PlayerSide = "white" | "black";
type AiStrategy = "stockfish" | "simple";
type GameMode = "ai" | "online";
type ChessGameProps = {
  aiDelayMs?: number;
  initialFen?: string;
  playerColor?: PlayerColor;
  aiStrategy?: AiStrategy;
  analysisEnabledDefault?: boolean;
};

type StatusText = {
  headline: string;
  detail?: string;
};

type RoomSession = {
  roomId: string;
  token: string;
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
  playerColor: initialPlayerColor = "w",
  aiStrategy = "stockfish",
  analysisEnabledDefault = false,
}: ChessGameProps) {
  const engineRef = useRef<ChessEngine | null>(null);
  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const pendingAiTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const aiRuntimeRef = useRef<AnalysisRuntime | null>(null);
  const analysisRuntimeRef = useRef<AnalysisRuntime | null>(null);
  const analysisRequestRef = useRef(0);
  const onlinePollRef = useRef<number | null>(null);
  const roomBusyRef = useRef(false);
  const [gameMode, setGameMode] = useState<GameMode>("ai");
  const [roomSession, setRoomSession] = useState<RoomSession | null>(null);
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomSnapshot | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [fen, setFen] = useState(initialFen ?? "start");
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [playerColor, setPlayerColor] =
    useState<PlayerColor>(initialPlayerColor);
  const [stylePresetName, setStylePresetName] =
    useState<StylePresetName>("royal");
  const [difficulty, setDifficulty] = useState<EngineDifficulty>("medium");
  const [analysisEnabled, setAnalysisEnabled] = useState(
    analysisEnabledDefault,
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [boardWidth, setBoardWidth] = useState(720);

  const isOnlineMode = gameMode === "online";
  const controlledColor = isOnlineMode
    ? (onlineRoom?.playerColor ?? playerColor)
    : playerColor;
  const playerSide: PlayerSide = controlledColor === "w" ? "white" : "black";
  const aiColor = getAiColor(playerColor);
  const stylePreset = STYLE_PRESETS[stylePresetName];
  const rootStyle = useMemo(
    () =>
      ({
        "--page-background": stylePreset.pageBackground,
        "--panel-background": stylePreset.panelBackground,
        "--panel-border": stylePreset.panelBorder,
        "--panel-accent": stylePreset.accent,
      }) as CSSProperties,
    [stylePreset],
  );

  useEffect(() => {
    roomBusyRef.current = roomBusy;
  }, [roomBusy]);

  const getErrorMessage = useCallback(
    (error: unknown) =>
      error instanceof Error ? error.message : "Something went wrong.",
    [],
  );

  const replaceBrowserUrl = useCallback((nextUrl: string) => {
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const clearRoomUrl = useCallback(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("room");
    nextUrl.searchParams.delete("side");
    nextUrl.searchParams.delete("token");
    replaceBrowserUrl(`${nextUrl.pathname}${nextUrl.search}`);
  }, [replaceBrowserUrl]);

  const syncFromEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setFen(engine.getFen());
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

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalTargets([]);
  }, []);

  const syncFromOnlineRoom = useCallback(
    (room: OnlineRoomSnapshot) => {
      clearPendingAiMove();
      setGameMode("online");
      setOnlineRoom(room);
      if (!engineRef.current) {
        engineRef.current = new ChessEngine(room.fen);
      } else {
        engineRef.current.loadFen(room.fen);
      }
      clearSelection();
      setIsAiThinking(false);
      setFen(room.fen);
      setStatus(room.status);
      setLastMove(room.lastMove);
    },
    [clearPendingAiMove, clearSelection],
  );

  const stopAnalysis = useCallback(() => {
    analysisRequestRef.current += 1;
    analysisRuntimeRef.current?.stop();
  }, []);

  const ensureAiRuntime = useCallback(() => {
    if (!aiRuntimeRef.current) {
      aiRuntimeRef.current = new AnalysisRuntime();
    }
    return aiRuntimeRef.current;
  }, []);

  const ensureAnalysisRuntime = useCallback(() => {
    if (!analysisRuntimeRef.current) {
      analysisRuntimeRef.current = new AnalysisRuntime();
    }
    return analysisRuntimeRef.current;
  }, []);

  const loadOnlineRoom = useCallback(
    async (showSpinner = false) => {
      if (!roomSession) {
        return null;
      }

      if (showSpinner) {
        setRoomLoading(true);
      }

      try {
        const room = await fetchOnlineRoom(roomSession.roomId, roomSession.token);
        syncFromOnlineRoom(room);
        setRoomError(null);
        return room;
      } catch (error) {
        setRoomError(getErrorMessage(error));
        return null;
      } finally {
        if (showSpinner) {
          setRoomLoading(false);
        }
      }
    },
    [getErrorMessage, roomSession, syncFromOnlineRoom],
  );

  const submitOnlineMove = useCallback(
    async (from: Square, to: Square, promotion: PieceSymbol = "q") => {
      if (!roomSession) {
        return;
      }

      setRoomBusy(true);
      setRoomError(null);

      try {
        const room = await sendOnlineMove({
          roomId: roomSession.roomId,
          token: roomSession.token,
          from,
          to,
          promotion,
        });
        syncFromOnlineRoom(room);
      } catch (error) {
        setRoomError(getErrorMessage(error));
        await loadOnlineRoom();
      } finally {
        setRoomBusy(false);
      }
    },
    [getErrorMessage, loadOnlineRoom, roomSession, syncFromOnlineRoom],
  );

  const handleCreateOnlineRoom = useCallback(async () => {
    setRoomBusy(true);
    setRoomError(null);
    setCopyFeedback(null);

    try {
      const response = await createOnlineRoom(playerColor === "w" ? "white" : "black");
      const token = new URL(response.playerUrl).searchParams.get("token");

      if (!token) {
        throw new Error("The room was created, but the player token is missing.");
      }

      setRoomSession({
        roomId: response.room.roomId,
        token,
      });
      setInviteUrl(response.inviteUrl);
      setPlayerUrl(response.playerUrl);
      syncFromOnlineRoom(response.room);
      replaceBrowserUrl(response.playerUrl);
    } catch (error) {
      setRoomError(getErrorMessage(error));
    } finally {
      setRoomBusy(false);
    }
  }, [getErrorMessage, playerColor, replaceBrowserUrl, syncFromOnlineRoom]);

  const handleResetOnlineRoom = useCallback(async () => {
    if (!roomSession) {
      return;
    }

    setRoomBusy(true);
    setRoomError(null);

    try {
      const room = await resetOnlineRoom(roomSession.roomId, roomSession.token);
      syncFromOnlineRoom(room);
    } catch (error) {
      setRoomError(getErrorMessage(error));
    } finally {
      setRoomBusy(false);
    }
  }, [getErrorMessage, roomSession, syncFromOnlineRoom]);

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopyFeedback(successMessage);
      } catch {
        setCopyFeedback("Copy failed on this browser.");
      }
    },
    [],
  );

  const resetGame = useCallback((nextPlayerColor?: PlayerColor) => {
    clearPendingAiMove();
    stopAnalysis();
    engineRef.current = new ChessEngine(initialFen);
    if (nextPlayerColor === "w" || nextPlayerColor === "b") {
      setPlayerColor(nextPlayerColor);
    }
    clearSelection();
    setIsAiThinking(false);
    setAnalysisLoading(false);
    setAnalysisResult(null);
    syncFromEngine();
  }, [clearPendingAiMove, clearSelection, initialFen, stopAnalysis, syncFromEngine]);

  const handleLeaveOnlineRoom = useCallback(() => {
    if (onlinePollRef.current !== null) {
      window.clearInterval(onlinePollRef.current);
      onlinePollRef.current = null;
    }

    setGameMode("ai");
    setRoomSession(null);
    setOnlineRoom(null);
    setInviteUrl(null);
    setPlayerUrl(null);
    setRoomLoading(false);
    setRoomBusy(false);
    setRoomError(null);
    setCopyFeedback(null);
    clearRoomUrl();
    resetGame();
  }, [clearRoomUrl, resetGame]);

  useEffect(() => {
    mountedRef.current = true;
    engineRef.current = new ChessEngine(initialFen);
    syncFromEngine();
    if (aiStrategy === "stockfish") {
      ensureAiRuntime();
    }

    const boardHost = boardHostRef.current;
    if (boardHost && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(([entry]) => {
        const nextWidth = Math.min(Math.max(entry.contentRect.width, 320), 820);
        setBoardWidth(Math.round(nextWidth));
      });
      observer.observe(boardHost);
      return () => {
        mountedRef.current = false;
        clearPendingAiMove();
        if (onlinePollRef.current !== null) {
          window.clearInterval(onlinePollRef.current);
          onlinePollRef.current = null;
        }
        stopAnalysis();
        aiRuntimeRef.current?.dispose();
        analysisRuntimeRef.current?.dispose();
        observer.disconnect();
      };
    }

    return () => {
      mountedRef.current = false;
      clearPendingAiMove();
      if (onlinePollRef.current !== null) {
        window.clearInterval(onlinePollRef.current);
        onlinePollRef.current = null;
      }
      stopAnalysis();
      aiRuntimeRef.current?.dispose();
      analysisRuntimeRef.current?.dispose();
    };
  }, [
    aiStrategy,
    clearPendingAiMove,
    ensureAiRuntime,
    initialFen,
    stopAnalysis,
    syncFromEngine,
  ]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const roomId = currentUrl.searchParams.get("room");
    const token = currentUrl.searchParams.get("token");

    if (!roomId || !token) {
      return;
    }

    setRoomSession({ roomId, token });
    setPlayerUrl(currentUrl.toString());
    setGameMode("online");
  }, []);

  useEffect(() => {
    if (!roomSession) {
      return;
    }

    void loadOnlineRoom(true);

    if (onlinePollRef.current !== null) {
      window.clearInterval(onlinePollRef.current);
    }

    onlinePollRef.current = window.setInterval(() => {
      if (!roomBusyRef.current) {
        void loadOnlineRoom();
      }
    }, 2000);

    return () => {
      if (onlinePollRef.current !== null) {
        window.clearInterval(onlinePollRef.current);
        onlinePollRef.current = null;
      }
    };
  }, [loadOnlineRoom, roomSession]);

  const getFallbackMove = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return null;
    }
    const move = chooseSimpleAiMove(engine);
    if (!move) {
      return null;
    }
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    };
  }, []);

  const applyMove = useCallback(
    (from: Square, to: Square, promotion: PieceSymbol = "q") => {
      const engine = engineRef.current;
      if (!engine) {
        return false;
      }

      const move = engine.makeMove(from, to, promotion);
      if (!move) {
        return false;
      }

      clearSelection();
      syncFromEngine();
      return true;
    },
    [clearSelection, syncFromEngine],
  );

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
      void (async () => {
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

      let aiMove = null;

      if (aiStrategy === "stockfish") {
        try {
          aiMove = await ensureAiRuntime().getBestMove(
            currentEngine.getFen(),
            difficulty,
          );
        } catch {
          aiMove = getFallbackMove();
        }
      } else {
        aiMove = getFallbackMove();
      }

      if (
        aiMove &&
        !currentEngine.getStatus().isGameOver &&
        currentEngine.getTurn() === aiColor
      ) {
        currentEngine.makeMove(aiMove.from, aiMove.to, aiMove.promotion);
      }

      if (mountedRef.current) {
        setIsAiThinking(false);
        syncFromEngine();
      }
      })();
    }, aiDelayMs);
  }, [
    aiColor,
    aiDelayMs,
    aiStrategy,
    clearPendingAiMove,
    difficulty,
    ensureAiRuntime,
    getFallbackMove,
    syncFromEngine,
  ]);

  const requestAnalysis = useCallback(async () => {
    if (!analysisEnabled) {
      stopAnalysis();
      setAnalysisLoading(false);
      setAnalysisResult(null);
      return;
    }

    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setAnalysisLoading(true);

    try {
      const result =
        aiStrategy === "stockfish"
          ? await ensureAnalysisRuntime().analyzePosition(engine.getFen(), difficulty)
          : {
              bestMove: getFallbackMove(),
              lines: [],
            };

      if (!mountedRef.current || analysisRequestRef.current !== requestId) {
        return;
      }

      setAnalysisResult(result);
    } catch {
      if (!mountedRef.current || analysisRequestRef.current !== requestId) {
        return;
      }
      setAnalysisResult(null);
    } finally {
      if (mountedRef.current && analysisRequestRef.current === requestId) {
        setAnalysisLoading(false);
      }
    }
  }, [
    aiStrategy,
    analysisEnabled,
    difficulty,
    ensureAnalysisRuntime,
    getFallbackMove,
    stopAnalysis,
  ]);

  useEffect(() => {
    void requestAnalysis();
    return () => {
      if (analysisEnabled) {
        stopAnalysis();
      }
    };
  }, [analysisEnabled, difficulty, fen, requestAnalysis, stopAnalysis]);

  useEffect(() => {
    if (!status || status.isGameOver || isAiThinking || isOnlineMode) {
      return;
    }

    if (engineRef.current?.getTurn() === aiColor) {
      scheduleAiMove();
    }
  }, [aiColor, isAiThinking, isOnlineMode, scheduleAiMove, status]);

  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square | null) => {
      const engine = engineRef.current;
      if (
        !engine ||
        !targetSquare ||
        !status ||
        status.isGameOver ||
        isAiThinking ||
        roomLoading ||
        roomBusy ||
        engine.getTurn() !== controlledColor
      ) {
        return false;
      }

      const moved = applyMove(sourceSquare, targetSquare);
      if (moved) {
        if (isOnlineMode) {
          void submitOnlineMove(sourceSquare, targetSquare);
        } else {
          scheduleAiMove();
        }
      }
      return moved;
    },
    [
      applyMove,
      controlledColor,
      isAiThinking,
      isOnlineMode,
      roomBusy,
      roomLoading,
      scheduleAiMove,
      status,
      submitOnlineMove,
    ],
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      const engine = engineRef.current;
      if (!engine || !status || isAiThinking || roomBusy || roomLoading) return;

      if (engine.getTurn() !== controlledColor) {
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
        setLegalTargets(movesFromSquare.map((move) => move.to));
        return;
      }

      if (square === selectedSquare) {
        clearSelection();
        return;
      }

      if (!applyMove(selectedSquare, square)) {
        const movesFromSquare = engine.getLegalMoves(square);
        if (movesFromSquare.length > 0) {
          setSelectedSquare(square);
          setLegalTargets(movesFromSquare.map((move) => move.to));
        } else {
          clearSelection();
        }
        return;
      }

      if (isOnlineMode) {
        void submitOnlineMove(selectedSquare, square);
      } else {
        scheduleAiMove();
      }
    },
    [
      applyMove,
      clearSelection,
      controlledColor,
      isAiThinking,
      isOnlineMode,
      roomBusy,
      roomLoading,
      scheduleAiMove,
      selectedSquare,
      status,
      submitOnlineMove,
    ],
  );

  const uiStatus = status ? statusToText(status) : null;
  const boardDisabled = isOnlineMode
    ? Boolean(status?.isGameOver) ||
      roomLoading ||
      roomBusy ||
      status?.turn !== controlledColor
    : Boolean(status?.isGameOver) || isAiThinking;
  const onlineTurnMessage =
    isOnlineMode && status && !status.isGameOver
      ? status.turn === controlledColor
        ? "Your move."
        : "Waiting for your friend to move."
      : null;
  const analysisArrow =
    analysisEnabled && analysisResult?.bestMove
      ? [
          {
            startSquare: analysisResult.bestMove.from,
            endSquare: analysisResult.bestMove.to,
            color: stylePreset.accent,
          },
        ]
      : [];

  return (
    <div className="chess-app" style={rootStyle}>
      <header className="chess-header">
        <h1>{isOnlineMode ? "Play Chess Online" : "Play Chess vs Computer"}</h1>
        <p>
          You are playing as{" "}
          <strong>{playerSide === "white" ? "White" : "Black"}</strong>
          {isOnlineMode && onlineRoom ? (
            <> in room <strong>{onlineRoom.roomId.toUpperCase()}</strong>.</>
          ) : (
            "."
          )}
        </p>
      </header>

      <main className="chess-main">
        <section className="board-section">
          <div className="board-stage" ref={boardHostRef}>
            <Board
              fen={fen}
              boardWidth={boardWidth}
              stylePreset={stylePreset}
              orientation={playerSide}
              selectedSquare={selectedSquare}
              legalTargets={legalTargets}
              lastMove={lastMove}
              analysisArrow={analysisArrow}
              disabled={boardDisabled}
              onPieceDrop={handlePieceDrop}
              onSquareClick={handleSquareClick}
            />
          </div>
        </section>

        <section className="sidebar">
          <div className="status-card">
            <h2>{uiStatus?.headline ?? "Loading..."}</h2>
            <p>{uiStatus?.detail}</p>
            {isAiThinking && !isOnlineMode && (
              <p className="ai-thinking">Computer is thinking…</p>
            )}
            {onlineTurnMessage && <p className="online-thinking">{onlineTurnMessage}</p>}
            {roomError && <p className="room-error">{roomError}</p>}
          </div>

          <div className="controls-card">
            {!isOnlineMode && (
              <>
                <div className="control-group">
                  <label htmlFor="difficulty">Difficulty</label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(event.target.value as EngineDifficulty)
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div className="control-group">
                  <label htmlFor="style-preset">Style</label>
                  <select
                    id="style-preset"
                    value={stylePresetName}
                    onChange={(event) =>
                      setStylePresetName(event.target.value as StylePresetName)
                    }
                  >
                    {STYLE_PRESET_OPTIONS.map((preset) => (
                      <option key={preset.name} value={preset.name}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label htmlFor="player-color">Play as</label>
                  <select
                    id="player-color"
                    value={playerColor}
                    onChange={(event) =>
                      resetGame(event.target.value as PlayerColor)
                    }
                  >
                    <option value="w">White</option>
                    <option value="b">Black</option>
                  </select>
                </div>
              </>
            )}

            {isOnlineMode ? (
              <div className="control-group">
                <label>Online room</label>
                <div className="room-panel">
                  <p>
                    Share the invite link with your friend so they can join as{" "}
                    <strong>{playerSide === "white" ? "Black" : "White"}</strong>.
                  </p>
                  {inviteUrl ? (
                    <input readOnly value={inviteUrl} aria-label="Invite link" />
                  ) : (
                    <p className="room-muted">
                      Invite link is only shown on the device that created the room.
                    </p>
                  )}
                  {playerUrl && (
                    <input readOnly value={playerUrl} aria-label="Player link" />
                  )}
                  <div className="button-row">
                    {inviteUrl && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void copyText(inviteUrl, "Invite link copied.")}
                      >
                        Copy Invite
                      </button>
                    )}
                    {playerUrl && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void copyText(playerUrl, "Your room link copied.")}
                      >
                        Copy My Link
                      </button>
                    )}
                  </div>
                  {copyFeedback && <p className="room-muted">{copyFeedback}</p>}
                  {onlineRoom?.storageMode === "memory" && (
                    <p className="room-warning">
                      Local memory mode is active. Add Redis in Vercel before using this in
                      production.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleCreateOnlineRoom()}
                disabled={roomBusy}
              >
                Play With a Friend
              </button>
            )}

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={analysisEnabled}
                onChange={(event) => setAnalysisEnabled(event.target.checked)}
              />
              <span>Show analysis and best move</span>
            </label>

            <button
              type="button"
              className="new-game-button"
              onClick={isOnlineMode ? handleResetOnlineRoom : () => resetGame()}
              disabled={roomBusy}
            >
              {isOnlineMode ? "Reset Room" : "New Game"}
            </button>

            {isOnlineMode && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleLeaveOnlineRoom}
              >
                Leave Online Room
              </button>
            )}
          </div>

          <AnalysisPanel
            analysis={analysisResult}
            enabled={analysisEnabled}
            loading={analysisLoading}
            currentFen={fen}
            stylePreset={stylePreset}
            orientation={playerSide}
          />

          <div className="hint-card">
            <p>{stylePreset.description}</p>
            <p>
              {isOnlineMode
                ? "Share your invite link, then take turns moving pieces. The board refreshes automatically every few seconds."
                : "Drag pieces to move, or click a piece and then a destination square. Invalid drags snap back automatically."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

