import crypto from "node:crypto";
import { getDatabase } from "./database.js";

export class CinemaError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function money(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount));
}

export function formatShowtime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.NEXT_PUBLIC_CINEMA_TIME_ZONE || "Asia/Kolkata",
  }).format(new Date(value));
}

export async function listMovies({ search = "", genre = "" } = {}) {
  const db = getDatabase();
  const result = await db.execute({
    sql: `SELECT m.*, COUNT(s.id) AS upcoming_showtimes
          FROM movies m LEFT JOIN showtimes s ON s.movie_id = m.id AND s.active = 1 AND s.starts_at > ?
          WHERE m.active = 1 AND m.title LIKE ? AND (? = '' OR m.genre = ?)
          GROUP BY m.id ORDER BY m.title`,
    args: [new Date().toISOString(), `%${String(search).slice(0, 80)}%`, genre, genre],
  });
  return result.rows;
}

export async function listGenres() {
  const result = await getDatabase().execute("SELECT DISTINCT genre FROM movies WHERE active = 1 ORDER BY genre");
  return result.rows.map((row) => row.genre);
}

export async function getMovie(id) {
  const result = await getDatabase().execute({ sql: "SELECT * FROM movies WHERE id = ? AND active = 1", args: [id] });
  return result.rows[0] || null;
}

export async function getMovieShowtimes(movieId) {
  const result = await getDatabase().execute({
    sql: `SELECT s.*, a.name AS auditorium_name FROM showtimes s
          JOIN auditoriums a ON a.id = s.auditorium_id
          WHERE s.movie_id = ? AND s.active = 1 AND s.starts_at > ? ORDER BY s.starts_at`,
    args: [movieId, new Date().toISOString()],
  });
  return result.rows;
}

export async function getShowtime(id) {
  const result = await getDatabase().execute({
    sql: `SELECT s.*, m.title AS movie_title, m.poster_path, m.poster_alt, m.duration_minutes, a.name AS auditorium_name
          FROM showtimes s JOIN movies m ON m.id = s.movie_id
          JOIN auditoriums a ON a.id = s.auditorium_id
          WHERE s.id = ? AND s.active = 1 AND m.active = 1`,
    args: [id],
  });
  return result.rows[0] || null;
}

export async function getSeatMap(showtimeId) {
  const showtime = await getShowtime(showtimeId);
  if (!showtime || new Date(showtime.starts_at).getTime() <= Date.now()) return null;
  const result = await getDatabase().execute({
    sql: `SELECT s.id, s.row_label, s.seat_number, s.tier,
            CASE WHEN bs.seat_id IS NULL THEN 0 ELSE 1 END AS booked
          FROM seats s LEFT JOIN booking_seats bs
            ON bs.seat_id = s.id AND bs.showtime_id = ? AND bs.status = 'confirmed'
          WHERE s.auditorium_id = ? ORDER BY s.row_label, s.seat_number`,
    args: [showtimeId, showtime.auditorium_id],
  });
  return { showtime, seats: result.rows };
}

function normalizeCustomer(customer) {
  const name = String(customer?.name || "").trim().replace(/\s+/g, " ");
  const email = String(customer?.email || "").trim().toLowerCase();
  if (name.length < 2 || name.length > 60) throw new CinemaError("Enter your name (2–60 characters).");
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CinemaError("Enter a valid email address.");
  return { name, email };
}

