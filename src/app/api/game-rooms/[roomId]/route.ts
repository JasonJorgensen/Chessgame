import { NextResponse } from "next/server";
import { getRoomSnapshot, isRoomStoreError } from "@/lib/gameRoomStore";

type RouteContext = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { roomId } = await context.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing room token." },
        { status: 400 },
      );
    }

    const room = await getRoomSnapshot(roomId, token);
    return NextResponse.json({ room });
  } catch (error) {
    if (isRoomStoreError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unable to load that game room." },
      { status: 500 },
    );
  }
}
