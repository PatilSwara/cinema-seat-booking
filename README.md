# ReelSeat Cinema

A small full-stack cinema booking website built for a Web Technology course. Visitors can find a film, choose a showtime, inspect seat prices, reserve seats, view a ticket, and cancel a booking. An admin can manage the programme and review bookings. This is a classroom demo: **no payment is collected** and the films are fictional.

## What works

1. **Browse, search, and filter films** by title and genre.
2. **View showtimes** for each film, with date, screen, and starting price.
3. **Pick seats** on a live availability map. Hover, keyboard focus, or tap reveals a seat's price; the booking summary updates with selected seats and total.
4. **Confirm a booking** with a name and email. The server calculates the total and the database prevents two confirmed bookings for the same seat and showtime.
5. **View a ticket and booking history** in the browser used to book. Tickets can be printed.
6. **Cancel a booking** and release its seats while retaining the cancelled record.
7. **Admin dashboard:** password sign-in, add/edit films, add/edit showtimes, and review recent bookings. Overlapping shows in Screen 1 are rejected; showtimes with confirmed bookings cannot be changed.

## Stack and data

- **Frontend:** Next.js App Router, React, plain JavaScript, and CSS.
- **Backend:** Next.js route handlers and server functions.
- **Database:** libSQL/SQLite through `@libsql/client`. Local development uses the persistent `data/cinema.db` file. The same code can connect to hosted Turso libSQL for deployment.
- **Tables:** `movies`, `auditoriums`, `seats`, `showtimes`, `bookings`, and `booking_seats`.

The booking and cancellation operations use database transactions. A partial unique index on `booking_seats(showtime_id, seat_id)` for confirmed seats prevents double booking, including when two people submit at nearly the same time. The database stores booking records and prices charged at booking time; it is not simulated with browser storage.

## Run locally

Use Node.js 20.9 or newer. In this project folder:

```bash
npm install
```

Copy `.env.example` to `.env.local`, then replace `SESSION_SECRET` with a long random value (at least 32 characters) and set your own `ADMIN_PASSWORD`. Keep `.env.local` private. This workspace already has a local `.env.local` prepared for development.

```bash
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The setup command creates the database, three sample films, 48 seats, and nine upcoming showtimes. It preserves existing bookings when rerun. If all future shows have passed, rerunning it adds new demo showtimes. The sample posters are original SVG artwork in `public/posters/`.

To verify the core database behaviour and production build:

```bash
npm test
npm run build
```

While the development server is running, `npm run test:http` checks the booking and admin HTTP flows. It uses test records and removes them afterward.

## Two-minute teacher demo

1. On the home page, search for **Solar Drift** and open its showtimes.
2. Open a showtime. Hover or focus a standard and a premium seat to show the different prices; select two seats and point out the live total.
3. Enter a sample name and email, confirm, and show the ticket reference and print button.
4. Open **My bookings** to show the saved booking. Cancel it, then return to the seat map to show the seats are available again.
5. Open **Admin**, sign in with your local admin password, add a movie or showtime, and show the recent booking record.

Bookings are linked to a signed, HTTP-only browser cookie. Use the same browser for steps 3 and 4; clearing its cookies or using another browser hides that guest's history. The records remain in the database and are visible to the admin.

## Accessibility built in

Pages use semantic `header`, `nav`, `main`, `section`, and `footer` elements, a logical heading hierarchy, a skip link, visible focus states, and responsive layouts. Images have descriptive alt text; decorative hero art is hidden from assistive technology. Every form field has a visible label and text errors. Seat buttons work with a keyboard and announce row, number, tier, price, and state. Price and selection are also written in text so colour and hover are not the only cues. The CSS includes reduced-motion support.

## Publish the source and deploy

The repository should include the source, `package-lock.json`, `.env.example`, and this README. `.gitignore` excludes `data/`, `.env.local`, dependencies, and build output so customer records and secrets are not pushed to GitHub.

For a public demo, create a free [Turso](https://turso.tech/pricing) database and run `npm run db:setup` with its `DATABASE_URL` and `TURSO_AUTH_TOKEN`. Deploy the GitHub repository on [Vercel Hobby](https://vercel.com/docs/plans/hobby) and set those same variables plus `SESSION_SECRET`, `ADMIN_PASSWORD`, and `NEXT_PUBLIC_CINEMA_TIME_ZONE=Asia/Kolkata` in the project settings. The local SQLite file should not be used on Vercel because its serverless filesystem does not provide durable application storage. Follow the current [Turso quickstart](https://docs.turso.tech/quickstart) for database creation and token steps.

This repository contains no payment, email sending, or seat-hold timer. Booking confirmation is the final step of the classroom flow.
