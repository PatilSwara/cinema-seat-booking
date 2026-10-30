"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const price = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount));
const date = (value) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
const localDateTime = (value) => {
  const dateValue = new Date(value);
  return new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminDashboard({ data }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmed = data.bookings.filter((booking) => booking.status === "confirmed");

  async function send(url, method, body, success) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save changes.");
      setFeedback(success);
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createMovie(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (await send("/api/admin/movies", "POST", values, "Movie added.")) form.reset();
  }

  async function createShowtime(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.startsAt = new Date(values.startsAt).toISOString();
    if (await send("/api/admin/showtimes", "POST", values, "Showtime added.")) form.reset();
  }

  async function updateMovie(event, id) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await send(`/api/admin/movies/${id}`, "PATCH", values, "Movie updated.");
  }

  async function updateShowtime(event, id) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    values.startsAt = new Date(values.startsAt).toISOString();
    await send(`/api/admin/showtimes/${id}`, "PATCH", values, "Showtime updated.");
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return <div className="admin-dashboard">
    <div className="admin-toolbar"><div className="admin-stats"><div><strong>{data.movies.length}</strong><span>Movies</span></div><div><strong>{data.showtimes.length}</strong><span>Showtimes</span></div><div><strong>{confirmed.length}</strong><span>Recent confirmed bookings</span></div></div><button type="button" className="button button-outline" onClick={signOut}>Sign out</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {feedback && <p className="form-success" role="status">{feedback}</p>}

    <div className="admin-form-grid">
      <section className="surface-card" aria-labelledby="add-movie-title"><h2 id="add-movie-title">Add a movie</h2><p>New movies use the default abstract poster.</p>
        <form onSubmit={createMovie} className="stacked-form">
          <div className="field"><label htmlFor="new-movie-title">Title</label><input id="new-movie-title" name="title" required minLength={2} maxLength={80} placeholder="Movie title" /></div>
          <div className="field-row"><div className="field"><label htmlFor="new-movie-genre">Genre</label><input id="new-movie-genre" name="genre" required minLength={2} maxLength={30} placeholder="Drama" /></div><div className="field"><label htmlFor="new-movie-duration">Duration (minutes)</label><input id="new-movie-duration" name="duration" type="number" min={30} max={300} required placeholder="110" /></div></div>
          <div className="field"><label htmlFor="new-movie-synopsis">Synopsis</label><textarea id="new-movie-synopsis" name="synopsis" rows={3} required minLength={10} maxLength={500} placeholder="A short description of the story" /></div>
          <button className="button button-dark" type="submit" disabled={busy}>Add movie</button>
        </form>
      </section>
      <section className="surface-card" aria-labelledby="add-showtime-title"><h2 id="add-showtime-title">Add a showtime</h2><p>All showtimes use Screen 1.</p>
        <form onSubmit={createShowtime} className="stacked-form">
          <div className="field"><label htmlFor="new-show-movie">Movie</label><select id="new-show-movie" name="movieId" required defaultValue=""><option value="" disabled>Choose a movie</option>{data.movies.filter((movie) => movie.active).map((movie) => <option value={movie.id} key={movie.id}>{movie.title}</option>)}</select></div>
          <div className="field"><label htmlFor="new-show-date">Date and time</label><input id="new-show-date" name="startsAt" type="datetime-local" required /></div>
          <div className="field-row"><div className="field"><label htmlFor="new-show-standard">Standard price (₹)</label><input id="new-show-standard" name="standardPrice" type="number" min={0} max={10000} defaultValue={180} required /></div><div className="field"><label htmlFor="new-show-premium">Premium price (₹)</label><input id="new-show-premium" name="premiumPrice" type="number" min={0} max={10000} defaultValue={250} required /></div></div>
          <button className="button button-dark" type="submit" disabled={busy}>Add showtime</button>
        </form>
      </section>
    </div>

    <section className="admin-section" aria-labelledby="manage-movies-title"><div className="section-heading compact"><h2 id="manage-movies-title">Manage movies</h2><p>Edit the details shown to visitors.</p></div><div className="admin-details-list">{data.movies.map((movie) => <details className="admin-details" key={movie.id}><summary><strong>{movie.title}</strong><span>{movie.genre} · {movie.duration_minutes} min</span></summary><form onSubmit={(event) => updateMovie(event, movie.id)} className="stacked-form"><div className="field-row"><div className="field"><label htmlFor={`title-${movie.id}`}>Title</label><input id={`title-${movie.id}`} name="title" defaultValue={movie.title} required /></div><div className="field"><label htmlFor={`genre-${movie.id}`}>Genre</label><input id={`genre-${movie.id}`} name="genre" defaultValue={movie.genre} required /></div></div><div className="field"><label htmlFor={`duration-${movie.id}`}>Duration (minutes)</label><input id={`duration-${movie.id}`} name="duration" type="number" min={30} max={300} defaultValue={movie.duration_minutes} required /></div><div className="field"><label htmlFor={`synopsis-${movie.id}`}>Synopsis</label><textarea id={`synopsis-${movie.id}`} name="synopsis" rows={3} defaultValue={movie.synopsis} required /></div><button className="button button-dark" type="submit" disabled={busy}>Save movie</button></form></details>)}</div></section>

    <section className="admin-section" aria-labelledby="manage-showtimes-title"><div className="section-heading compact"><h2 id="manage-showtimes-title">Manage showtimes</h2><p>Update a time or price before bookings begin.</p></div><div className="admin-details-list">{data.showtimes.map((show) => <details className="admin-details" key={show.id}><summary><strong>{show.movie_title}</strong><span>{date(show.starts_at)} · Standard {price(show.standard_price)}</span></summary><form onSubmit={(event) => updateShowtime(event, show.id)} className="stacked-form"><div className="field"><label htmlFor={`date-${show.id}`}>Date and time</label><input id={`date-${show.id}`} name="startsAt" type="datetime-local" defaultValue={localDateTime(show.starts_at)} required /></div><div className="field-row"><div className="field"><label htmlFor={`standard-${show.id}`}>Standard price (₹)</label><input id={`standard-${show.id}`} name="standardPrice" type="number" min={0} max={10000} defaultValue={show.standard_price} required /></div><div className="field"><label htmlFor={`premium-${show.id}`}>Premium price (₹)</label><input id={`premium-${show.id}`} name="premiumPrice" type="number" min={0} max={10000} defaultValue={show.premium_price} required /></div></div><button className="button button-dark" type="submit" disabled={busy}>Save showtime</button></form></details>)}</div></section>

    <section className="admin-section" aria-labelledby="recent-bookings-title"><div className="section-heading compact"><h2 id="recent-bookings-title">Recent bookings</h2><p>Bookings appear here as soon as they are confirmed.</p></div>{data.bookings.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th scope="col">Reference</th><th scope="col">Movie</th><th scope="col">Customer</th><th scope="col">Seats</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>{data.bookings.map((booking) => <tr key={booking.reference}><td>{booking.reference}</td><td>{booking.movie_title}<small>{date(booking.starts_at)}</small></td><td>{booking.customer_name}</td><td>{booking.seat_count}</td><td>{price(booking.total_amount)}</td><td><span className={`status status-${booking.status}`}>{booking.status}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><p>No bookings yet.</p></div>}</section>
  </div>;
}
