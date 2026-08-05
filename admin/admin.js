/**
 * DESA JATIHARJO - ADMIN DASHBOARD SCRIPT (FLAT-FILE JSON)
 * Manages UMKM Products, Site Statistics & WA Contacts directly via data.json & save.php
 * 
 * SECURITY: All POST requests include CSRF token fetched from the page meta tag.
 */

// --- CSRF TOKEN HELPER ---
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadAllData();
  initFormListeners();
});

/* 1. TAB NAVIGATION */
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(`tab-${targetTab}`);
      if (targetEl) targetEl.classList.add('active');
    });
  });
}

/* 2. LOAD ALL DATA FROM DATA.JSON */
async function loadAllData() {
  const tbody = document.getElementById('products-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Memuat data dari data.json...
        </td>
      </tr>
    `;
  }

  try {
    // Add cache-buster to avoid stale data, but do NOT expose data.json path to arbitrary traversal
    // Fetch via PHP endpoint (data.json is blocked via .htaccess for direct access)
    const res = await fetch('/get-data.php?v=' + new Date().getTime());
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    const data = await res.json();

    // Cache products & settings
    window.cachedProducts = data.products || [];
    window.cachedSettings = data.settings || {};

    // Render Products Table
    renderProductsTable(window.cachedProducts);

    // Populate Settings Forms
    populateSettingsForm(window.cachedSettings);

  } catch (err) {
    console.error('loadAllData error:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2rem; color:#C62828;">
            Gagal memuat file data.json. Pastikan file data.json tersedia di folder root.
          </td>
        </tr>
      `;
    }
  }
}

