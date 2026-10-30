import { NextResponse } from "next/server";
import { getSeatMap } from "../../../../../lib/cinema";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const map = await getSeatMap(id);
  if (!map) return NextResponse.json({ error: "Showtime not found." }, { status: 404 });
  return NextResponse.json({ seats: map.seats }, { headers: { "Cache-Control": "no-store" } });
}
