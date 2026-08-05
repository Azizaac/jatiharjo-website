<?php
require_once __DIR__ . '/../auth.php';

if (!verify_stateless_session()) {
    header('Location: /admin/login.php');
    exit;
}
// Session timeout checking is now handled inside verify_stateless_session (7200 seconds / 2 hours)
?>
