import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import test from "node:test";

const filename = `data/test-${randomUUID()}.db`;
process.env.DATABASE_URL = `file:./${filename}`;
execFileSync(process.execPath, ["scripts/setup-db.mjs"], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL } });

const {
  adminCreateShowtime,
  adminUpdateShowtime,
  cancelBooking,
  createBooking,
  getGuestBooking,
  getSeatMap,
  getMovieShowtimes,
  listGuestBookings,
  listMovies,
} = await import("../src/lib/cinema.js");

test("movie catalog, booking, conflicts, cancellation, and admin rules use the persistent database", async () => {
  try {
    const movies = await listMovies();
    assert.equal(movies.length, 3);
    const shows = await getMovieShowtimes("midnight-signal");
    assert.equal(shows.length, 3);
    const showtimeId = shows[0].id;
    const initialMap = await getSeatMap(showtimeId);
    assert.equal(initialMap.seats.length, 48);
    assert.equal(initialMap.seats.find((seat) => seat.id === "A1").booked, 0);

    const booking = await createBooking({
      guestId: "guest-one",
      showtimeId,
      seatIds: ["A1", "E1"],
      customer: { name: "Test Visitor", email: "visitor@example.com" },
    });
    assert.equal(booking.total, 430);
    assert.match(booking.reference, /^RS-[A-F0-9]{10}$/);
    assert.equal((await getSeatMap(showtimeId)).seats.find((seat) => seat.id === "A1").booked, 1);
    assert.equal((await getGuestBooking(booking.reference, "guest-one")).seat_labels, "A1, E1");
    assert.equal(await getGuestBooking(booking.reference, "guest-two"), null);
    assert.equal((await listGuestBookings("guest-one")).length, 1);

    await assert.rejects(
      createBooking({ guestId: "guest-two", showtimeId, seatIds: ["A1"], customer: { name: "Second Visitor", email: "second@example.com" } }),
      (error) => error.status === 409,
    );
    assert.equal((await listGuestBookings("guest-two")).length, 0);
    await assert.rejects(cancelBooking(booking.reference, "guest-two"), (error) => error.status === 404);
    await assert.rejects(adminUpdateShowtime(showtimeId, { startsAt: new Date(Date.now() + 86400000).toISOString(), standardPrice: 200, premiumPrice: 280 }), (error) => error.status === 409);

    await cancelBooking(booking.reference, "guest-one");
    assert.equal((await getGuestBooking(booking.reference, "guest-one")).status, "cancelled");
    assert.equal((await getSeatMap(showtimeId)).seats.find((seat) => seat.id === "A1").booked, 0);
    const secondBooking = await createBooking({ guestId: "guest-two", showtimeId, seatIds: ["A1"], customer: { name: "Second Visitor", email: "second@example.com" } });
    assert.equal(secondBooking.total, 180);

    await assert.rejects(adminCreateShowtime({ movieId: "midnight-signal", startsAt: shows[0].starts_at, standardPrice: 180, premiumPrice: 250 }), (error) => error.status === 409);
    await assert.rejects(createBooking({ guestId: "guest-three", showtimeId, seatIds: ["X9"], customer: { name: "Third Visitor", email: "third@example.com" } }), (error) => error.status === 400);
  } finally {
    await unlink(filename).catch(() => {});
  }
});
