<?php
require_once __DIR__ . '/../auth.php';

clear_stateless_session();

header('Location: /admin/login.php');
exit;
?>
