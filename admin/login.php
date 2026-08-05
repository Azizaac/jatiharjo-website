<?php
/**
 * ADMIN LOGIN PAGE - DESA JATIHARJO
 * Flat-File Session Authentication
 *
 * SECURITY:
 * - Password disimpan sebagai bcrypt hash (bukan plaintext)
 * - CSRF token protection
 * - Brute-force rate limiting (max 5 percobaan / 15 menit)
 * - Secure session cookie settings
 */

// --- Secure Session Configuration ---
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Redirect if already logged in
if (!empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: index.php');
    exit;
}

// --- CREDENTIALS ---
// Password: sangsurya2026 (hashed with bcrypt cost=12)
// Untuk ganti password, jalankan:
//   php -r "echo password_hash('PASSWORD_BARU', PASSWORD_BCRYPT, array('cost'=>12));"
// lalu ganti nilai ADMIN_PASSWORD_HASH di bawah.
define('ADMIN_USERNAME',      'Jatiharjo2026');
define('ADMIN_PASSWORD_HASH', '$2y$12$cj7ywIcgjTgL5zUd2Eo5dOwHBmJQYtbf5NwYFUUDxqi6UUBVJSsUG');

// --- RATE LIMITING (file-based, 5 percobaan / 15 menit) ---
define('MAX_ATTEMPTS',    5);
define('LOCKOUT_SECS',    900); // 15 menit
$rateLimitFile = sys_get_temp_dir() . '/jatiharjo_rate_limit.json'; 

function rl_getData($f) {
    if (!file_exists($f)) return [];
    return json_decode(@file_get_contents($f), true) ?: [];
}
function rl_save($f, $d) {
    @file_put_contents($f, json_encode($d), LOCK_EX);
}
function rl_isLocked($ip, $f) {
    $d = rl_getData($f);
    if (!isset($d[$ip])) return false;
    if (time() > $d[$ip]['until']) { rl_clear($ip, $f); return false; }
    return $d[$ip]['tries'] >= MAX_ATTEMPTS;
}
function rl_addFail($ip, $f) {
    $d = rl_getData($f);
    if (!isset($d[$ip])) $d[$ip] = ['tries' => 0, 'until' => 0];
    $d[$ip]['tries']++;
    if ($d[$ip]['tries'] >= MAX_ATTEMPTS) $d[$ip]['until'] = time() + LOCKOUT_SECS;
    rl_save($f, $d);
}
function rl_clear($ip, $f) {
    $d = rl_getData($f); unset($d[$ip]); rl_save($f, $d);
}

// --- CSRF TOKEN ---
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$error    = '';
$locked   = false;
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // 1. Cek CSRF
    $tok = $_POST['csrf_token'] ?? '';
    if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $tok)) {
        $error = 'Token tidak valid. Silakan refresh halaman.';
    }
    // 2. Cek rate limit
    elseif (rl_isLocked($clientIp, $rateLimitFile)) {
        $locked = true;
        $error  = 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.';
    }
    else {
        $username = trim($_POST['username'] ?? '');
        $password = trim($_POST['password'] ?? '');

        if (hash_equals(ADMIN_USERNAME, $username) && password_verify($password, ADMIN_PASSWORD_HASH)) {
            // Login berhasil
            rl_clear($clientIp, $rateLimitFile);
            session_regenerate_id(true);
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_username']  = $username;
            $_SESSION['login_time']      = time();
            header('Location: index.php');
            exit;
        } else {
            rl_addFail($clientIp, $rateLimitFile);
            $error = 'Username atau password yang Anda masukkan salah!';
        }
    }

    // Regenerate CSRF setelah setiap POST
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Security headers
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; frame-ancestors 'none';");
?>
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Login Admin — Desa Jatiharjo</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="admin-styles.css">
</head>
<body class="admin-login-body">

  <div class="login-card-container">
    <div class="login-card-header">
      <div class="brand-icon brand-icon-logo" style="margin: 0 auto 1rem auto; width: 56px; height: 56px;">
        <img src="../assets/images/logo-karanganyar.png" alt="Logo Karanganyar" style="width:50px; height:50px; object-fit:contain; mix-blend-mode:multiply;" class="logo-karanganyar-img">
      </div>
      <h2>Dashboard Panel Admin</h2>
      <p>Branding Digital &amp; Etalase Desa Jatiharjo</p>
    </div>

    <?php if (!empty($error)): ?>
      <div class="alert-box error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></span>
      </div>
    <?php endif; ?>

    <?php if (!$locked): ?>
    <form action="login.php" method="POST" class="admin-form" autocomplete="off">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">

      <div class="form-group">
        <label class="form-label" for="username">Username Admin</label>
        <input type="text" id="username" name="username" class="form-input"
               placeholder="Masukkan username" required autofocus autocomplete="username"
               value="<?= htmlspecialchars($_POST['username'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
      </div>

      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input type="password" id="password" name="password" class="form-input"
               placeholder="Masukkan password" required autocomplete="current-password">
      </div>

      <button type="submit" class="btn-primary" style="width:100%; justify-content:center; padding:0.9rem; font-weight:700;">
        Masuk Ke Dashboard
      </button>
    </form>
    <?php else: ?>
      <p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding:1rem 0;">
        Silakan coba lagi setelah 15 menit.
      </p>
    <?php endif; ?>

    <div style="text-align:center; margin-top:2rem; font-size:0.85rem; color:var(--text-muted);">
      <a href="../index.html" style="color:var(--primary-green); text-decoration:none; font-weight:600;">← Kembali ke Halaman Utama Website</a>
    </div>
  </div>

</body>
</html>
