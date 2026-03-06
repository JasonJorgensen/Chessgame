import { NextResponse } from "next/server";
import { createRoom, isRoomStoreError, type RoomSide } from "@/lib/gameRoomStore";

const buildPlayerUrl = (
  origin: string,
  roomId: string,
  side: RoomSide,
  token: string,
) => `${origin}/?room=${roomId}&side=${side}&token=${token}`;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      hostSide?: RoomSide;
    };
    const origin = new URL(request.url).origin;
    const hostSide = body.hostSide === "black" ? "black" : "white";
    const createdRoom = await createRoom(hostSide);

    return NextResponse.json({
      room: createdRoom.room,
      playerUrl: buildPlayerUrl(
        origin,
        createdRoom.room.roomId,
        hostSide,
        createdRoom.playerToken,
      ),
      inviteUrl: buildPlayerUrl(
        origin,
        createdRoom.room.roomId,
        createdRoom.inviteSide,
        createdRoom.inviteToken,
      ),
      roomUrl: `${origin}/?room=${createdRoom.room.roomId}`,
    });
  } catch (error) {
    if (isRoomStoreError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unable to create a game room right now." },
      { status: 500 },
    );
  }
}
