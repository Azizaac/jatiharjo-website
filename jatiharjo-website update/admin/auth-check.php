<?php
/**
 * ADMIN AUTH CHECK MIDDLEWARE
 * Verifies if admin session is active
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('Location: login.php');
    exit;
}
