import { NextResponse } from "next/server";
import { adminUpdateShowtime, CinemaError } from "../../../../../lib/cinema";
import { isAdmin } from "../../../../../lib/session";

export async function PATCH(request, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const { id } = await params;
    await adminUpdateShowtime(id, await request.json());
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CinemaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Showtime update failed", error);
    return NextResponse.json({ error: "Could not update showtime." }, { status: 500 });
  }
}
