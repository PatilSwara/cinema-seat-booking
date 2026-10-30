import { NextResponse } from "next/server";
import { clearAdminSession } from "../../../../lib/session";

export async function POST() {
  const cookie = clearAdminSession();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
