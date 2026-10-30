"use client";
export default function PrintButton() {
  return <button type="button" className="button button-outline" onClick={() => window.print()}>Print ticket</button>;
}
