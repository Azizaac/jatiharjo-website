<?php
/**
 * ADMIN DASHBOARD - MAIN PANEL
 * Protected page for managing Desa Jatiharjo digital showcase data
 *
 * SECURITY: auth-check.php enforces session, here we add headers & CSRF token.
 */

// Secure session settings
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

require_once __DIR__ . '/auth-check.php';

// Username from stateless cookie
$username = 'Admin';
if (isset($_COOKIE['admin_session'])) {
    $parts = explode('|', $_COOKIE['admin_session']);
    if (count($parts) === 4) {
        $username = htmlspecialchars($parts[1], ENT_QUOTES, 'UTF-8');
    }
}
$csrfToken = $_COOKIE['csrf_token'] ?? '';

// Security headers
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header("Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:;");
?>
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="csrf-token" content="<?= htmlspecialchars($_COOKIE['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
  <title>Dashboard Admin — Desa Jatiharjo</title>
  
  <!-- Google Fonts - Montserrat -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
  
  <!-- Stylesheets -->
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/admin/admin-styles.css">
</head>
<body class="admin-body">

  <!-- ==================== ADMIN NAVBAR ==================== -->
  <header class="admin-navbar">
    <div class="container-custom admin-nav-container">
      <div style="display:flex; align-items:center; gap:0.85rem;">
        <div class="brand-icon brand-icon-logo" style="width:38px; height:38px;">
          <img src="/assets/images/logo-karanganyar.webp" alt="Logo Karanganyar" style="width:34px; height:34px; object-fit:contain; mix-blend-mode:multiply;" class="logo-karanganyar-img">
        </div>
        <div>
          <strong style="font-size:1.1rem; display:block; line-height:1.1;">DESA JATIHARJO</strong>
          <span style="font-size:0.75rem; color:var(--primary-green); font-weight:700;">PANEL KELOLA DESA</span>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:1.25rem;">
        <span style="font-size:0.9rem; font-weight:600; color:var(--text-muted); display:none; @media(min-width:600px){display:inline;}">
          Halo, <strong style="color:var(--text-main);"><?= $username ?></strong>
        </span>
        <a href="/index.html" target="_blank" class="btn-sm" style="background:var(--bg-alt); color:var(--text-main); border:1px solid var(--border-color);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Lihat Website
        </a>
        <a href="logout.php" class="btn-sm btn-delete" style="text-decoration:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </a>
      </div>
    </div>
  </header>

  <!-- ==================== MAIN CONTENT CONTAINER ==================== -->
  <main class="container-custom admin-main-container">
    
    <div class="admin-page-header">
      <div>
        <h1>Dashboard Pengelolaan Website</h1>
        <p style="color:var(--text-muted); margin-top:0.25rem;">Kelola data produk UMKM, angka statistik desa, dan nomor WhatsApp narahubung secara mandiri.</p>
      </div>
      <button onclick="openAddProductModal()" class="btn-primary" style="padding:0.75rem 1.5rem; font-size:0.95rem;">
        + Tambah Produk UMKM Baru
      </button>
    </div>

    <!-- TABS BAR -->
    <div class="admin-tabs">
      <button class="tab-btn active" data-tab="umkm">🛍️ Katalog UMKM</button>
      <button class="tab-btn" data-tab="stats">📊 Statistik Desa</button>
      <button class="tab-btn" data-tab="contacts">📞 Kontak & Narahubung WA</button>
    </div>

    <!-- ================= TAB 1: KATALOG UMKM ================= -->
    <div id="tab-umkm" class="tab-content active">
      <div class="admin-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
          <h3 style="font-size:1.25rem; font-weight:700;">Daftar Produk & Olahan Warga</h3>
          <span style="font-size:0.85rem; color:var(--text-muted);">Perubahan otomatis tampil di halaman depan website.</span>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width:50px;">No</th>
                <th style="width:80px;">Gambar</th>
                <th>Judul Produk</th>
                <th>Kategori</th>
                <th>Pemilik / UMKM</th>
                <th>Harga</th>
                <th style="width:160px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="products-tbody">
              <!-- Loaded via admin.js -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ================= TAB 2: STATISTIK DESA ================= -->
    <div id="tab-stats" class="tab-content">
      <div class="admin-card">
        <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem;">Edit Angka Statistik Strip</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:2rem;">
          Nilai angka di bawah ini akan dianimasikan secara otomatis saat pengunjung meng-scroll website publik.
        </p>

        <form id="stats-form">
          <div class="form-grid-2">
            <!-- Stat 1 -->
            <div style="background:var(--bg-alt); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <h4 style="color:var(--primary-green); margin-bottom:1rem;">Statistik 1 (Lahan Sawah)</h4>
              <div class="form-group">
                <label class="form-label">Target Angka (Hektar)</label>
                <input type="number" id="stat_sawah_val" name="stat_sawah_val" class="form-input" required min="0">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Label Keterangan</label>
                <input type="text" id="stat_sawah_label" name="stat_sawah_label" class="form-input" required>
              </div>
            </div>

            <!-- Stat 2 -->
            <div style="background:var(--bg-alt); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <h4 style="color:var(--primary-blue); margin-bottom:1rem;">Statistik 2 (Populasi Sapi)</h4>
              <div class="form-group">
                <label class="form-label">Target Angka (Ekor)</label>
                <input type="number" id="stat_sapi_val" name="stat_sapi_val" class="form-input" required min="0">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Label Keterangan</label>
                <input type="text" id="stat_sapi_label" name="stat_sapi_label" class="form-input" required>
              </div>
            </div>

            <!-- Stat 3 -->
            <div style="background:var(--bg-alt); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <h4 style="color:var(--accent-gold); margin-bottom:1rem;">Statistik 3 (Jumlah UMKM)</h4>
              <div class="form-group">
                <label class="form-label">Target Angka (Jumlah)</label>
                <input type="number" id="stat_umkm_val" name="stat_umkm_val" class="form-input" required min="0">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Label Keterangan</label>
                <input type="text" id="stat_umkm_label" name="stat_umkm_label" class="form-input" required>
              </div>
            </div>

            <!-- Stat 4 -->
            <div style="background:var(--bg-alt); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <h4 style="color:var(--primary-green-dark); margin-bottom:1rem;">Statistik 4 (Kelompok Tani/Ternak)</h4>
              <div class="form-group">
                <label class="form-label">Target Angka (Jumlah Kelompok)</label>
                <input type="number" id="stat_poktan_val" name="stat_poktan_val" class="form-input" required min="0">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Label Keterangan</label>
                <input type="text" id="stat_poktan_label" name="stat_poktan_label" class="form-input" required>
              </div>
            </div>
          </div>

          <div style="margin-top:2rem; text-align:right;">
            <button type="submit" class="btn-primary" style="padding:0.85rem 2rem;">
              Simpan Perubahan Statistik
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= TAB 3: KONTAK & NARAHUBUNG WA ================= -->
    <div id="tab-contacts" class="tab-content">
      <div class="admin-card">
        <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem;">Edit Nomor WhatsApp Narahubung</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:2rem;">
          Format nomor diawali kode negara tanpa tanda +, contoh: <strong>6281234567890</strong>.
        </p>

        <form id="contacts-form">
          <div style="display:flex; flex-direction:column; gap:1.5rem;">
            
            <!-- Contact 1: Kelompok Ternak -->
            <div style="background:var(--bg-alt); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <label class="form-label" style="font-size:1rem; font-weight:700; color:var(--primary-blue);">
                1. Nomor WA Narahubung Kelompok Ternak
              </label>
              <span style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:0.75rem;">
                Digunakan pada tombol "Hubungi Kelompok Ternak" di section Peternakan Sapi.
              </span>
              <input type="text" id="wa_kelompok_ternak" name="wa_kelompok_ternak" class="form-input" placeholder="6281234567890" required>
            </div>

            <!-- Contact 2: Kelompok Tani -->
            <div style="background:var(--bg-alt); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <label class="form-label" style="font-size:1rem; font-weight:700; color:var(--primary-green);">
                2. Nomor WA Narahubung Kelompok Tani
              </label>
              <span style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:0.75rem;">
                Digunakan pada tombol "Hubungi Kelompok Tani" di section Pertanian Gabah.
              </span>
              <input type="text" id="wa_kelompok_tani" name="wa_kelompok_tani" class="form-input" placeholder="6281234567890" required>
            </div>

            <!-- Contact 3: Pendaftaran UMKM -->
            <div style="background:var(--bg-alt); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <label class="form-label" style="font-size:1rem; font-weight:700; color:var(--accent-gold);">
                3. Nomor WA Pendaftaran Produk UMKM
              </label>
              <span style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:0.75rem;">
                Digunakan pada tombol "Daftarkan Produk UMKM Gratis" di banner section UMKM.
              </span>
              <input type="text" id="wa_daftar_umkm" name="wa_daftar_umkm" class="form-input" placeholder="6281234567890" required>
            </div>

          </div>

          <div style="margin-top:2rem; text-align:right;">
            <button type="submit" class="btn-primary" style="padding:0.85rem 2rem;">
              Simpan Perubahan Nomor WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>

  </main>

  <!-- ==================== MODAL TAMBAH / EDIT PRODUK ==================== -->
  <div id="product-modal-backdrop" class="modal-backdrop" onclick="if(event.target === this) closeAdminModal()">
    <div class="modal-content-box" style="max-width:680px;">
      <button class="modal-close-btn" onclick="closeAdminModal()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      <h3 id="modal-title" style="font-size:1.5rem; font-weight:800; margin-bottom:1.5rem;">Tambah Produk UMKM</h3>

      <form id="product-form" enctype="multipart/form-data">
        <input type="hidden" id="product-id" name="id" value="">
        <input type="hidden" id="image-url-input" name="image_url_input" value="">

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="product-owner">Nama Pemilik / UMKM *</label>
            <input type="text" id="product-owner" name="owner" class="form-input" placeholder="Contoh: UMKM Ibu Lestari" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="product-category">Kategori Produk *</label>
            <select id="product-category" name="category" class="form-input" style="cursor:pointer;" required>
              <option value="hasil-bumi">Hasil Bumi & Beras</option>
              <option value="makanan">Olahan Pangan</option>
              <option value="kerajinan">Kerajinan Tangan</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="product-title-input">Judul / Nama Produk *</label>
          <input type="text" id="product-title-input" name="title" class="form-input" placeholder="Contoh: Keripik Pisang Renyah 250g" required>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="product-price">Harga / Unit *</label>
            <input type="text" id="product-price" name="price" class="form-input" placeholder="Contoh: Rp 15.000 / pack" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="product-wa">Nomor WA Pemesanan *</label>
            <input type="text" id="product-wa" name="wa_number" class="form-input" placeholder="Contoh: 6281234567890" required value="6281234567890">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="product-desc">Deskripsi Singkat Produk *</label>
          <textarea id="product-desc" name="description" class="form-textarea" rows="3" placeholder="Tuliskan keunggulan atau rasa produk..." required></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Upload Gambar Produk (Format JPG/PNG/WEBP, Maks 2MB)</label>
          <input type="file" id="product-image-file" name="image_file" class="form-input" accept="image/png, image/jpeg, image/webp" onchange="handleImagePreview(this)">
          
          <div class="image-preview-box">
            <img id="preview-img" src="/assets/images/umkm.webp" alt="Preview Gambar">
          </div>
        </div>

        <div class="modal-form-actions">
          <button type="button" onclick="closeAdminModal()" class="btn-secondary" style="color:var(--text-main); border-color:var(--border-color); background:var(--bg-alt);">
            Batal
          </button>
          <button type="submit" class="btn-primary" style="padding:0.75rem 2rem;">
            Simpan Produk
          </button>
        </div>
      </form>
    </div>
  </div>

  <script src="/admin/admin.js?v=<?= time() ?>"></script>
</body>
</html>
