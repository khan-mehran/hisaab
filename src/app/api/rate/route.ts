import { NextResponse } from "next/server";
import { getRate } from "@/lib/rates/get-rate";

/**
 * GET /api/rate -> { qarPkr, usdQar, fetchedAt, stale }
 * Protected by the proxy (signed-in users only).
 */
export async function GET() {
  const rate = await getRate();

  if (!rate) {
    return NextResponse.json(
      { error: "Exchange rate unavailable. Check your connection and try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Private and short-lived: never cache authenticated responses for long.
  return NextResponse.json(rate, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
