<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require __DIR__.'/app/bootstrap.php';
$sql = [
  "CREATE TABLE IF NOT EXISTS movies (id TEXT PRIMARY KEY,title TEXT NOT NULL,genre TEXT NOT NULL,duration_minutes INTEGER NOT NULL CHECK(duration_minutes>0),certificate TEXT NOT NULL,synopsis TEXT NOT NULL,poster_path TEXT NOT NULL,poster_alt TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),created_at TEXT NOT NULL DEFAULT(datetime('now')))",
  "CREATE TABLE IF NOT EXISTS auditoriums (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE)",
  "CREATE TABLE IF NOT EXISTS seats (id TEXT PRIMARY KEY,auditorium_id TEXT NOT NULL REFERENCES auditoriums(id),row_label TEXT NOT NULL,seat_number INTEGER NOT NULL,tier TEXT NOT NULL CHECK(tier IN ('standard','premium')),UNIQUE(auditorium_id,row_label,seat_number))",
  "CREATE TABLE IF NOT EXISTS showtimes (id TEXT PRIMARY KEY,movie_id TEXT NOT NULL REFERENCES movies(id),auditorium_id TEXT NOT NULL REFERENCES auditoriums(id),starts_at TEXT NOT NULL,standard_price INTEGER NOT NULL CHECK(standard_price>=0),premium_price INTEGER NOT NULL CHECK(premium_price>=0),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)))",
  "CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY,reference TEXT NOT NULL UNIQUE,guest_id TEXT NOT NULL,showtime_id TEXT NOT NULL REFERENCES showtimes(id),customer_name TEXT NOT NULL,customer_email TEXT NOT NULL,total_amount INTEGER NOT NULL CHECK(total_amount>=0),status TEXT NOT NULL CHECK(status IN ('confirmed','cancelled')),created_at TEXT NOT NULL DEFAULT(datetime('now')),cancelled_at TEXT)",
  "CREATE TABLE IF NOT EXISTS booking_seats (booking_id TEXT NOT NULL REFERENCES bookings(id),showtime_id TEXT NOT NULL REFERENCES showtimes(id),seat_id TEXT NOT NULL REFERENCES seats(id),price_at_booking INTEGER NOT NULL CHECK(price_at_booking>=0),status TEXT NOT NULL CHECK(status IN ('confirmed','cancelled')),PRIMARY KEY(booking_id,seat_id))",
  "CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_seat ON booking_seats(showtime_id,seat_id) WHERE status='confirmed'",
  "CREATE INDEX IF NOT EXISTS bookings_guest_idx ON bookings(guest_id,created_at)",
  "CREATE INDEX IF NOT EXISTS showtimes_movie_idx ON showtimes(movie_id,starts_at)"
];
foreach($sql as $statement) db()->exec($statement);

if((int)row('SELECT COUNT(*) AS n FROM movies')['n']===0){
  $movies=[
    ['midnight-signal','Midnight Signal','Mystery',112,'U/A','A late-night radio host receives a transmission from a town that disappeared decades ago.','/posters/midnight-signal.svg','A glowing radio tower beneath a deep blue night sky'],
    ['the-last-garden','The Last Garden','Drama',98,'U','Two strangers revive a forgotten rooftop garden and discover an unlikely friendship.','/posters/last-garden.svg','A vivid green garden rising above warm city rooftops'],
    ['solar-drift','Solar Drift','Adventure',126,'U/A','A young pilot crosses the solar system to bring a stranded crew home.','/posters/solar-drift.svg','A small spacecraft passing a radiant orange sun']
  ];
  foreach($movies as $movie)run('INSERT INTO movies (id,title,genre,duration_minutes,certificate,synopsis,poster_path,poster_alt) VALUES (?,?,?,?,?,?,?,?)',$movie);
  echo "Created three demo movies.\n";
}
if(!row("SELECT id FROM auditoriums WHERE id='screen-one'"))run("INSERT INTO auditoriums(id,name) VALUES('screen-one','Screen 1')");
if((int)row("SELECT COUNT(*) AS n FROM seats WHERE auditorium_id='screen-one'")['n']===0){
  foreach(['A','B','C','D','E','F'] as $label)for($number=1;$number<=8;$number++)
    run('INSERT INTO seats(id,auditorium_id,row_label,seat_number,tier) VALUES (?,?,?,?,?)',[$label.$number,'screen-one',$label,$number,in_array($label,['E','F'],true)?'premium':'standard']);
  echo "Created 48 seats.\n";
}
$now=gmdate('Y-m-d\TH:i:s.000\Z');
if((int)row('SELECT COUNT(*) AS n FROM showtimes WHERE active=1 AND starts_at>?',[$now])['n']===0){
  $demo=rows("SELECT id FROM movies WHERE id IN ('midnight-signal','the-last-garden','solar-drift') AND active=1");
  if(count($demo)===3){
    $zone=new DateTimeZone('Asia/Kolkata');
    for($offset=1;$offset<=3;$offset++){
      $day=(new DateTimeImmutable('today',$zone))->modify("+$offset day");
      foreach([['the-last-garden',10],['midnight-signal',13],['solar-drift',16]] as [$movie,$hour]){
        $start=$day->setTime($hour,0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.000\Z');
        run("INSERT INTO showtimes(id,movie_id,auditorium_id,starts_at,standard_price,premium_price) VALUES (?,?,'screen-one',?,180,250)",[uuid(),$movie,$start]);
      }
    }
    echo "Added nine upcoming demo showtimes.\n";
  }
}
echo "Database ready. Existing bookings were preserved.\n";
