import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "ReelSeat | Book your next movie",
  description: "A simple, accessible cinema seat booking website.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <div className="site-shell">
          <header className="site-header">
            <div className="container header-inner">
              <Link href="/" className="brand" aria-label="ReelSeat home">
                <span className="brand-mark" aria-hidden="true">R</span>
                <span>reel<span className="brand-accent">seat</span></span>
              </Link>
              <nav aria-label="Main navigation" className="main-nav">
                <Link href="/">Movies</Link>
                <Link href="/bookings">My bookings</Link>
                <Link href="/admin">Admin</Link>
              </nav>
            </div>
          </header>
          <main id="main-content">{children}</main>
          <footer className="site-footer">
            <div className="container footer-inner">
              <span>© {new Date().getFullYear()} ReelSeat Cinema</span>
              <span>Find your seat. Enjoy the story.</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
