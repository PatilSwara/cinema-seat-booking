import Link from "next/link";
import { listGenres, listMovies } from "../lib/cinema";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const query = await searchParams;
  const search = typeof query?.search === "string" ? query.search : "";
  const genre = typeof query?.genre === "string" ? query.genre : "";
  const [movies, genres] = await Promise.all([listMovies({ search, genre }), listGenres()]);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">YOUR NEXT STORY STARTS HERE</p>
            <h1>Big screen magic.<br /><span>One perfect seat.</span></h1>
            <p>Discover what is showing, choose your seats, and book in a few easy steps.</p>
            <a href="#now-showing" className="button button-primary">Explore movies <span aria-hidden="true">→</span></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-ticket"><span>REELSEAT</span><strong>THE BEST SEAT<br />IS YOURS</strong><small>ADMIT ONE • SCREEN 1</small></div>
            <div className="hero-glow" />
          </div>
        </div>
      </section>

      <section className="catalog-section container" id="now-showing" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div><p className="eyebrow eyebrow-dark">CURATED FOR THE BIG SCREEN</p><h2 id="catalog-title">Now showing</h2></div>
          <p>Pick a film and find a showtime that fits your day.</p>
        </div>
        <form className="filter-bar" role="search" method="get">
          <div className="field">
            <label htmlFor="movie-search">Search movies</label>
            <input id="movie-search" name="search" type="search" defaultValue={search} placeholder="Search by title" />
          </div>
          <div className="field field-select">
            <label htmlFor="movie-genre">Genre</label>
            <select id="movie-genre" name="genre" defaultValue={genre}>
              <option value="">All genres</option>
              {genres.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <button type="submit" className="button button-dark">Find movies</button>
        </form>

        {movies.length ? (
          <div className="movie-grid">
            {movies.map((movie) => (
              <article className="movie-card" key={movie.id}>
                <Link href={`/movies/${movie.id}`} className="poster-link" aria-label={`View ${movie.title} showtimes`}>
                  <img src={movie.poster_path} alt={movie.poster_alt} className="movie-poster" />
                  <span className="poster-overlay" aria-hidden="true">View showtimes →</span>
                </Link>
                <div className="movie-card-body">
                  <div className="movie-meta"><span>{movie.genre}</span><span>{movie.duration_minutes} min</span></div>
                  <h3><Link href={`/movies/${movie.id}`}>{movie.title}</Link></h3>
                  <p>{movie.synopsis}</p>
                  <span className="showtime-count">{Number(movie.upcoming_showtimes)} upcoming shows</span>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state"><h3>No movies found</h3><p>Try another title or genre.</p><Link href="/" className="text-link">Clear filters</Link></div>}
      </section>
    </>
  );
}
