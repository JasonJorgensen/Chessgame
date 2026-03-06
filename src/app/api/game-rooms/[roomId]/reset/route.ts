import { NextResponse } from "next/server";
import { isRoomStoreError, resetRoom } from "@/lib/gameRoomStore";

type RouteContext = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { roomId } = await context.params;
    const body = (await request.json()) as {
      token?: string;
    };

    if (!body.token) {
      return NextResponse.json(
        { error: "Missing room token." },
        { status: 400 },
      );
    }

    const room = await resetRoom(roomId, body.token);
    return NextResponse.json({ room });
  } catch (error) {
    if (isRoomStoreError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unable to reset that room." },
      { status: 500 },
    );
  }
}