/* RENDER PRODUCTS TABLE */
function renderProductsTable(products) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (!products || products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Belum ada produk UMKM tersimpan. Klik tombol "+ Tambah Produk UMKM" untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map((p, idx) => {
    // Sanitize all values before inserting into HTML
    const catClass = escapeHtml(p.category);
    const catLabel = p.category === 'hasil-bumi' ? 'Hasil Bumi' : (p.category === 'makanan' ? 'Olahan Pangan' : 'Kerajinan');
    const imgSrc   = getSafeImageSrc(p.image_path);
    const safeId   = parseInt(p.id, 10);

    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.title)}" class="thumb-img" onerror="this.src='/assets/images/umkm.webp'">
        </td>
        <td>
          <strong>${escapeHtml(p.title)}</strong>
        </td>
        <td><span class="badge-cat ${catClass}">${catLabel}</span></td>
        <td>${escapeHtml(p.owner)}</td>
        <td><strong>${escapeHtml(p.price)}</strong></td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn-sm btn-edit" data-id="${safeId}" onclick="openEditProductModal(${safeId})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit
            </button>
            <button class="btn-sm btn-delete" data-id="${safeId}" data-title="${escapeHtml(p.title)}" onclick="confirmDeleteProduct(${safeId}, this.getAttribute('data-title'))">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* POPULATE SETTINGS FORMS */
function populateSettingsForm(s) {
  // Stats
  if (document.getElementById('stat_sawah_val')) {
    document.getElementById('stat_sawah_val').value = parseInt(s.stat_sawah_val, 10) || 450;
    document.getElementById('stat_sawah_label').value = s.stat_sawah_label || 'Hektar Lahan Sawah Produktif';
    document.getElementById('stat_sapi_val').value = parseInt(s.stat_sapi_val, 10) || 1200;
    document.getElementById('stat_sapi_label').value = s.stat_sapi_label || 'Ekor Populasi Sapi Ternak';
    document.getElementById('stat_umkm_val').value = parseInt(s.stat_umkm_val, 10) || 35;
    document.getElementById('stat_umkm_label').value = s.stat_umkm_label || 'UMKM Olahan & Kerajinan';
    document.getElementById('stat_poktan_val').value = parseInt(s.stat_poktan_val, 10) || 12;
    document.getElementById('stat_poktan_label').value = s.stat_poktan_label || 'Kelompok Tani & Ternak';
  }

  // WA Contacts
  if (document.getElementById('wa_kelompok_ternak')) {
    document.getElementById('wa_kelompok_ternak').value = s.wa_kelompok_ternak || '6281234567890';
    document.getElementById('wa_kelompok_tani').value = s.wa_kelompok_tani || '6281234567890';
    document.getElementById('wa_daftar_umkm').value = s.wa_daftar_umkm || '6281234567890';
  }
}

/* 3. PRODUCT MODAL HANDLERS */
function openAddProductModal() {
  document.getElementById('modal-title').innerText = 'Tambah Produk UMKM Baru';
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('image-url-input').value = '';
  document.getElementById('preview-img').src = '/assets/images/umkm.webp';
  window.compressedImageBlob = null; // Reset compressed image
  document.getElementById('product-modal-backdrop').classList.add('active');
}

function openEditProductModal(id) {
  const safeId = parseInt(id, 10);
  const p = (window.cachedProducts || []).find(item => parseInt(item.id, 10) === safeId);
  if (!p) return;

  document.getElementById('modal-title').innerText = 'Edit Produk UMKM';
  document.getElementById('product-id').value = safeId;
  document.getElementById('product-owner').value = p.owner || '';
  document.getElementById('product-title-input').value = p.title || '';
  document.getElementById('product-category').value = p.category || 'hasil-bumi';
  document.getElementById('product-price').value = p.price || '';
  document.getElementById('product-wa').value = p.wa_number || '6281234567890';
  document.getElementById('product-desc').value = p.description || '';
  document.getElementById('image-url-input').value = p.image_path || '';

  const imgSrc = getSafeImageSrc(p.image_path);
  document.getElementById('preview-img').src = imgSrc;
  window.compressedImageBlob = null; // Reset compressed image

  document.getElementById('product-modal-backdrop').classList.add('active');
}

function closeAdminModal() {
  document.getElementById('product-modal-backdrop').classList.remove('active');
}

function handleImagePreview(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipe file tidak diizinkan. Hanya JPG, PNG, dan WEBP.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Client-side compression using Canvas
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to WebP at 80% quality
        canvas.toBlob((blob) => {
          window.compressedImageBlob = blob;
          document.getElementById('preview-img').src = URL.createObjectURL(blob);
        }, 'image/webp', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

/* 4. FORM SUBMISSION LISTENERS VIA SAVE.PHP */
function initFormListeners() {
  // Product Form
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(productForm);
      formData.set('action', 'save_product');
      formData.set('csrf_token', getCsrfToken());

      // If we have a compressed image, inject it into formData
      if (window.compressedImageBlob) {
        formData.set('image_file', window.compressedImageBlob, 'compressed.webp');
      }

      try {
        const res = await fetch('/save.php', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        });
        const data = await res.json();

        if (data.success) {
          showAdminToast(data.message || 'Berhasil menyimpan produk!');
          closeAdminModal();
          loadAllData();
        } else {
          showAdminToast(data.error || 'Terjadi kesalahan', true);
        }
      } catch (err) {
        showAdminToast('Gagal terhubung ke server save.php.', true);
      }
    });
  }

  // Stats Form
  const statsForm = document.getElementById('stats-form');
  if (statsForm) {
    statsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(statsForm);
      formData.set('action', 'save_settings');
      formData.set('csrf_token', getCsrfToken());

      try {
        const res = await fetch('/save.php', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        });
        const data = await res.json();

        if (data.success) {
          showAdminToast(data.message || 'Angka statistik berhasil diperbarui!');
          loadAllData();
        } else {
          showAdminToast(data.error || 'Terjadi kesalahan', true);
        }
      } catch (err) {
        showAdminToast('Gagal terhubung ke server save.php.', true);
      }
    });
  }

  // Contacts Form
  const contactsForm = document.getElementById('contacts-form');
  if (contactsForm) {
    contactsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(contactsForm);
      formData.set('action', 'save_settings');
      formData.set('csrf_token', getCsrfToken());

      try {
        const res = await fetch('/save.php', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        });
        const data = await res.json();

        if (data.success) {
          showAdminToast(data.message || 'Nomor WhatsApp narahubung berhasil diperbarui!');
          loadAllData();
        } else {
          showAdminToast(data.error || 'Terjadi kesalahan', true);
        }
      } catch (err) {
        showAdminToast('Gagal terhubung ke server save.php.', true);
      }
    });
  }
}

/* 5. DELETE PRODUCT */
async function confirmDeleteProduct(id, title) {
  const safeId = parseInt(id, 10);
  if (!confirm(`Apakah Anda yakin ingin menghapus produk ini?`)) return;

  const formData = new FormData();
  formData.append('action', 'delete_product');
  formData.append('id', safeId);
  formData.append('csrf_token', getCsrfToken());

  try {
    const res = await fetch('/save.php', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const data = await res.json();

    if (data.success) {
      showAdminToast(data.message || 'Produk berhasil dihapus.');
      loadAllData();
    } else {
      showAdminToast(data.error || 'Gagal menghapus produk.', true);
    }
  } catch (err) {
    showAdminToast('Gagal terhubung ke server save.php.', true);
  }
}

/* TOAST NOTIFICATION */
function showAdminToast(msg, isError = false) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 4000;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform: translateY(100px);
      color: #FFFFFF;
      max-width: 360px;
    `;
    document.body.appendChild(toast);
  }

  toast.style.background = isError ? '#B71C1C' : '#1B5E20';
  // Use textContent instead of innerText to avoid XSS
  toast.textContent = msg;
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
  }, 3500);
}

/* HELPER: Safe Image Source */
function getSafeImageSrc(imagePath) {
  if (!imagePath) return '/assets/images/umkm.webp';
  // If it starts with http/https, use as-is (external URL)
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  // Relative path — prepend ../ for admin context
  return '/' + imagePath.replace(/^[./]+/, '');
}

/* HELPER: Escape HTML to prevent XSS */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
