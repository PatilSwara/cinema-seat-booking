"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      router.refresh();
    } catch (cause) {
      setError(cause.message);
      setBusy(false);
    }
  }

  return <form className="admin-login surface-card" onSubmit={signIn}>
    <div className="field"><label htmlFor="admin-password">Admin password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
  </form>;
}
