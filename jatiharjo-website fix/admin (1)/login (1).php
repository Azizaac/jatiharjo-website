<?php
/**
 * ADMIN LOGIN PAGE - DESA JATIHARJO
 * Flat-File Session Authentication (Bebas Database)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Redirect if already logged in
if (!empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($username === 'Jatiharjo2026' && $password === 'sangsurya2026') {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username']  = 'Jatiharjo2026';
        header('Location: index.php');
        exit;
    } else {
        $error = 'Username atau password yang Anda masukkan salah!';
    }
}
?>
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      <p>Branding Digital & Etalase Desa Jatiharjo</p>
    </div>

    <?php if (!empty($error)): ?>
      <div class="alert-box error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span><?= htmlspecialchars($error) ?></span>
      </div>
    <?php endif; ?>

    <form action="login.php" method="POST" class="admin-form">
      <div class="form-group">
        <label class="form-label" for="username">Username Admin</label>
        <input type="text" id="username" name="username" class="form-input" placeholder="Masukkan username" required autofocus value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
      </div>

      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input type="password" id="password" name="password" class="form-input" placeholder="Masukkan password" required>
      </div>

      <button type="submit" class="btn-primary" style="width:100%; justify-content:center; padding:0.9rem; font-weight:700;">
        Masuk Ke Dashboard
      </button>
    </form>

    <div style="text-align:center; margin-top:2rem; font-size:0.85rem; color:var(--text-muted);">
      <a href="../index.html" style="color:var(--primary-green); text-decoration:none; font-weight:600;">← Kembali ke Halaman Utama Website</a>
    </div>
  </div>

</body>
</html>
