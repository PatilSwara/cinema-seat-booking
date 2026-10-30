import { NextResponse } from "next/server";
import { cancelBooking, CinemaError } from "../../../../../lib/cinema";
import { readGuestId } from "../../../../../lib/session";

export async function POST(_request, { params }) {
  try {
    const { reference } = await params;
    await cancelBooking(reference, await readGuestId());
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CinemaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Cancellation failed", error);
    return NextResponse.json({ error: "Could not cancel this booking." }, { status: 500 });
  }
}
