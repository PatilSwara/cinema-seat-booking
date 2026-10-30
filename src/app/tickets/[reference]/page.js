import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "../../../components/PrintButton";
import { formatShowtime, getGuestBooking, money } from "../../../lib/cinema";
import { readGuestId } from "../../../lib/session";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }) {
  const { reference } = await params;
  const booking = await getGuestBooking(reference, await readGuestId());
  if (!booking) notFound();
  return <div className="container page-space ticket-page">
    <nav aria-label="Breadcrumb" className="breadcrumb"><Link href="/bookings">My bookings</Link><span aria-hidden="true">/</span><span aria-current="page">Ticket</span></nav>
    <div className="page-title"><p className="eyebrow eyebrow-dark">YOUR TICKET</p><h1>{booking.status === "confirmed" ? "You’re booked!" : "Booking cancelled"}</h1><p>{booking.status === "confirmed" ? "Keep your reference handy for your visit." : "The seats from this booking are available again."}</p></div>
    <article className="ticket" aria-label={`Ticket ${booking.reference}`}>
      <div className="ticket-top"><span className="ticket-brand">reel<span>seat</span></span><span className={`status status-${booking.status}`}>{booking.status}</span></div>
      <div className="ticket-main"><p className="eyebrow">ADMIT ONE BOOKING</p><h2>{booking.movie_title}</h2><div className="ticket-grid"><div><span>Date & time</span><strong>{formatShowtime(booking.starts_at)}</strong></div><div><span>Screen</span><strong>{booking.auditorium_name}</strong></div><div><span>Seats</span><strong>{booking.seat_labels}</strong></div><div><span>Total</span><strong>{money(booking.total_amount)}</strong></div></div></div>
      <div className="ticket-bottom"><div><span>BOOKING REFERENCE</span><strong>{booking.reference}</strong></div><span className="ticket-dots" aria-hidden="true">● ● ● ● ●</span></div>
    </article>
    <div className="ticket-actions"><Link href="/bookings" className="button button-dark">My bookings</Link><PrintButton /></div>
  </div>;
}
