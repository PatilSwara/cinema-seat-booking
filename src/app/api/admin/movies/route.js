import { NextResponse } from "next/server";
import { adminCreateMovie, CinemaError } from "../../../../lib/cinema";
import { isAdmin } from "../../../../lib/session";

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const id = await adminCreateMovie(await request.json());
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof CinemaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Movie creation failed", error);
    return NextResponse.json({ error: "Could not save movie." }, { status: 500 });
  }
}
