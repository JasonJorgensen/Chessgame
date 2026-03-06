import { NextResponse } from "next/server";
import type { PieceSymbol, Square } from "chess.js";
import { isRoomStoreError, makeRoomMove } from "@/lib/gameRoomStore";

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
      from?: Square;
      to?: Square;
      promotion?: PieceSymbol;
    };

    if (!body.token || !body.from || !body.to) {
      return NextResponse.json(
        { error: "Missing move details." },
        { status: 400 },
      );
    }

    const room = await makeRoomMove({
      roomId,
      token: body.token,
      from: body.from,
      to: body.to,
      promotion: body.promotion,
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (isRoomStoreError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unable to send that move." },
      { status: 500 },
    );
  }
}
