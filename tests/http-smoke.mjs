import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const db = createClient({ url: process.env.DATABASE_URL || "file:./data/cinema.db", authToken: process.env.TURSO_AUTH_TOKEN || undefined });
let reference;
let createdMovieId;
let createdShowtimeId;

try {
  const showResult = await db.execute({
    sql: "SELECT id FROM showtimes WHERE active = 1 AND starts_at > ? ORDER BY starts_at LIMIT 1",
    args: [new Date().toISOString()],
  });
  const showtimeId = showResult.rows[0]?.id;
  assert.ok(showtimeId, "A future showtime is needed for the smoke test.");
  const seatsBefore = await fetch(`${base}/api/showtimes/${showtimeId}/seats`).then((response) => response.json());
  const seat = seatsBefore.seats.find((item) => !item.booked);
  assert.ok(seat, "A free seat is needed for the smoke test.");

  const bookingResponse = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showtimeId, seatIds: [seat.id], customer: { name: "Smoke Test", email: "smoke@example.com" } }),
  });
  assert.equal(bookingResponse.status, 201);
  const booking = await bookingResponse.json();
  reference = booking.reference;
  const cookie = bookingResponse.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "The booking should set a signed guest cookie.");

  const ticketResponse = await fetch(`${base}/tickets/${reference}`, { headers: { Cookie: cookie } });
  assert.equal(ticketResponse.status, 200);
  assert.match(await ticketResponse.text(), new RegExp(reference));
  const historyResponse = await fetch(`${base}/bookings`, { headers: { Cookie: cookie } });
  assert.match(await historyResponse.text(), new RegExp(reference));

  const seatsBooked = await fetch(`${base}/api/showtimes/${showtimeId}/seats`).then((response) => response.json());
  assert.equal(seatsBooked.seats.find((item) => item.id === seat.id).booked, 1);
  const duplicateResponse = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showtimeId, seatIds: [seat.id], customer: { name: "Another Guest", email: "other@example.com" } }),
  });
  assert.equal(duplicateResponse.status, 409);

  const cancelResponse = await fetch(`${base}/api/bookings/${reference}/cancel`, { method: "POST", headers: { Cookie: cookie } });
  assert.equal(cancelResponse.status, 200);
  const seatsAfter = await fetch(`${base}/api/showtimes/${showtimeId}/seats`).then((response) => response.json());
  assert.equal(seatsAfter.seats.find((item) => item.id === seat.id).booked, 0);

  const adminResponse = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(adminResponse.status, 200);
  const adminCookie = adminResponse.headers.get("set-cookie")?.split(";")[0];
  const dashboardResponse = await fetch(`${base}/admin`, { headers: { Cookie: adminCookie } });
  assert.equal(dashboardResponse.status, 200);
  assert.match(await dashboardResponse.text(), /Admin dashboard/);

  const unauthorizedMovie = await fetch(`${base}/api/admin/movies`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Unauthorized" }),
  });
  assert.equal(unauthorizedMovie.status, 403);

  const movieResponse = await fetch(`${base}/api/admin/movies`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ title: "Smoke Test Film", genre: "Drama", duration: 91, synopsis: "A temporary film created to test the admin workflow." }),
  });
  assert.equal(movieResponse.status, 201);
  createdMovieId = (await movieResponse.json()).id;
  const future = new Date(Date.now() + 20 * 86400000);
  future.setUTCHours(20, 0, 0, 0);
  const showResponse = await fetch(`${base}/api/admin/showtimes`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ movieId: createdMovieId, startsAt: future.toISOString(), standardPrice: 150, premiumPrice: 210 }),
  });
  assert.equal(showResponse.status, 201);
  createdShowtimeId = (await showResponse.json()).id;
  const updateResponse = await fetch(`${base}/api/admin/movies/${createdMovieId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ title: "Smoke Test Film Edited", genre: "Drama", duration: 92, synopsis: "A temporary film created to verify updates in the admin workflow." }),
  });
  assert.equal(updateResponse.status, 200);
  const updateShowResponse = await fetch(`${base}/api/admin/showtimes/${createdShowtimeId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ startsAt: future.toISOString(), standardPrice: 160, premiumPrice: 220 }),
  });
  assert.equal(updateShowResponse.status, 200);
  const editedMoviePage = await fetch(`${base}/movies/${createdMovieId}`).then((response) => response.text());
  assert.match(editedMoviePage, /Smoke Test Film Edited/);

  console.log("HTTP smoke test passed: booking, ticket, history, seat conflict, cancellation, and admin create/edit.");
} finally {
  if (createdShowtimeId) await db.execute({ sql: "DELETE FROM showtimes WHERE id = ?", args: [createdShowtimeId] });
  if (createdMovieId) await db.execute({ sql: "DELETE FROM movies WHERE id = ?", args: [createdMovieId] });
  if (reference) {
    const found = await db.execute({ sql: "SELECT id FROM bookings WHERE reference = ?", args: [reference] });
    if (found.rows[0]) {
      await db.execute({ sql: "DELETE FROM booking_seats WHERE booking_id = ?", args: [found.rows[0].id] });
      await db.execute({ sql: "DELETE FROM bookings WHERE id = ?", args: [found.rows[0].id] });
    }
  }
  db.close();
}
