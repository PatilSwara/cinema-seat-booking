import { NextResponse } from "next/server";
import { CinemaError, createBooking } from "../../../lib/cinema";
import { newGuestSession, readGuestId } from "../../../lib/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const currentGuest = await readGuestId();
    const newSession = currentGuest ? null : newGuestSession();
    const booking = await createBooking({
      guestId: currentGuest || newSession.id,
      showtimeId: body.showtimeId,
      seatIds: body.seatIds,
      customer: body.customer,
    });
    const response = NextResponse.json(booking, { status: 201 });
    if (newSession) response.cookies.set(newSession.cookie.name, newSession.cookie.value, newSession.cookie.options);
    return response;
  } catch (error) {
    if (error instanceof CinemaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Booking failed", error);
    return NextResponse.json({ error: "We could not complete the booking. Please try again." }, { status: 500 });
  }
}
