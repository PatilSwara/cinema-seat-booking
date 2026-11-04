# ReelSeat Cinema

A cinema seat booking website built with **HTML5, CSS, plain JavaScript, PHP, and SQLite**. Visitors can reserve seats, view tickets, and manage bookings. Staff can manage movies and showtimes. This is a demonstration application; no payment is collected.

## Features

1. Browse, search and filter fictional films.
2. View each film's upcoming showtimes.
3. Choose seats, inspect prices on hover or keyboard focus, refresh availability, and see the live total.
4. Confirm a booking with a name and email. PHP calculates the total and SQLite prevents double booking.
5. View or print a ticket and revisit guest or account bookings.
6. Cancel a booking and release its seats while retaining the record.
7. Sign in as admin to add/edit films and showtimes and inspect recent bookings.
8. Register and sign in as a customer to see bookings across browsers; guest booking remains available.

## Run locally

Install PHP 8.2 or newer with the **PDO SQLite** and **mbstring** extensions enabled. No Node.js installation or external API is required. From a fresh clone, copy `.env.example` to `.env.local`, then replace the example `ADMIN_PASSWORD` with a password of at least 12 characters. In PowerShell:

```powershell
Copy-Item .env.example .env.local
# Edit .env.local and set ADMIN_PASSWORD to your own password.
php setup.php
php -S localhost:8000 -t public
```

Open <http://localhost:8000>. Keep the terminal open while using the site; press Ctrl+C to stop it. If `php` is not on your PATH, use the full path to your PHP executable for both commands. The [PHP built-in server](https://www.php.net/manual/en/features.commandline.webserver.php) is for local development and demonstrations.

The database is `data/cinema.db`. `setup.php` creates the schema, three movies, 48 seats, and nine future showtimes on a fresh database. It preserves existing bookings when run again and adds new showtimes if all future shows have passed.

## How it works

`public/index.php` renders pages and handles form submissions. `app/bootstrap.php` contains database access, validation, booking and cancellation logic. `public/assets/app.js` controls seat selection and updates the total. `public/assets/style.css` provides the responsive design. `setup.php` creates and seeds the SQLite database.

The seven tables are `movies`, `auditoriums`, `seats`, `showtimes`, `bookings`, `booking_seats` and `users`. PHP uses prepared statements for user input. Booking and cancellation run inside transactions. A unique index prevents two confirmed bookings for the same seat and showtime. The total is recalculated on the server, rather than trusted from JavaScript.

Guest history is linked to a PHP session cookie. Customer accounts use hashed passwords and link bookings to a user ID, so signed-in users can see tickets in another browser. Signing in also claims guest bookings made in that browser. Customer data is escaped before it appears in HTML. Forms include CSRF tokens. The `data/` and `.env.local` files are ignored by Git and live outside the web document root.

## Accessibility

Pages use semantic landmarks and headings, descriptive poster alt text, a skip link, visible form labels and focus states, text errors, responsive layouts, and reduced-motion styling. Seat buttons announce row, number, tier, price and availability; selected seats and prices are also displayed in text.

These features support accessibility, but the site has not undergone a complete WCAG conformance audit.
