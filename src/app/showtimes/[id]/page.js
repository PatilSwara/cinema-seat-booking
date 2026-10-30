import Link from "next/link";
import { notFound } from "next/navigation";
import SeatPicker from "../../../components/SeatPicker";
import { formatShowtime, getSeatMap } from "../../../lib/cinema";

export const dynamic = "force-dynamic";

export default async function ShowtimePage({ params }) {
  const { id } = await params;
  const map = await getSeatMap(id);
  if (!map) notFound();
  const { showtime, seats } = map;
  return (
    <div className="container page-space">
      <nav aria-label="Breadcrumb" className="breadcrumb"><Link href="/">Movies</Link><span aria-hidden="true">/</span><Link href={`/movies/${showtime.movie_id}`}>{showtime.movie_title}</Link><span aria-hidden="true">/</span><span aria-current="page">Seats</span></nav>
      <div className="booking-heading"><div><p className="eyebrow eyebrow-dark">ALMOST SHOWTIME</p><h1>Choose your seats</h1><p>{showtime.movie_title} · {formatShowtime(showtime.starts_at)} · {showtime.auditorium_name}</p></div><span className="step-badge">Step 2 of 2</span></div>
      <SeatPicker showtime={Object.fromEntries(Object.entries(showtime))} initialSeats={seats.map((seat) => Object.fromEntries(Object.entries(seat)))} />
    </div>
  );
}
