import type { PieceSymbol, Square } from "chess.js";
import type { LastMove, PlayerColor, GameStatus } from "./chessEngine";
import type { RoomSide, RoomStorageMode } from "./gameRoomStore";

export type OnlineRoomSnapshot = {
  roomId: string;
  fen: string;
  status: GameStatus;
  lastMove: LastMove | null;
  playerColor: PlayerColor;
  playerSide: RoomSide;
  storageMode: RoomStorageMode;
  updatedAt: string;
};

export type CreateRoomResponse = {
  room: OnlineRoomSnapshot;
  playerUrl: string;
  inviteUrl: string;
  roomUrl: string;
};

type ApiErrorResponse = {
  error?: string;
};

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
};

export const createOnlineRoom = async (hostSide: RoomSide = "white") => {
  const response = await fetch("/api/game-rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hostSide }),
  });

  return readJson<CreateRoomResponse>(response);
};

export const fetchOnlineRoom = async (roomId: string, token: string) => {
  const response = await fetch(
    `/api/game-rooms/${roomId}?token=${encodeURIComponent(token)}`,
    {
      cache: "no-store",
    },
  );
  const payload = await readJson<{ room: OnlineRoomSnapshot }>(response);
  return payload.room;
};

export const sendOnlineMove = async (input: {
  roomId: string;
  token: string;
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}) => {
  const response = await fetch(`/api/game-rooms/${input.roomId}/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: input.token,
      from: input.from,
      to: input.to,
      promotion: input.promotion,
    }),
  });

  const payload = await readJson<{ room: OnlineRoomSnapshot }>(response);
  return payload.room;
};

export const resetOnlineRoom = async (roomId: string, token: string) => {
  const response = await fetch(`/api/game-rooms/${roomId}/reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const payload = await readJson<{ room: OnlineRoomSnapshot }>(response);
  return payload.room;
};
