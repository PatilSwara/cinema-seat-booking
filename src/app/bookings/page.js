import Link from "next/link";
import CancelButton from "../../components/CancelButton";
import { formatShowtime, listGuestBookings, money } from "../../lib/cinema";
import { readGuestId } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const bookings = await listGuestBookings(await readGuestId());
  return <div className="container page-space narrow-page">
    <div className="page-title"><p className="eyebrow eyebrow-dark">YOUR CINEMA PLANS</p><h1>My bookings</h1><p>Bookings made in this browser appear here.</p></div>
    {bookings.length ? <div className="booking-list">{bookings.map((booking) => <article className="booking-card" key={booking.reference}>
      <div className="booking-card-top"><span className={`status status-${booking.status}`}>{booking.status}</span><span className="booking-ref">{booking.reference}</span></div>
      <h2>{booking.movie_title}</h2><p>{formatShowtime(booking.starts_at)} · {booking.auditorium_name}</p>
      <div className="booking-facts"><span>Seats <strong>{booking.seat_labels}</strong></span><span>Total <strong>{money(booking.total_amount)}</strong></span></div>
      <div className="booking-actions"><Link href={`/tickets/${booking.reference}`} className="button button-dark">View ticket</Link>{booking.status === "confirmed" && <CancelButton reference={booking.reference} />}</div>
    </article>)}</div> : <div className="empty-state"><h2>No bookings yet</h2><p>Your tickets will appear here after you book a movie.</p><Link href="/" className="button button-primary">Browse movies</Link></div>}
  </div>;
}
