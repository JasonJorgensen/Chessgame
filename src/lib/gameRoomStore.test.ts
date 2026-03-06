import { beforeEach, describe, expect, it } from "vitest";
import {
  createRoom,
  getRoomSnapshot,
  makeRoomMove,
  resetRoom,
} from "./gameRoomStore";

const clearRoomStore = () => {
  const globalRooms = globalThis as typeof globalThis & {
    __chessRooms?: Map<string, unknown>;
  };

  globalRooms.__chessRooms?.clear();
};

describe("gameRoomStore", () => {
  beforeEach(() => {
    delete process.env.VERCEL;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    clearRoomStore();
  });

  it("creates a room and gives the invitee the opposite color", async () => {
    const createdRoom = await createRoom("white");
    const invitedRoom = await getRoomSnapshot(
      createdRoom.room.roomId,
      createdRoom.inviteToken,
    );

    expect(createdRoom.room.playerColor).toBe("w");
    expect(invitedRoom.playerColor).toBe("b");
    expect(invitedRoom.roomId).toBe(createdRoom.room.roomId);
  });

  it("stores moves and lets either player reset the room", async () => {
    const createdRoom = await createRoom("white");
    const movedRoom = await makeRoomMove({
      roomId: createdRoom.room.roomId,
      token: createdRoom.playerToken,
      from: "e2",
      to: "e4",
    });
    const blackView = await getRoomSnapshot(
      createdRoom.room.roomId,
      createdRoom.inviteToken,
    );
    const resetView = await resetRoom(
      createdRoom.room.roomId,
      createdRoom.inviteToken,
    );

    expect(movedRoom.status.turn).toBe("b");
    expect(blackView.lastMove).toEqual({ from: "e2", to: "e4" });
    expect(resetView.lastMove).toBeNull();
    expect(resetView.status.turn).toBe("w");
  });

  it("rejects moves from the wrong side", async () => {
    const createdRoom = await createRoom("white");

    await expect(
      makeRoomMove({
        roomId: createdRoom.room.roomId,
        token: createdRoom.inviteToken,
        from: "e7",
        to: "e5",
      }),
    ).rejects.toThrow("It is not your turn yet.");
  });
});
