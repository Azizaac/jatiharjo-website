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
  handleMultiImageUpload('pertanian_images_input', 'pertanian_images_preview_container', 'pertanianNewImages');
  handleMultiImageUpload('peternakan_images_input', 'peternakan_images_preview_container', 'peternakanNewImages');
  initGalleryImageCompression();
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
  const galleryTbody = document.getElementById('gallery-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Memuat data dari data.json...
        </td>
      </tr>
    `;
  }
  if (galleryTbody) {
    galleryTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Memuat data galeri...
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
    window.cachedGallery = data.gallery || [];

    // Render Products Table
    renderProductsTable(window.cachedProducts);

    // Update: render galeri + hero carousel slots
    renderGalleryTable(window.cachedGallery);
    const heroImgs = parseHeroImages(window.cachedSettings.hero_images);
    window.heroStoredImages = heroImgs;
    renderHeroSlots(heroImgs);

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

function parseHeroImages(val) {
  const fallback = ['assets/images/hero.webp', 'assets/images/hero-kkn.jpg', ''];
  if (!val) return fallback;
  try {
    const arr = Array.isArray(val) ? val : JSON.parse(val);
    if (Array.isArray(arr)) {
      const out = [arr[0] || '', arr[1] || '', arr[2] || ''];
      if (!out[0] && !out[1] && !out[2]) return fallback.slice(0, 1).concat(['', '']);
      return out;
    }
  } catch (e) {}
  return fallback;
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
    
    // Pertanian Data
    if (s.pertanian_data) {
      try {
        const pData = JSON.parse(s.pertanian_data);
        document.getElementById('pertanian_badge_title').value = pData.badge_title || '';
        document.getElementById('pertanian_badge_desc').value = pData.badge_desc || '';
        document.getElementById('pertanian_title').value = pData.title || '';
        document.getElementById('pertanian_desc').value = pData.desc || '';
        if (pData.steps && pData.steps.length === 3) {
          document.getElementById('pertanian_step1_title').value = pData.steps[0].title || '';
          document.getElementById('pertanian_step1_desc').value = pData.steps[0].desc || '';
          document.getElementById('pertanian_step2_title').value = pData.steps[1].title || '';
          document.getElementById('pertanian_step2_desc').value = pData.steps[1].desc || '';
          document.getElementById('pertanian_step3_title').value = pData.steps[2].title || '';
          document.getElementById('pertanian_step3_desc').value = pData.steps[2].desc || '';
        }
        if (pData.images && pData.images.length > 0) {
          window.pertanianStoredImages = pData.images;
          renderMultiImagePreview('pertanian_images_preview_container', pData.images);
        }
      } catch(e) { console.error("Error parsing pertanian_data"); }
    }

    // Peternakan Data
    if (s.peternakan_data) {
      try {
        const ptData = JSON.parse(s.peternakan_data);
        document.getElementById('peternakan_badge_title').value = ptData.badge_title || '';
        document.getElementById('peternakan_badge_desc').value = ptData.badge_desc || '';
        document.getElementById('peternakan_title').value = ptData.title || '';
        document.getElementById('peternakan_desc').value = ptData.desc || '';
        if (ptData.features && ptData.features.length === 2) {
          document.getElementById('peternakan_feat1_title').value = ptData.features[0].title || '';
          document.getElementById('peternakan_feat1_desc').value = ptData.features[0].desc || '';
          document.getElementById('peternakan_feat2_title').value = ptData.features[1].title || '';
          document.getElementById('peternakan_feat2_desc').value = ptData.features[1].desc || '';
        }
        if (ptData.images && ptData.images.length > 0) {
          window.peternakanStoredImages = ptData.images;
          renderMultiImagePreview('peternakan_images_preview_container', ptData.images);
        }
      } catch(e) { console.error("Error parsing peternakan_data"); }
    }
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
    
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      Swal.fire('Format Tidak Didukung', 'Hanya diperbolehkan format gambar JPG, PNG, dan WEBP.', 'warning');
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

function handleMultiImageUpload(inputId, containerId, globalVarName) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  input.addEventListener('change', async function() {
    if (!this.files || this.files.length === 0) return;
    
    if (this.files.length > 3) {
      Swal.fire('Maksimal 3 Gambar', 'Anda hanya dapat mengunggah maksimal 3 gambar.', 'warning');
      this.value = '';
      return;
    }

    let processedImages = [];
    let hasError = false;

    for (let i = 0; i < this.files.length; i++) {
      const file = this.files[i];
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        hasError = true;
        continue;
      }

      const dataUrl = await compressImageToWebP(file);
      processedImages.push(dataUrl);
    }

    if (hasError) {
      Swal.fire('Format Tidak Didukung', 'Beberapa file diabaikan karena format tidak didukung (harus JPG/PNG/WEBP).', 'warning');
    }

    window[globalVarName] = processedImages;
    renderMultiImagePreview(containerId, processedImages);
  });
}

function compressImageToWebP(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const MAX_WIDTH = 1200;
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
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderMultiImagePreview(containerId, imagesArray) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  imagesArray.forEach(src => {
    const box = document.createElement('div');
    box.style.width = '120px';
    box.style.height = '90px';
    box.style.borderRadius = '6px';
    box.style.overflow = 'hidden';
    box.style.border = '1px solid var(--border-color)';
    box.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover;" alt="preview">`;
    container.appendChild(box);
  });
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

  // Pertanian Form
  const pertanianForm = document.getElementById('pertanian-form');
  if (pertanianForm) {
    pertanianForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        badge_title: document.getElementById('pertanian_badge_title').value,
        badge_desc: document.getElementById('pertanian_badge_desc').value,
        title: document.getElementById('pertanian_title').value,
        desc: document.getElementById('pertanian_desc').value,
        steps: [
          { title: document.getElementById('pertanian_step1_title').value, desc: document.getElementById('pertanian_step1_desc').value },
          { title: document.getElementById('pertanian_step2_title').value, desc: document.getElementById('pertanian_step2_desc').value },
          { title: document.getElementById('pertanian_step3_title').value, desc: document.getElementById('pertanian_step3_desc').value }
        ],
        images: window.pertanianNewImages || window.pertanianStoredImages || []
      };

      const formData = new FormData();
      formData.set('action', 'save_settings');
      formData.set('csrf_token', getCsrfToken());
      formData.set('pertanian_data', JSON.stringify(payload));

      try {
        const res = await fetch('/save.php', { method: 'POST', body: formData, credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) { showAdminToast('Konten Pilar Pertanian berhasil diperbarui!'); loadAllData(); }
        else { showAdminToast(data.error || 'Terjadi kesalahan', true); }
      } catch (err) { showAdminToast('Gagal terhubung ke server save.php.', true); }
    });
  }

  // Peternakan Form
  const peternakanForm = document.getElementById('peternakan-form');
  if (peternakanForm) {
    peternakanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        badge_title: document.getElementById('peternakan_badge_title').value,
        badge_desc: document.getElementById('peternakan_badge_desc').value,
        title: document.getElementById('peternakan_title').value,
        desc: document.getElementById('peternakan_desc').value,
        features: [
          { title: document.getElementById('peternakan_feat1_title').value, desc: document.getElementById('peternakan_feat1_desc').value },
          { title: document.getElementById('peternakan_feat2_title').value, desc: document.getElementById('peternakan_feat2_desc').value }
        ],
        images: window.peternakanNewImages || window.peternakanStoredImages || []
      };

      const formData = new FormData();
      formData.set('action', 'save_settings');
      formData.set('csrf_token', getCsrfToken());
      formData.set('peternakan_data', JSON.stringify(payload));

      try {
        const res = await fetch('/save.php', { method: 'POST', body: formData, credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) { showAdminToast('Konten Pilar Peternakan berhasil diperbarui!'); loadAllData(); }
        else { showAdminToast(data.error || 'Terjadi kesalahan', true); }
      } catch (err) { showAdminToast('Gagal terhubung ke server save.php.', true); }
    });
  }

  // Update: Gallery Form (Supabase table gallery)
  const galleryForm = document.getElementById('gallery-form');
  if (galleryForm) {
    galleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(galleryForm);
      formData.set('action', 'save_gallery');
      formData.set('csrf_token', getCsrfToken());
      if (window.compressedGalleryBlob) {
        formData.set('image_file', window.compressedGalleryBlob, 'gallery.webp');
      }
      try {
        const res = await fetch('/save.php', { method: 'POST', body: formData, credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) { showAdminToast(data.message || 'Foto galeri tersimpan!'); closeGalleryModal(); loadAllData(); }
        else { showAdminToast(data.error || 'Terjadi kesalahan', true); }
      } catch (err) { showAdminToast('Gagal terhubung ke server save.php.', true); }
    });
  }
}

