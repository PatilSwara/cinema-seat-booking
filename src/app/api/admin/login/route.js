import { NextResponse } from "next/server";
import { adminPasswordMatches, newAdminSession } from "../../../../lib/session";

export async function POST(request) {
  try {
    const body = await request.json();
    if (!adminPasswordMatches(body.password)) return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
    const session = newAdminSession();
    const response = NextResponse.json({ success: true });
    response.cookies.set(session.name, session.value, session.options);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not sign in." }, { status: 400 });
  }
}
