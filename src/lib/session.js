import crypto from "node:crypto";
import { cookies } from "next/headers";

const guestCookie = "reelseat_guest";
const adminCookie = "reelseat_admin";

function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return process.env.SESSION_SECRET;
}

function signature(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifySignedValue(token) {
  if (typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const value = token.slice(0, dot);
  return safeEqual(signature(value), token.slice(dot + 1)) ? value : null;
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function readGuestId() {
  const store = await cookies();
  const id = verifySignedValue(store.get(guestCookie)?.value);
  return id && /^[0-9a-f-]{36}$/.test(id) ? id : null;
}

export function newGuestSession() {
  const id = crypto.randomUUID();
  return { id, cookie: { name: guestCookie, value: `${id}.${signature(id)}`, options: cookieOptions(60 * 60 * 24 * 30) } };
}

export async function isAdmin() {
  const store = await cookies();
  const expires = verifySignedValue(store.get(adminCookie)?.value);
  return Boolean(expires && Number(expires) > Date.now());
}

export function adminPasswordMatches(candidate) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || configured.length < 12 || typeof candidate !== "string") return false;
  return safeEqual(crypto.createHash("sha256").update(configured).digest("hex"), crypto.createHash("sha256").update(candidate).digest("hex"));
}

export function newAdminSession() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  return { name: adminCookie, value: `${expires}.${signature(expires)}`, options: cookieOptions(8 * 60 * 60) };
}

export function clearAdminSession() {
  return { name: adminCookie, value: "", options: cookieOptions(0) };
}