/* 5. DELETE PRODUCT */
function confirmDeleteProduct(id, title) {
  const safeId = parseInt(id, 10);
  
  Swal.fire({
    title: 'Hapus Produk?',
    text: `Apakah Anda yakin ingin menghapus produk "${title}"? Tindakan ini tidak dapat dibatalkan!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  }).then(async (result) => {
    if (result.isConfirmed) {
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
          Swal.fire('Terhapus!', data.message || 'Produk berhasil dihapus.', 'success');
          loadAllData();
        } else {
          Swal.fire('Gagal!', data.error || 'Gagal menghapus produk.', 'error');
        }
      } catch (err) {
        Swal.fire('Error!', 'Gagal terhubung ke server save.php.', 'error');
      }
    }
  });
}

/* TOAST NOTIFICATION */
function showAdminToast(msg, isError = false) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });

  Toast.fire({
    icon: isError ? 'error' : 'success',
    title: msg
  });
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

/* =====================================================
   UPDATE: GALERI DESA (Supabase table gallery)
   ===================================================== */
function renderGalleryTable(gallery) {
  const tbody = document.getElementById('gallery-tbody');
  if (!tbody) return;
  if (!gallery || gallery.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Belum ada foto dokumentasi. Klik "+ Tambah Foto Dokumentasi" untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }
  tbody.innerHTML = gallery.map((g, idx) => {
    const imgSrc = getSafeImageSrc(g.image_path).replace('/assets/images/umkm.webp', '/assets/images/hero.webp');
    const safeId = parseInt(g.id, 10);
    const descShort = g.description && g.description.length > 60 ? escapeHtml(g.description.substring(0, 60)) + '...' : escapeHtml(g.description || '-');
    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(g.title)}" class="thumb-img" style="width:70px;height:50px;object-fit:cover;border-radius:6px;" onerror="this.src='/assets/images/hero.webp'"></td>
        <td><strong>${escapeHtml(g.title)}</strong></td>
        <td><span class="badge-cat" style="background:var(--primary-green-subtle);color:var(--primary-green);font-size:0.75rem;">${escapeHtml(g.category || 'Kegiatan')}</span></td>
        <td><small style="color:var(--text-muted);font-weight:600;">${escapeHtml(g.date || '-')}</small></td>
        <td style="font-size:0.85rem;color:var(--text-muted);max-width:250px;">${descShort}</td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn-sm btn-edit" onclick="openEditGalleryModal(${safeId})">Edit</button>
            <button class="btn-sm btn-delete" onclick="confirmDeleteGallery(${safeId})">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddGalleryModal() {
  document.getElementById('gallery-modal-title').innerText = 'Tambah Foto Dokumentasi';
  document.getElementById('gallery-form').reset();
  document.getElementById('gallery-id').value = '';
  document.getElementById('gallery-image-url-input').value = '';
  document.getElementById('gallery-preview-img').src = '/assets/images/hero.webp';
  window.compressedGalleryBlob = null;
  document.getElementById('gallery-modal-backdrop').classList.add('active');
}

function openEditGalleryModal(id) {
  const safeId = parseInt(id, 10);
  const g = (window.cachedGallery || []).find(item => parseInt(item.id, 10) === safeId);
  if (!g) return;
  document.getElementById('gallery-modal-title').innerText = 'Edit Foto Dokumentasi';
  document.getElementById('gallery-id').value = safeId;
  document.getElementById('gallery-title-input').value = g.title || '';
  document.getElementById('gallery-category').value = g.category || 'Kegiatan';
  document.getElementById('gallery-date').value = g.date || '';
  document.getElementById('gallery-desc').value = g.description || '';
  document.getElementById('gallery-image-url-input').value = g.image_path || '';
  document.getElementById('gallery-preview-img').src = getSafeImageSrc(g.image_path).replace('/assets/images/umkm.webp', '/assets/images/hero.webp');
  window.compressedGalleryBlob = null;
  document.getElementById('gallery-modal-backdrop').classList.add('active');
}

function closeGalleryModal() {
  document.getElementById('gallery-modal-backdrop').classList.remove('active');
}

function handleGalleryImagePreview(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      Swal.fire('Format Tidak Didukung', 'Hanya JPG, PNG, dan WEBP.', 'warning');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const MAX_WIDTH = 1200;
        let width = img.width, height = img.height;
        if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          window.compressedGalleryBlob = blob;
          document.getElementById('gallery-preview-img').src = URL.createObjectURL(blob);
        }, 'image/webp', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function initGalleryImageCompression() {
  // Gallery form submit + hero slot file handling didaftarkan di initFormListeners & renderHeroSlots
}

function confirmDeleteGallery(id) {
  const safeId = parseInt(id, 10);
  Swal.fire({
    title: 'Hapus Foto?', text: 'Foto dokumentasi akan dihapus permanen.', icon: 'warning',
    showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal'
  }).then(async (result) => {
    if (!result.isConfirmed) return;
    const formData = new FormData();
    formData.append('action', 'delete_gallery');
    formData.append('id', safeId);
    formData.append('csrf_token', getCsrfToken());
    try {
      const res = await fetch('/save.php', { method: 'POST', body: formData, credentials: 'same-origin' });
      const data = await res.json();
      if (data.success) { Swal.fire('Terhapus!', data.message, 'success'); loadAllData(); }
      else Swal.fire('Gagal!', data.error || 'Gagal menghapus.', 'error');
    } catch (err) { Swal.fire('Error!', 'Gagal terhubung ke server.', 'error'); }
  });
}

/* =====================================================
   UPDATE: HERO CAROUSEL SLOTS (Supabase settings.hero_images)
   ===================================================== */
const heroPendingFiles = [null, null, null];

function renderHeroSlots(imagesArray) {
  const container = document.getElementById('hero-carousel-slots');
  if (!container) return;
  const labels = ['Foto 1 (Utama)', 'Foto 2', 'Foto 3'];
  const arr = [imagesArray[0] || '', imagesArray[1] || '', imagesArray[2] || ''];
  container.innerHTML = '';
  arr.forEach((imgPath, i) => {
    const hasImage = !!imgPath;
    const displaySrc = hasImage ? ("/" + String(imgPath).replace(/^[./]+/, '')) : '';
    const isHttp = hasImage && /^https?:\/\//i.test(imgPath);
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-alt);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;display:flex;flex-direction:column;gap:0.75rem;';
    const label = document.createElement('span');
    label.style.cssText = 'font-size:0.85rem;font-weight:700;color:var(--text-muted);';
    label.textContent = labels[i];
    const prevWrap = document.createElement('div');
    prevWrap.style.cssText = 'width:100%;height:140px;background:var(--bg-surface);border:1px dashed var(--border-color);border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;';
    if (hasImage) {
      const img = document.createElement('img');
      img.id = `hero-preview-${i}`;
      img.src = isHttp ? imgPath : displaySrc;
      img.alt = 'Slot ' + (i + 1);
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onerror = function() { this.style.display = 'none'; };
      prevWrap.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.id = `hero-preview-${i}`;
      span.style.cssText = 'color:var(--text-muted);font-size:0.8rem;text-align:center;padding:1rem;';
      span.textContent = 'Belum ada foto';
      prevWrap.appendChild(span);
    }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = `hero-file-${i}`;
    fileInput.accept = 'image/png,image/jpeg,image/webp';
    fileInput.style.fontSize = '0.8rem';
    fileInput.addEventListener('change', function() { handleHeroFilePreview(this, i); });
    box.appendChild(label);
    box.appendChild(prevWrap);
    box.appendChild(fileInput);
    if (hasImage) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-sm btn-delete';
      delBtn.style.cssText = 'font-size:0.78rem;padding:0.35rem 0.75rem;';
      delBtn.textContent = '🗑️ Hapus Foto';
      delBtn.addEventListener('click', () => deleteHeroSlot(i));
      box.appendChild(delBtn);
    }
    container.appendChild(box);
  });
  heroPendingFiles[0] = heroPendingFiles[1] = heroPendingFiles[2] = null;
}

function handleHeroFilePreview(input, slot) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      Swal.fire('Format Tidak Didukung', 'Hanya JPG/PNG/WEBP.', 'warning');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const MAX_WIDTH = 1600;
        let width = img.width, height = img.height;
        if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          // Simpan sebagai File agar bisa diupload via FormData
          heroPendingFiles[slot] = new File([blob], 'hero.webp', { type: 'image/webp' });
          const previewEl = document.getElementById(`hero-preview-${slot}`);
          const url = URL.createObjectURL(blob);
          if (previewEl && previewEl.tagName === 'SPAN') {
            const ni = document.createElement('img');
            ni.id = previewEl.id;
            ni.src = url;
            ni.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            previewEl.replaceWith(ni);
          } else if (previewEl) {
            previewEl.src = url;
            previewEl.style.display = 'block';
          }
        }, 'image/webp', 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function deleteHeroSlot(slot) {
  if (!confirm(`Hapus foto slot ${slot + 1} dari carousel hero?`)) return;
  heroPendingFiles[slot] = 'DELETE';
  const previewEl = document.getElementById(`hero-preview-${slot}`);
  if (previewEl && previewEl.tagName === 'IMG') {
    const span = document.createElement('span');
    span.id = previewEl.id;
    span.style.cssText = 'color:var(--text-muted);font-size:0.8rem;text-align:center;padding:1rem;';
    span.textContent = 'Belum ada foto';
    previewEl.replaceWith(span);
  }
  const fi = document.getElementById(`hero-file-${slot}`);
  if (fi) fi.value = '';
  showAdminToast(`Foto slot ${slot + 1} akan dihapus saat klik Simpan.`);
}

async function saveCarouselImages(type) {
  if (type !== 'hero') return;
  const formData = new FormData();
  formData.append('action', 'save_carousel_images');
  formData.append('carousel_type', 'hero');
  formData.append('csrf_token', getCsrfToken());
  const current = window.heroStoredImages || ['', '', ''];
  for (let i = 0; i < 3; i++) {
    const pending = heroPendingFiles[i];
    if (pending === 'DELETE') formData.append(`delete_slot_${i}`, '1');
    else if (pending instanceof File) formData.append(`image_file_slot_${i}`, pending);
    else formData.append(`slot_${i}`, current[i] || '');
  }
  try {
    const res = await fetch('/save.php', { method: 'POST', body: formData, credentials: 'same-origin' });
    const data = await res.json();
    if (data.success) {
      showAdminToast(data.message || 'Carousel hero diperbarui!');
      window.heroStoredImages = data.images || ['', '', ''];
      renderHeroSlots(window.heroStoredImages);
    } else showAdminToast(data.error || 'Gagal menyimpan', true);
  } catch (err) { showAdminToast('Gagal terhubung ke server.', true); }
}
