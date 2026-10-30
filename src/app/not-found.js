import Link from "next/link";
export default function NotFound() {
  return <div className="container page-space empty-state"><h1>We couldn’t find that page</h1><p>The movie or showtime may no longer be available.</p><Link href="/" className="button button-primary">Back to movies</Link></div>;
}