export async function createBooking({ guestId, showtimeId, seatIds, customer }) {
  if (!guestId) throw new CinemaError("Your booking session has expired. Refresh and try again.", 401);
  if (typeof showtimeId !== "string" || !Array.isArray(seatIds)) throw new CinemaError("Choose a showtime and seats.");
  const uniqueIds = [...new Set(seatIds)];
  if (uniqueIds.length < 1 || uniqueIds.length > 6 || uniqueIds.length !== seatIds.length || uniqueIds.some((id) => typeof id !== "string")) {
    throw new CinemaError("Choose between one and six different seats.");
  }
  const buyer = normalizeCustomer(customer);
  const db = getDatabase();
  const tx = await db.transaction("write");
  try {
    const showResult = await tx.execute({
      sql: `SELECT s.*, m.active AS movie_active FROM showtimes s JOIN movies m ON m.id = s.movie_id WHERE s.id = ?`,
      args: [showtimeId],
    });
    const show = showResult.rows[0];
    if (!show || !show.active || !show.movie_active || new Date(show.starts_at).getTime() <= Date.now()) {
      throw new CinemaError("This showtime is no longer available.", 409);
    }
    const placeholders = uniqueIds.map(() => "?").join(",");
    const seatResult = await tx.execute({
      sql: `SELECT id, tier FROM seats WHERE auditorium_id = ? AND id IN (${placeholders})`,
      args: [show.auditorium_id, ...uniqueIds],
    });
    if (seatResult.rows.length !== uniqueIds.length) throw new CinemaError("One of the selected seats is invalid.");
    const prices = new Map(seatResult.rows.map((seat) => [seat.id, seat.tier === "premium" ? Number(show.premium_price) : Number(show.standard_price)]));
    const total = uniqueIds.reduce((sum, id) => sum + prices.get(id), 0);
    const bookingId = crypto.randomUUID();
    const reference = `RS-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    await tx.execute({
      sql: `INSERT INTO bookings (id, reference, guest_id, showtime_id, customer_name, customer_email, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      args: [bookingId, reference, guestId, showtimeId, buyer.name, buyer.email, total],
    });
    for (const seatId of uniqueIds) {
      await tx.execute({
        sql: `INSERT INTO booking_seats (booking_id, showtime_id, seat_id, price_at_booking, status)
              VALUES (?, ?, ?, ?, 'confirmed')`,
        args: [bookingId, showtimeId, seatId, prices.get(seatId)],
      });
    }
    await tx.commit();
    return { reference, total };
  } catch (error) {
    await tx.rollback();
    if (error instanceof CinemaError) throw error;
    if (/UNIQUE constraint failed|SQLITE_CONSTRAINT|constraint failed/i.test(String(error.message))) {
      throw new CinemaError("A selected seat was just booked. Choose another seat.", 409);
    }
    throw error;
  }
}

export async function listGuestBookings(guestId) {
  if (!guestId) return [];
  const result = await getDatabase().execute({
    sql: `SELECT b.reference, b.customer_name, b.customer_email, b.total_amount, b.status, b.created_at,
            s.starts_at, s.id AS showtime_id, m.title AS movie_title, a.name AS auditorium_name,
            GROUP_CONCAT(st.row_label || st.seat_number, ', ') AS seat_labels
          FROM bookings b JOIN showtimes s ON s.id = b.showtime_id
          JOIN movies m ON m.id = s.movie_id JOIN auditoriums a ON a.id = s.auditorium_id
          JOIN booking_seats bs ON bs.booking_id = b.id JOIN seats st ON st.id = bs.seat_id
          WHERE b.guest_id = ? GROUP BY b.id ORDER BY b.created_at DESC`,
    args: [guestId],
  });
  return result.rows;
}

export async function getGuestBooking(reference, guestId) {
  if (!guestId) return null;
  const bookings = await listGuestBookings(guestId);
  return bookings.find((booking) => booking.reference === reference) || null;
}

