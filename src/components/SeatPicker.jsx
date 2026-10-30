"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const formatPrice = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export default function SeatPicker({ showtime, initialSeats }) {
  const router = useRouter();
  const [seats, setSeats] = useState(initialSeats);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const rows = useMemo(() => [...new Set(seats.map((seat) => seat.row_label))], [seats]);
  const selectedSeats = seats.filter((seat) => selected.includes(seat.id));
  const total = selectedSeats.reduce((sum, seat) => sum + (seat.tier === "premium" ? Number(showtime.premium_price) : Number(showtime.standard_price)), 0);

  function toggleSeat(id) {
    setError("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((seat) => seat !== id);
      if (current.length >= 6) {
        setError("You can book up to six seats at once.");
        return current;
      }
      return [...current, id];
    });
  }

  async function refreshSeats() {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/showtimes/${showtime.id}/seats`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh seats.");
      setSeats(data.seats);
      setSelected((current) => current.filter((id) => data.seats.some((seat) => seat.id === id && !seat.booked)));
      setError("");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function book(event) {
    event.preventDefault();
    setError("");
    if (!selected.length) {
      setError("Select at least one seat before continuing.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showtimeId: showtime.id, seatIds: selected, customer: { name, email } }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) await refreshSeats();
        throw new Error(data.error || "We could not complete this booking.");
      }
      router.push(`/tickets/${data.reference}`);
      router.refresh();
    } catch (cause) {
      setError(cause.message);
      setLoading(false);
    }
  }

  return <form className="seat-layout" onSubmit={book}>
    <section className="seat-panel" aria-labelledby="seat-map-title">
      <div className="seat-panel-header"><div><h2 id="seat-map-title">Select your seats</h2><p>Choose up to six seats. Hover, focus, or tap a seat to check its price.</p></div><button className="text-button" type="button" onClick={refreshSeats} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh availability"}</button></div>
      <div className="seat-legend" aria-label="Seat legend">
        <span><i className="legend-seat legend-available" aria-hidden="true" /> Available</span>
        <span><i className="legend-seat legend-selected" aria-hidden="true" /> Selected</span>
        <span><i className="legend-seat legend-booked" aria-hidden="true" /> Booked</span>
        <span>Standard {formatPrice(Number(showtime.standard_price))} · Premium {formatPrice(Number(showtime.premium_price))}</span>
      </div>
      <div className="seat-map-scroll">
        <div className="seat-map">
          <div className="screen-line" aria-hidden="true" /><p className="screen-label">SCREEN THIS WAY</p>
          <div className="seat-rows">
            {rows.map((row) => <div className="seat-row" key={row} role="group" aria-label={`Row ${row}`}>
              <span className="row-label" aria-hidden="true">{row}</span>
              {seats.filter((seat) => seat.row_label === row).map((seat) => {
                const price = seat.tier === "premium" ? Number(showtime.premium_price) : Number(showtime.standard_price);
                const chosen = selected.includes(seat.id);
                return <button
                  type="button" key={seat.id} disabled={Boolean(seat.booked)} aria-pressed={chosen}
                  aria-label={`Row ${row}, seat ${seat.seat_number}, ${seat.tier}, ${seat.booked ? "booked" : `${formatPrice(price)}, ${chosen ? "selected" : "available"}`}`}
                  className={`seat seat-${seat.tier}${chosen ? " seat-selected" : ""}${seat.booked ? " seat-booked" : ""}`}
                  data-price={formatPrice(price)} onClick={() => toggleSeat(seat.id)}>{seat.seat_number}</button>;
              })}
              <span className="row-label" aria-hidden="true">{row}</span>
            </div>)}
          </div>
          <p className="seat-map-note">Rows E and F are Premium seats.</p>
        </div>
      </div>
    </section>
    <aside className="checkout-panel" aria-labelledby="summary-title">
      <h2 id="summary-title">Booking summary</h2>
      <p className="checkout-movie">{showtime.movie_title}</p>
      <div className="summary-line"><span>Selected seats</span><strong aria-live="polite">{selectedSeats.length ? selectedSeats.map((seat) => seat.id).join(", ") : "None yet"}</strong></div>
      {selectedSeats.length > 0 && <ul className="selected-seat-prices" aria-label="Selected seat prices">{selectedSeats.map((seat) => <li key={seat.id}><span>{seat.id} · {seat.tier}</span><strong>{formatPrice(seat.tier === "premium" ? Number(showtime.premium_price) : Number(showtime.standard_price))}</strong></li>)}</ul>}
      <div className="summary-line"><span>Tickets</span><strong>{selectedSeats.length}</strong></div>
      <div className="summary-total"><span>Total</span><strong aria-live="polite">{formatPrice(total)}</strong></div>
      <div className="checkout-fields">
        <h3>Your details</h3>
        <p>Required to identify this booking. Your ticket stays available in this browser.</p>
        <div className="field"><label htmlFor="customer-name">Full name <span aria-hidden="true">*</span></label><input id="customer-name" name="name" autoComplete="name" required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></div>
        <div className="field"><label htmlFor="customer-email">Email address <span aria-hidden="true">*</span></label><input id="customer-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary checkout-button" type="submit" disabled={loading || !selected.length}>{loading ? "Confirming…" : `Confirm booking · ${formatPrice(total)}`}</button>
      <p className="checkout-note">Demo project — no payment is collected.</p>
    </aside>
  </form>;
}
