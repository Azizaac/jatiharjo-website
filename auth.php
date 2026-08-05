<?php
// auth.php - Stateless Authentication for Vercel
// Uses SUPABASE_KEY to sign a secure cookie, avoiding PHP session container issues.

$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value, '"\''));
    }
}
$supabaseKey = getenv('SUPABASE_KEY') ?: $_ENV['SUPABASE_KEY'] ?? $_SERVER['SUPABASE_KEY'] ?? 'default_secret_key_123';

function set_stateless_session($username) {
    global $supabaseKey;
    $time = time();
    $data = "admin|$username|$time";
    $hash = hash_hmac('sha256', $data, $supabaseKey);
    $cookieValue = "$data|$hash";
    // Set cookie valid for 2 hours
    setcookie('admin_session', $cookieValue, $time + 7200, '/', '', true, true);
    
    // Also set CSRF token in cookie (Double Submit Cookie pattern)
    $csrf = bin2hex(random_bytes(32));
    setcookie('csrf_token', $csrf, $time + 7200, '/', '', true, false); // Accessible to JS
}

function clear_stateless_session() {
    setcookie('admin_session', '', time() - 3600, '/');
    setcookie('csrf_token', '', time() - 3600, '/');
}

function verify_stateless_session() {
    global $supabaseKey;
    if (!isset($_COOKIE['admin_session'])) return false;
    
    $parts = explode('|', $_COOKIE['admin_session']);
    if (count($parts) !== 4) return false;
    
    list($role, $user, $time, $hash) = $parts;
    
    // Check expiration (2 hours)
    if (time() - (int)$time > 7200) return false;
    
    $expectedHash = hash_hmac('sha256', "$role|$user|$time", $supabaseKey);
    return hash_equals($expectedHash, $hash);
}

function verify_csrf_token($submittedToken) {
    if (empty($_COOKIE['csrf_token']) || empty($submittedToken)) return false;
    return hash_equals($_COOKIE['csrf_token'], $submittedToken);
}
?>
