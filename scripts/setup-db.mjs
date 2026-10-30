import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL || "file:./data/cinema.db";
if (url.startsWith("file:")) await mkdir("data", { recursive: true });
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

const schema = [
  `CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    certificate TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    poster_path TEXT NOT NULL,
    poster_alt TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS auditoriums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    auditorium_id TEXT NOT NULL REFERENCES auditoriums(id),
    row_label TEXT NOT NULL,
    seat_number INTEGER NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium')),
    UNIQUE (auditorium_id, row_label, seat_number)
  )`,
  `CREATE TABLE IF NOT EXISTS showtimes (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id),
    auditorium_id TEXT NOT NULL REFERENCES auditoriums(id),
    starts_at TEXT NOT NULL,
    standard_price INTEGER NOT NULL CHECK (standard_price >= 0),
    premium_price INTEGER NOT NULL CHECK (premium_price >= 0),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    guest_id TEXT NOT NULL,
    showtime_id TEXT NOT NULL REFERENCES showtimes(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    cancelled_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS booking_seats (
    booking_id TEXT NOT NULL REFERENCES bookings(id),
    showtime_id TEXT NOT NULL REFERENCES showtimes(id),
    seat_id TEXT NOT NULL REFERENCES seats(id),
    price_at_booking INTEGER NOT NULL CHECK (price_at_booking >= 0),
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
    PRIMARY KEY (booking_id, seat_id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_seat
    ON booking_seats (showtime_id, seat_id) WHERE status = 'confirmed'`,
  `CREATE INDEX IF NOT EXISTS bookings_guest_idx ON bookings (guest_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS showtimes_movie_idx ON showtimes (movie_id, starts_at)`,
];

for (const sql of schema) await db.execute(sql);

const existing = await db.execute("SELECT COUNT(*) AS count FROM movies");
if (Number(existing.rows[0].count) === 0) {
  const movies = [
    {
      id: "midnight-signal",
      title: "Midnight Signal",
      genre: "Mystery",
      duration: 112,
      certificate: "U/A",
      synopsis: "A late-night radio host receives a transmission from a town that disappeared decades ago.",
      poster: "/posters/midnight-signal.svg",
      alt: "A glowing radio tower beneath a deep blue night sky",
    },
    {
      id: "the-last-garden",
      title: "The Last Garden",
      genre: "Drama",
      duration: 98,
      certificate: "U",
      synopsis: "Two strangers revive a forgotten rooftop garden and discover an unlikely friendship.",
      poster: "/posters/last-garden.svg",
      alt: "A vivid green garden rising above warm city rooftops",
    },
    {
      id: "solar-drift",
      title: "Solar Drift",
      genre: "Adventure",
      duration: 126,
      certificate: "U/A",
      synopsis: "A young pilot crosses the solar system to bring a stranded crew home.",
      poster: "/posters/solar-drift.svg",
      alt: "A small spacecraft passing a radiant orange sun",
    },
  ];
  for (const movie of movies) {
    await db.execute({
      sql: `INSERT INTO movies (id, title, genre, duration_minutes, certificate, synopsis, poster_path, poster_alt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [movie.id, movie.title, movie.genre, movie.duration, movie.certificate, movie.synopsis, movie.poster, movie.alt],
    });
  }
  await db.execute({ sql: "INSERT INTO auditoriums (id, name) VALUES (?, ?)", args: ["screen-one", "Screen 1"] });
  for (const row of ["A", "B", "C", "D", "E", "F"]) {
    for (let number = 1; number <= 8; number++) {
      await db.execute({
        sql: "INSERT INTO seats (id, auditorium_id, row_label, seat_number, tier) VALUES (?, ?, ?, ?, ?)",
        args: [`${row}${number}`, "screen-one", row, number, ["E", "F"].includes(row) ? "premium" : "standard"],
      });
    }
  }

  console.log("Created the cinema database with three movies and 48 seats.");
} else {
  console.log("Database tables are ready. Existing data was preserved.");
}

const upcoming = await db.execute({
  sql: "SELECT COUNT(*) AS count FROM showtimes WHERE active = 1 AND starts_at > ?",
  args: [new Date().toISOString()],
});
if (Number(upcoming.rows[0].count) === 0) {
  const demoMovies = await db.execute("SELECT id FROM movies WHERE id IN ('midnight-signal', 'the-last-garden', 'solar-drift') AND active = 1");
  if (demoMovies.rows.length === 3) {
    const localDay = new Date();
    for (let offset = 1; offset <= 3; offset++) {
      const day = new Date(localDay);
      day.setUTCDate(day.getUTCDate() + offset);
      for (const [movieId, hour] of [["midnight-signal", 13], ["the-last-garden", 10], ["solar-drift", 16]]) {
        const starts = new Date(day);
        starts.setUTCHours(hour, 0, 0, 0);
        await db.execute({
          sql: `INSERT INTO showtimes (id, movie_id, auditorium_id, starts_at, standard_price, premium_price)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [randomUUID(), movieId, "screen-one", starts.toISOString(), 180, 250],
        });
      }
    }
    console.log("Added nine upcoming demo showtimes.");
  }
}

db.close();
