<?php
/**
 * ADMIN AUTH CHECK MIDDLEWARE
 * Verifies if admin session is active & not expired.
 *
 * SECURITY:
 * - Secure session settings
 * - Session timeout (1 hour)
 * - Prevents session fixation
 */

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check authentication
if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('Location: /admin/login.php');
    exit;
}

// Session timeout: auto-logout after 1 hour of inactivity
if (!empty($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > 3600) {
    session_unset();
    session_destroy();
    header('Location: /admin/login.php?timeout=1');
    exit;
}

// Update login time on activity
$_SESSION['login_time'] = time();