export async function cancelBooking(reference, guestId) {
  if (!guestId) throw new CinemaError("This booking is not available in your current browser session.", 403);
  const tx = await getDatabase().transaction("write");
  try {
    const result = await tx.execute({
      sql: "SELECT id, status FROM bookings WHERE reference = ? AND guest_id = ?",
      args: [reference, guestId],
    });
    const booking = result.rows[0];
    if (!booking) throw new CinemaError("Booking not found.", 404);
    if (booking.status !== "confirmed") throw new CinemaError("This booking is already cancelled.", 409);
    await tx.execute({ sql: "UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?", args: [booking.id] });
    await tx.execute({ sql: "UPDATE booking_seats SET status = 'cancelled' WHERE booking_id = ?", args: [booking.id] });
    await tx.commit();
    return true;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export async function getAdminData() {
  const db = getDatabase();
  const [movies, showtimes, bookings] = await Promise.all([
    db.execute("SELECT * FROM movies ORDER BY created_at DESC"),
    db.execute(`SELECT s.*, m.title AS movie_title FROM showtimes s JOIN movies m ON m.id = s.movie_id ORDER BY s.starts_at DESC LIMIT 30`),
    db.execute(`SELECT b.reference, b.customer_name, b.total_amount, b.status, b.created_at, m.title AS movie_title,
                 s.starts_at, COUNT(bs.seat_id) AS seat_count FROM bookings b
                 JOIN showtimes s ON s.id = b.showtime_id JOIN movies m ON m.id = s.movie_id
                 JOIN booking_seats bs ON bs.booking_id = b.id GROUP BY b.id ORDER BY b.created_at DESC LIMIT 30`),
  ]);
  return { movies: movies.rows, showtimes: showtimes.rows, bookings: bookings.rows };
}

export async function adminCreateMovie(input) {
  const title = String(input?.title || "").trim();
  const genre = String(input?.genre || "").trim();
  const synopsis = String(input?.synopsis || "").trim();
  const duration = Number(input?.duration);
  if (title.length < 2 || title.length > 80 || genre.length < 2 || genre.length > 30 || synopsis.length < 10 || synopsis.length > 500 || !Number.isInteger(duration) || duration < 30 || duration > 300) {
    throw new CinemaError("Complete every movie field. Duration must be 30–300 minutes.");
  }
  const id = crypto.randomUUID();
  await getDatabase().execute({
    sql: `INSERT INTO movies (id, title, genre, duration_minutes, certificate, synopsis, poster_path, poster_alt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, title, genre, duration, "U", synopsis, "/posters/default.svg", `Abstract cinema artwork for ${title}`],
  });
  return id;
}

export async function adminCreateShowtime(input) {
  const movieId = String(input?.movieId || "");
  const start = new Date(input?.startsAt);
  const standard = Number(input?.standardPrice);
  const premium = Number(input?.premiumPrice);
  if (!movieId || Number.isNaN(start.getTime()) || start.getTime() <= Date.now() || !Number.isInteger(standard) || !Number.isInteger(premium) || standard < 0 || premium < 0 || standard > 10000 || premium > 10000) {
    throw new CinemaError("Choose a movie, future date and valid seat prices.");
  }
  const movie = await getMovie(movieId);
  if (!movie) throw new CinemaError("The selected movie is unavailable.");
  await assertScreenAvailable(start, Number(movie.duration_minutes));
  const id = crypto.randomUUID();
  await getDatabase().execute({
    sql: `INSERT INTO showtimes (id, movie_id, auditorium_id, starts_at, standard_price, premium_price)
          VALUES (?, ?, 'screen-one', ?, ?, ?)`,
    args: [id, movieId, start.toISOString(), standard, premium],
  });
  return id;
}

async function assertScreenAvailable(start, durationMinutes, excludeId = "") {
  const result = await getDatabase().execute({
    sql: `SELECT s.id, s.starts_at, m.duration_minutes FROM showtimes s
          JOIN movies m ON m.id = s.movie_id WHERE s.auditorium_id = 'screen-one' AND s.active = 1 AND s.id != ?`,
    args: [excludeId],
  });
  const opening = start.getTime();
  const closing = opening + (durationMinutes + 15) * 60000;
  for (const show of result.rows) {
    const otherOpening = new Date(show.starts_at).getTime();
    const otherClosing = otherOpening + (Number(show.duration_minutes) + 15) * 60000;
    if (opening < otherClosing && closing > otherOpening) {
      throw new CinemaError("Screen 1 already has a show during that time.", 409);
    }
  }
}

export async function adminUpdateShowtime(id, input) {
  const db = getDatabase();
  const result = await db.execute({
    sql: `SELECT s.*, m.duration_minutes FROM showtimes s JOIN movies m ON m.id = s.movie_id WHERE s.id = ?`,
    args: [id],
  });
  const show = result.rows[0];
  if (!show) throw new CinemaError("Showtime not found.", 404);
  const starts = new Date(input?.startsAt);
  const standard = Number(input?.standardPrice);
  const premium = Number(input?.premiumPrice);
  if (Number.isNaN(starts.getTime()) || starts.getTime() <= Date.now() || !Number.isInteger(standard) || !Number.isInteger(premium) || standard < 0 || premium < 0 || standard > 10000 || premium > 10000) {
    throw new CinemaError("Enter a future date and valid seat prices.");
  }
  const bookings = await db.execute({ sql: "SELECT COUNT(*) AS count FROM bookings WHERE showtime_id = ? AND status = 'confirmed'", args: [id] });
  if (Number(bookings.rows[0].count) > 0) throw new CinemaError("A showtime with confirmed bookings cannot be changed.", 409);
  await assertScreenAvailable(starts, Number(show.duration_minutes), id);
  await db.execute({
    sql: "UPDATE showtimes SET starts_at = ?, standard_price = ?, premium_price = ? WHERE id = ?",
    args: [starts.toISOString(), standard, premium, id],
  });
}

export async function adminUpdateMovie(id, input) {
  const movie = await getDatabase().execute({ sql: "SELECT * FROM movies WHERE id = ?", args: [id] });
  if (!movie.rows[0]) throw new CinemaError("Movie not found.", 404);
  const title = String(input?.title || "").trim();
  const genre = String(input?.genre || "").trim();
  const synopsis = String(input?.synopsis || "").trim();
  const duration = Number(input?.duration);
  if (title.length < 2 || title.length > 80 || genre.length < 2 || genre.length > 30 || synopsis.length < 10 || synopsis.length > 500 || !Number.isInteger(duration) || duration < 30 || duration > 300) {
    throw new CinemaError("Complete every movie field. Duration must be 30–300 minutes.");
  }
  await getDatabase().execute({
    sql: "UPDATE movies SET title = ?, genre = ?, synopsis = ?, duration_minutes = ? WHERE id = ?",
    args: [title, genre, synopsis, duration, id],
  });
}
