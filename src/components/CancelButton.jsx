"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ reference }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!window.confirm("Cancel this booking and release its seats?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${reference}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not cancel this booking.");
      router.refresh();
    } catch (cause) {
      setError(cause.message);
      setBusy(false);
    }
  }

  return <div><button type="button" className="button button-outline" disabled={busy} onClick={cancel}>{busy ? "Cancelling…" : "Cancel booking"}</button>{error && <p role="alert" className="form-error">{error}</p>}</div>;
}
