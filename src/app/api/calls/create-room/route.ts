import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        // REMOVED: name property entirely
        properties: {
          enable_chat: false,
          enable_knocking: false,
          exp: Math.round(Date.now() / 1000) + 60 * 60 * 2, // 2 hours
        },
      }),
    });

    const room = await response.json();

    if (!response.ok) {
      throw new Error(room.error || "Failed to create room");
    }

    // Daily still returns the generated room.url and room.name perfectly here!
    return NextResponse.json({ url: room.url, name: room.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}