import { Redis } from "@upstash/redis";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import type { GameStatus, LastMove } from "./chessEngine";
import { getStatusFromFen } from "./chessEngine";

export type RoomSide = "white" | "black";
export type RoomStorageMode = "memory" | "redis";

type RoomRecord = {
  id: string;
  fen: string;
  whiteToken: string;
  blackToken: string;
  lastMove: LastMove | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomSnapshot = {
  roomId: string;
  fen: string;
  status: GameStatus;
  lastMove: LastMove | null;
  playerColor: Color;
  playerSide: RoomSide;
  storageMode: RoomStorageMode;
  updatedAt: string;
};

type CreateRoomResult = {
  room: RoomSnapshot;
  inviteToken: string;
  inviteSide: RoomSide;
  playerToken: string;
};

const ROOM_KEY_PREFIX = "chess-room:";
const ROOM_TTL_SECONDS = 60 * 60 * 24;

class RoomStoreError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RoomStoreError";
    this.statusCode = statusCode;
  }
}

const hasRedisConfig = () =>
  Boolean(
    process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_URL,
  ) &&
  Boolean(
    process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_READ_ONLY_TOKEN,
  );

const getRedisUrl = () =>
  process.env.KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL ??
  process.env.KV_URL;

const getRedisToken = () =>
  process.env.KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN ??
  process.env.KV_REST_API_READ_ONLY_TOKEN;

let redisClient: Redis | null = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis({
      url: getRedisUrl()!,
      token: getRedisToken()!,
    });
  }

  return redisClient;
};

const getMemoryRooms = () => {
  const globalRooms = globalThis as typeof globalThis & {
    __chessRooms?: Map<string, RoomRecord>;
  };

  if (!globalRooms.__chessRooms) {
    globalRooms.__chessRooms = new Map<string, RoomRecord>();
  }

  return globalRooms.__chessRooms;
};

const getStorageMode = (): RoomStorageMode =>
  hasRedisConfig() ? "redis" : "memory";

const assertStorageAvailable = () => {
  if (getStorageMode() === "memory" && process.env.VERCEL) {
    throw new RoomStoreError(
      "Multiplayer needs Redis configured in Vercel. Add an Upstash Redis integration first.",
      503,
    );
  }
};

const getRoomKey = (roomId: string) => `${ROOM_KEY_PREFIX}${roomId}`;

const getPlayerSideFromToken = (room: RoomRecord, token: string): RoomSide | null => {
  if (token === room.whiteToken) {
    return "white";
  }

  if (token === room.blackToken) {
    return "black";
  }

  return null;
};

const sideToColor = (side: RoomSide): Color => (side === "white" ? "w" : "b");

const getOpponentSide = (side: RoomSide): RoomSide =>
  side === "white" ? "black" : "white";

const buildSnapshot = (room: RoomRecord, playerSide: RoomSide): RoomSnapshot => ({
  roomId: room.id,
  fen: room.fen,
  status: getStatusFromFen(room.fen),
  lastMove: room.lastMove,
  playerColor: sideToColor(playerSide),
  playerSide,
  storageMode: getStorageMode(),
  updatedAt: room.updatedAt,
});

const saveRoom = async (room: RoomRecord) => {
  if (getStorageMode() === "redis") {
    await getRedisClient().set(getRoomKey(room.id), room, { ex: ROOM_TTL_SECONDS });
    return;
  }

  getMemoryRooms().set(room.id, room);
};

const readRoom = async (roomId: string): Promise<RoomRecord | null> => {
  if (getStorageMode() === "redis") {
    return (await getRedisClient().get(getRoomKey(roomId))) as RoomRecord | null;
  }

  return getMemoryRooms().get(roomId) ?? null;
};

const getRequiredRoom = async (roomId: string) => {
  assertStorageAvailable();

  const room = await readRoom(roomId);
  if (!room) {
    throw new RoomStoreError("Game room not found or expired.", 404);
  }

  return room;
};

export const isRoomStoreError = (error: unknown): error is RoomStoreError =>
  error instanceof RoomStoreError;

export const createRoom = async (hostSide: RoomSide = "white"): Promise<CreateRoomResult> => {
  assertStorageAvailable();

  const now = new Date().toISOString();
  const room: RoomRecord = {
    id: crypto.randomUUID().slice(0, 8),
    fen: new Chess().fen(),
    whiteToken: crypto.randomUUID(),
    blackToken: crypto.randomUUID(),
    lastMove: null,
    createdAt: now,
    updatedAt: now,
  };

  await saveRoom(room);

  return {
    room: buildSnapshot(room, hostSide),
    inviteToken: hostSide === "white" ? room.blackToken : room.whiteToken,
    inviteSide: getOpponentSide(hostSide),
    playerToken: hostSide === "white" ? room.whiteToken : room.blackToken,
  };
};

export const getRoomSnapshot = async (
  roomId: string,
  token: string,
): Promise<RoomSnapshot> => {
  const room = await getRequiredRoom(roomId);
  const playerSide = getPlayerSideFromToken(room, token);

  if (!playerSide) {
    throw new RoomStoreError("That invite link is no longer valid.", 403);
  }

  return buildSnapshot(room, playerSide);
};

export const makeRoomMove = async (input: {
  roomId: string;
  token: string;
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}): Promise<RoomSnapshot> => {
  const room = await getRequiredRoom(input.roomId);
  const playerSide = getPlayerSideFromToken(room, input.token);

  if (!playerSide) {
    throw new RoomStoreError("That invite link is no longer valid.", 403);
  }

  const game = new Chess(room.fen);
  const playerColor = sideToColor(playerSide);

  if (game.turn() !== playerColor) {
    throw new RoomStoreError("It is not your turn yet.", 409);
  }

  const move = game.move({
    from: input.from,
    to: input.to,
    promotion: input.promotion ?? "q",
  });

  if (!move) {
    throw new RoomStoreError("That move is not legal.", 400);
  }

  const updatedRoom: RoomRecord = {
    ...room,
    fen: game.fen(),
    lastMove: {
      from: move.from,
      to: move.to,
    },
    updatedAt: new Date().toISOString(),
  };

  await saveRoom(updatedRoom);
  return buildSnapshot(updatedRoom, playerSide);
};

export const resetRoom = async (roomId: string, token: string): Promise<RoomSnapshot> => {
  const room = await getRequiredRoom(roomId);
  const playerSide = getPlayerSideFromToken(room, token);

  if (!playerSide) {
    throw new RoomStoreError("That invite link is no longer valid.", 403);
  }

  const resetGame = new Chess();
  const updatedRoom: RoomRecord = {
    ...room,
    fen: resetGame.fen(),
    lastMove: null,
    updatedAt: new Date().toISOString(),
  };

  await saveRoom(updatedRoom);
  return buildSnapshot(updatedRoom, playerSide);
};
