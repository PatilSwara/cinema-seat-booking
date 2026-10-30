import { NextResponse } from "next/server";
import { adminUpdateMovie, CinemaError } from "../../../../../lib/cinema";
import { isAdmin } from "../../../../../lib/session";

export async function PATCH(request, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const { id } = await params;
    await adminUpdateMovie(id, await request.json());
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CinemaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Movie update failed", error);
    return NextResponse.json({ error: "Could not update movie." }, { status: 500 });
  }
}
