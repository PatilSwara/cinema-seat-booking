<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');
ini_set('session.gc_maxlifetime','2592000');
session_name('reelseat_php');
session_set_cookie_params(['lifetime'=>2592000,'path'=>'/','httponly'=>true,'samesite'=>'Lax']);
session_start();
$_SESSION['guest_id'] ??= bin2hex(random_bytes(16));
$_SESSION['csrf'] ??= bin2hex(random_bytes(24));

class AppError extends RuntimeException { public function __construct(string $message,public int $status=400){parent::__construct($message);} }
function setting(string $key,string $fallback=''):string {
  $v=getenv($key); if($v!==false && $v!=='') return $v;
  $file=dirname(__DIR__).'/.env.local'; if(!is_file($file)) return $fallback;
  foreach(file($file,FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line){
    if(str_starts_with(trim($line),'#')) continue;
    [$name,$value]=array_pad(explode('=',$line,2),2,'');
    if(trim($name)===$key) return trim($value," \t\"'");
  }
  return $fallback;
}
function db():PDO {
  static $db; if($db instanceof PDO) return $db;
  $path=setting('SQLITE_PATH',dirname(__DIR__).'/data/cinema.db');
  if(!is_dir(dirname($path))) mkdir(dirname($path),0775,true);
  $db=new PDO('sqlite:'.$path,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
  return $db;
}
function rows(string $sql,array $args=[]):array {$s=db()->prepare($sql);$s->execute($args);return $s->fetchAll();}
function row(string $sql,array $args=[]):array|false {$s=db()->prepare($sql);$s->execute($args);return $s->fetch();}
function run(string $sql,array $args=[]):void {$s=db()->prepare($sql);$s->execute($args);}
function e(mixed $v):string{return htmlspecialchars((string)($v??''),ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function money(int|float|string $v):string{return '₹'.number_format((float)$v,0);}
function when(string $v):string{return (new DateTimeImmutable($v))->setTimezone(new DateTimeZone('Asia/Kolkata'))->format('D, j M Y · g:i A');}
function local_input(string $v):string{return (new DateTimeImmutable($v))->setTimezone(new DateTimeZone('Asia/Kolkata'))->format('Y-m-d\TH:i');}
function url(string $page,array $args=[]):string{return '/index.php?'.http_build_query(['page'=>$page]+$args);}
function redirect(string $to):never{header('Location: '.$to,true,303);exit;}
function csrf_field():string{return '<input type="hidden" name="csrf" value="'.e($_SESSION['csrf']).'">';}
function check_csrf():void{if(!hash_equals($_SESSION['csrf'],(string)($_POST['csrf']??'')))throw new AppError('Refresh the page and try again.',403);}
function admin():bool{return !empty($_SESSION['admin']);}
function require_admin():void{if(!admin())throw new AppError('Admin sign-in required.',403);}
function uuid():string{$h=bin2hex(random_bytes(16));return substr($h,0,8).'-'.substr($h,8,4).'-4'.substr($h,13,3).'-a'.substr($h,17,3).'-'.substr($h,20,12);}
function current_user():array|false {
  if(empty($_SESSION['user_id'])) return false;
  return row('SELECT id,name,email FROM users WHERE id=?',[$_SESSION['user_id']]);
}
function claim_guest_bookings(string $userId):void {
  run('UPDATE bookings SET user_id=? WHERE guest_id=? AND user_id IS NULL',[$userId,$_SESSION['guest_id']]);
}
function register_user(array $input):void {
  $name=trim(preg_replace('/\s+/',' ',(string)($input['name']??'')));
  $email=strtolower(trim((string)($input['email']??'')));
  $password=(string)($input['password']??'');
  if(mb_strlen($name)<2||mb_strlen($name)>60)throw new AppError('Enter your name (2–60 characters).');
  if(strlen($email)>120||!filter_var($email,FILTER_VALIDATE_EMAIL))throw new AppError('Enter a valid email address.');
  if(strlen($password)<8||strlen($password)>128)throw new AppError('Use a password of 8–128 characters.');
  if($password!==(string)($input['confirm_password']??''))throw new AppError('Passwords do not match.');
  $id=uuid();
  try{run('INSERT INTO users(id,name,email,password_hash) VALUES (?,?,?,?)',[$id,$name,$email,password_hash($password,PASSWORD_DEFAULT)]);}
  catch(PDOException $ex){if(str_contains($ex->getMessage(),'UNIQUE constraint'))throw new AppError('An account with this email already exists. Sign in instead.');throw $ex;}
  session_regenerate_id(true);$_SESSION['user_id']=$id;claim_guest_bookings($id);
}
function login_user(array $input):void {
  $email=strtolower(trim((string)($input['email']??'')));
  $user=row('SELECT id,password_hash FROM users WHERE email=?',[$email]);
  if(!$user||!password_verify((string)($input['password']??''),$user['password_hash']))throw new AppError('Email or password is incorrect.',401);
  session_regenerate_id(true);$_SESSION['user_id']=$user['id'];claim_guest_bookings($user['id']);
}
function logout_user():void {
  unset($_SESSION['user_id']);
  $_SESSION['guest_id']=bin2hex(random_bytes(16));
  $_SESSION['csrf']=bin2hex(random_bytes(24));
  session_regenerate_id(true);
}
function seat_map(string $id):array{return rows("SELECT se.id,se.row_label,se.seat_number,se.tier,CASE WHEN bs.seat_id IS NULL THEN 0 ELSE 1 END AS booked FROM seats se LEFT JOIN booking_seats bs ON bs.seat_id=se.id AND bs.showtime_id=? AND bs.status='confirmed' WHERE se.auditorium_id='screen-one' ORDER BY se.row_label,se.seat_number",[$id]);}
function my_bookings():array{
  $owner=empty($_SESSION['user_id'])?'b.guest_id=?':'b.user_id=?';
  $id=$_SESSION['user_id']??$_SESSION['guest_id'];
  return rows("SELECT b.*,s.starts_at,m.title AS movie_title,a.name AS auditorium_name,GROUP_CONCAT(se.row_label||se.seat_number,', ') AS seat_labels FROM bookings b JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id JOIN auditoriums a ON a.id=s.auditorium_id JOIN booking_seats bs ON bs.booking_id=b.id JOIN seats se ON se.id=bs.seat_id WHERE $owner GROUP BY b.id ORDER BY b.created_at DESC",[$id]);
}
function create_booking(array $input):string {
  $showId=(string)($input['showtime_id']??'');
  $ids=array_values(array_filter(array_map('trim',explode(',',(string)($input['seats']??'')))));
  $name=trim(preg_replace('/\s+/',' ',(string)($input['name']??'')));
  $email=strtolower(trim((string)($input['email']??'')));
  if(count($ids)<1||count($ids)>6||count(array_unique($ids))!==count($ids))throw new AppError('Choose one to six different seats.');
  if(mb_strlen($name)<2||mb_strlen($name)>60)throw new AppError('Enter your name (2–60 characters).');
  if(strlen($email)>120||!filter_var($email,FILTER_VALIDATE_EMAIL))throw new AppError('Enter a valid email address.');
  $pdo=db();$pdo->exec('BEGIN IMMEDIATE');
  try {
    $show=row('SELECT s.*,m.active AS movie_active FROM showtimes s JOIN movies m ON m.id=s.movie_id WHERE s.id=?',[$showId]);
    if(!$show||!$show['active']||!$show['movie_active']||strtotime($show['starts_at'])<=time())throw new AppError('This showtime is no longer available.',409);
    $marks=implode(',',array_fill(0,count($ids),'?'));
    $s=$pdo->prepare("SELECT id,tier FROM seats WHERE auditorium_id=? AND id IN ($marks)");
    $s->execute(array_merge([$show['auditorium_id']],$ids));$seats=$s->fetchAll();
    if(count($seats)!==count($ids))throw new AppError('One of the selected seats is invalid.');
    $prices=[];foreach($seats as $seat)$prices[$seat['id']]=(int)$show[$seat['tier']==='premium'?'premium_price':'standard_price'];
    $id=uuid();$ref='RS-'.strtoupper(bin2hex(random_bytes(5)));
    run("INSERT INTO bookings (id,reference,guest_id,user_id,showtime_id,customer_name,customer_email,total_amount,status) VALUES (?,?,?,?,?,?,?,?,'confirmed')",[$id,$ref,$_SESSION['guest_id'],$_SESSION['user_id']??null,$showId,$name,$email,array_sum($prices)]);
    foreach($ids as $seatId)run("INSERT INTO booking_seats (booking_id,showtime_id,seat_id,price_at_booking,status) VALUES (?,?,?,?,'confirmed')",[$id,$showId,$seatId,$prices[$seatId]]);
    $pdo->commit();return $ref;
  } catch(Throwable $ex){
    if($pdo->inTransaction())$pdo->rollBack();
    if($ex instanceof PDOException&&str_contains($ex->getMessage(),'UNIQUE constraint'))throw new AppError('A selected seat was just booked. Choose another seat.',409);
    throw $ex;
  }
}
function cancel_booking(string $ref):void {
  $pdo=db();$pdo->exec('BEGIN IMMEDIATE');
  try {
    $owner=empty($_SESSION['user_id'])?'guest_id=?':'user_id=?';
    $b=row("SELECT id,status FROM bookings WHERE reference=? AND $owner",[$ref,$_SESSION['user_id']??$_SESSION['guest_id']]);
    if(!$b)throw new AppError('Booking not found.',404);
    if($b['status']!=='confirmed')throw new AppError('Booking is already cancelled.',409);
    run("UPDATE bookings SET status='cancelled',cancelled_at=datetime('now') WHERE id=?",[$b['id']]);
    run("UPDATE booking_seats SET status='cancelled' WHERE booking_id=?",[$b['id']]);
    $pdo->commit();
  }catch(Throwable $ex){if($pdo->inTransaction())$pdo->rollBack();throw $ex;}
}
function movie_input(array $in):array {
  $title=trim((string)($in['title']??''));$genre=trim((string)($in['genre']??''));
  $synopsis=trim((string)($in['synopsis']??''));$duration=filter_var($in['duration']??null,FILTER_VALIDATE_INT);
  if(mb_strlen($title)<2||mb_strlen($title)>80||mb_strlen($genre)<2||mb_strlen($genre)>30||mb_strlen($synopsis)<10||mb_strlen($synopsis)>500||!is_int($duration)||$duration<30||$duration>300)throw new AppError('Complete all movie fields. Duration must be 30–300 minutes.');
  return [$title,$genre,$synopsis,$duration];
}
function show_input(array $in):array {
  $dt=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',(string)($in['starts_at']??''),new DateTimeZone('Asia/Kolkata'));
  $std=filter_var($in['standard_price']??null,FILTER_VALIDATE_INT);$premium=filter_var($in['premium_price']??null,FILTER_VALIDATE_INT);
  if(!$dt||$dt->getTimestamp()<=time()||!is_int($std)||!is_int($premium)||$std<0||$premium<0||$std>10000||$premium>10000)throw new AppError('Choose a future date and valid prices.');
  $movie=row('SELECT id,duration_minutes FROM movies WHERE id=? AND active=1',[(string)($in['movie_id']??'')]);
  if(!$movie)throw new AppError('Choose an available movie.');
  return [$movie,$dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.000\Z'),$std,$premium];
}
function assert_screen_free(string $start,int $duration,string $exclude=''):void {
  $a=strtotime($start);$end=$a+($duration+15)*60;
  foreach(rows("SELECT s.id,s.starts_at,m.duration_minutes FROM showtimes s JOIN movies m ON m.id=s.movie_id WHERE s.auditorium_id='screen-one' AND s.active=1 AND s.id!=?",[$exclude]) as $s){
    $b=strtotime($s['starts_at']);
    if($a<$b+((int)$s['duration_minutes']+15)*60&&$end>$b)throw new AppError('Screen 1 already has a show during that time.',409);
  }
}
