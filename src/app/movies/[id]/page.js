import Link from "next/link";
import { notFound } from "next/navigation";
import { formatShowtime, getMovie, getMovieShowtimes, money } from "../../../lib/cinema";

export const dynamic = "force-dynamic";

export default async function MoviePage({ params }) {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) notFound();
  const showtimes = await getMovieShowtimes(id);
  return (
    <div className="container page-space">
      <nav aria-label="Breadcrumb" className="breadcrumb"><Link href="/">Movies</Link><span aria-hidden="true">/</span><span aria-current="page">{movie.title}</span></nav>
      <section className="movie-detail" aria-labelledby="movie-title">
        <img src={movie.poster_path} alt={movie.poster_alt} className="detail-poster" />
        <div className="detail-copy">
          <p className="eyebrow eyebrow-dark">NOW SHOWING</p>
          <h1 id="movie-title">{movie.title}</h1>
          <div className="detail-tags"><span>{movie.genre}</span><span>{movie.duration_minutes} min</span><span>{movie.certificate}</span></div>
          <p className="detail-synopsis">{movie.synopsis}</p>
          <div className="detail-note"><span className="note-icon" aria-hidden="true">✦</span><p>Choose a showtime below, then pick your preferred seats in Screen 1.</p></div>
        </div>
      </section>
      <section className="showtimes-section" aria-labelledby="showtimes-title">
        <div className="section-heading compact"><div><p className="eyebrow eyebrow-dark">PLAN YOUR VISIT</p><h2 id="showtimes-title">Select a showtime</h2></div><p>Tickets from {money(180)}</p></div>
        {showtimes.length ? <div className="showtime-grid">{showtimes.map((showtime) => (
          <Link className="showtime-card" href={`/showtimes/${showtime.id}`} key={showtime.id}>
            <span className="showtime-icon" aria-hidden="true">◷</span>
            <span><strong>{formatShowtime(showtime.starts_at)}</strong><small>{showtime.auditorium_name} · Standard {money(showtime.standard_price)} · Premium {money(showtime.premium_price)}</small></span>
            <span className="showtime-arrow" aria-hidden="true">→</span>
          </Link>
        ))}</div> : <div className="empty-state"><h3>No upcoming showtimes</h3><p>Check back soon for new screenings.</p></div>}
      </section>
    </div>
  );
}
