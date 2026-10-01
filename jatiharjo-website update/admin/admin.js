/**
 * DESA JATIHARJO - ADMIN DASHBOARD SCRIPT (FLAT-FILE JSON)
 * Manages UMKM Products, Village Gallery, Site Statistics & WA Contacts directly via data.json & save.php
 */

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
  const productsTbody = document.getElementById('products-tbody');
  const galleryTbody = document.getElementById('gallery-tbody');

  if (productsTbody) {
    productsTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Memuat data produk dari data.json...
        </td>
      </tr>
    `;
  }

  if (galleryTbody) {
    galleryTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Memuat data galeri dari data.json...
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('../data.json?v=' + new Date().getTime());
    const data = await res.json();

    // Cache products, gallery & settings
    window.cachedProducts = data.products || [];
    window.cachedGallery  = data.gallery || [];
    window.cachedSettings = data.settings || {};

    // Render Products Table
    renderProductsTable(window.cachedProducts);

    // Render Gallery Table
    renderGalleryTable(window.cachedGallery);

    // Populate Settings Forms
    populateSettingsForm(window.cachedSettings);

    // Populate Carousel Slots
    renderCarouselSlots('hero', window.cachedSettings.hero_images || ['', '', '']);
    renderCarouselSlots('pertanian', window.cachedSettings.pertanian_images || ['', '', '']);
    renderCarouselSlots('peternakan', window.cachedSettings.peternakan_images || ['', '', '']);

  } catch (err) {
    console.error(err);
    if (productsTbody) {
      productsTbody.innerHTML = `
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
    const catClass = p.category;
    const catLabel = p.category === 'hasil-bumi' ? 'Hasil Bumi' : (p.category === 'makanan' ? 'Olahan Pangan' : 'Kerajinan');
    const imgSrc = p.image_path.startsWith('http') ? p.image_path : `../${p.image_path}`;

    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>
          <img src="${imgSrc}" alt="${escapeHtml(p.title)}" class="thumb-img" onerror="this.src='../assets/images/umkm.png'">
        </td>
        <td>
          <strong>${escapeHtml(p.title)}</strong>
        </td>
        <td><span class="badge-cat ${catClass}">${catLabel}</span></td>
        <td>${escapeHtml(p.owner)}</td>
        <td><strong>${escapeHtml(p.price)}</strong></td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn-sm btn-edit" onclick="openEditProductModal(${p.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit
            </button>
            <button class="btn-sm btn-delete" onclick="confirmDeleteProduct(${p.id}, '${escapeHtml(p.title)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* RENDER GALLERY TABLE */
function renderGalleryTable(gallery) {
  const tbody = document.getElementById('gallery-tbody');
  if (!tbody) return;

  if (!gallery || gallery.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
          Belum ada foto dokumentasi galeri. Klik tombol "+ Tambah Foto Dokumentasi Baru" untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = gallery.map((g, idx) => {
    const imgSrc = g.image_path.startsWith('http') ? g.image_path : `../${g.image_path}`;
    const descShort = g.description ? (g.description.length > 60 ? g.description.substring(0, 60) + '...' : g.description) : '-';

    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>
          <img src="${imgSrc}" alt="${escapeHtml(g.title)}" class="thumb-img" style="width:70px; height:50px; object-fit:cover; border-radius:6px;" onerror="this.src='../assets/images/hero.png'">
        </td>
        <td>
          <strong>${escapeHtml(g.title)}</strong>
        </td>
        <td><span class="badge-cat" style="background:var(--primary-green-subtle); color:var(--primary-green); font-size:0.75rem;">${escapeHtml(g.category || 'Kegiatan')}</span></td>
        <td><small style="color:var(--text-muted); font-weight:600;">${escapeHtml(g.date || '-')}</small></td>
        <td style="font-size:0.85rem; color:var(--text-muted); max-width:250px;">${escapeHtml(descShort)}</td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn-sm btn-edit" onclick="openEditGalleryModal(${g.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit
            </button>
            <button class="btn-sm btn-delete" onclick="confirmDeleteGallery(${g.id}, '${escapeHtml(g.title)}')">
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
    document.getElementById('stat_sawah_val').value = s.stat_sawah_val || '450';
    document.getElementById('stat_sawah_label').value = s.stat_sawah_label || 'Hektar Lahan Sawah Produktif';
    document.getElementById('stat_sapi_val').value = s.stat_sapi_val || '1200';
    document.getElementById('stat_sapi_label').value = s.stat_sapi_label || 'Ekor Populasi Sapi Ternak';
    document.getElementById('stat_umkm_val').value = s.stat_umkm_val || '35';
    document.getElementById('stat_umkm_label').value = s.stat_umkm_label || 'UMKM Olahan & Kerajinan';
    document.getElementById('stat_poktan_val').value = s.stat_poktan_val || '12';
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
  document.getElementById('preview-img').src = '../assets/images/umkm.png';
  document.getElementById('product-modal-backdrop').classList.add('active');
}

function openEditProductModal(id) {
  const p = (window.cachedProducts || []).find(item => item.id == id);
  if (!p) return;

  document.getElementById('modal-title').innerText = 'Edit Produk UMKM';
  document.getElementById('product-id').value = p.id;
  document.getElementById('product-owner').value = p.owner;
  document.getElementById('product-title-input').value = p.title;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-price').value = p.price;
  document.getElementById('product-wa').value = p.wa_number || '6281234567890';
  document.getElementById('product-desc').value = p.description;
  document.getElementById('image-url-input').value = p.image_path;

  const imgSrc = p.image_path.startsWith('http') ? p.image_path : `../${p.image_path}`;
  document.getElementById('preview-img').src = imgSrc;

  document.getElementById('product-modal-backdrop').classList.add('active');
}

function closeAdminModal() {
  document.getElementById('product-modal-backdrop').classList.remove('active');
}

function handleImagePreview(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img').src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/* 4. GALLERY MODAL HANDLERS */
function openAddGalleryModal() {
  document.getElementById('gallery-modal-title').innerText = 'Tambah Foto Dokumentasi Kegiatan';
  document.getElementById('gallery-form').reset();
  document.getElementById('gallery-id').value = '';
  document.getElementById('gallery-image-url-input').value = '';
  document.getElementById('gallery-preview-img').src = '../assets/images/hero.png';
  document.getElementById('gallery-modal-backdrop').classList.add('active');
}

function openEditGalleryModal(id) {
  const g = (window.cachedGallery || []).find(item => item.id == id);
  if (!g) return;

  document.getElementById('gallery-modal-title').innerText = 'Edit Foto Dokumentasi Kegiatan';
  document.getElementById('gallery-id').value = g.id;
  document.getElementById('gallery-title-input').value = g.title;
  document.getElementById('gallery-category').value = g.category || 'Kegiatan';
  document.getElementById('gallery-date').value = g.date || '';
  document.getElementById('gallery-desc').value = g.description || '';
  document.getElementById('gallery-image-url-input').value = g.image_path;

  const imgSrc = g.image_path.startsWith('http') ? g.image_path : `../${g.image_path}`;
  document.getElementById('gallery-preview-img').src = imgSrc;

  document.getElementById('gallery-modal-backdrop').classList.add('active');
}

function closeGalleryModal() {
  document.getElementById('gallery-modal-backdrop').classList.remove('active');
}

function handleGalleryImagePreview(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('gallery-preview-img').src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/* 5. FORM SUBMISSION LISTENERS VIA SAVE.PHP */
function initFormListeners() {
  // Product Form
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(productForm);
      formData.append('action', 'save_product');

      try {
        const res = await fetch('../save.php', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          showAdminToast(data.message || 'Berhasil menyimpan produk!');
          closeAdminModal();
          loadAllData();
        } else {
          alert(`Gagal: ${data.error || 'Terjadi kesalahan'}`);
        }
      } catch (err) {
        alert('Gagal terhubung ke server save.php.');
      }
    });
  }

  // Gallery Form
  const galleryForm = document.getElementById('gallery-form');
  if (galleryForm) {
    galleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(galleryForm);
      formData.append('action', 'save_gallery');

      try {
        const res = await fetch('../save.php', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          showAdminToast(data.message || 'Foto dokumentasi berhasil disimpan!');
          closeGalleryModal();
          loadAllData();
        } else {
          alert(`Gagal: ${data.error || 'Terjadi kesalahan'}`);
        }
      } catch (err) {
        alert('Gagal terhubung ke server save.php.');
      }
    });
  }

  // Stats Form
  const statsForm = document.getElementById('stats-form');
  if (statsForm) {
    statsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(statsForm);
      formData.append('action', 'save_settings');

      try {
        const res = await fetch('../save.php', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          showAdminToast(data.message || 'Angka statistik berhasil diperbarui!');
          loadAllData();
        } else {
          alert(`Gagal: ${data.error}`);
        }
      } catch (err) {
        alert('Gagal terhubung ke server save.php.');
      }
    });
  }

  // Contacts Form
  const contactsForm = document.getElementById('contacts-form');
  if (contactsForm) {
    contactsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(contactsForm);
      formData.append('action', 'save_settings');

      try {
        const res = await fetch('../save.php', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          showAdminToast(data.message || 'Nomor WhatsApp narahubung berhasil diperbarui!');
          loadAllData();
        } else {
          alert(`Gagal: ${data.error}`);
        }
      } catch (err) {
        alert('Gagal terhubung ke server save.php.');
      }
    });
  }
}

/* 6. DELETE ACTIONS */
async function confirmDeleteProduct(id, title) {
  if (!confirm(`Apakah Anda yakin ingin menghapus produk "${title}"?`)) return;

  const formData = new FormData();
  formData.append('action', 'delete_product');
  formData.append('id', id);

  try {
    const res = await fetch('../save.php', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      showAdminToast(data.message || 'Produk berhasil dihapus.');
      loadAllData();
    } else {
      alert(`Gagal menghapus: ${data.error}`);
    }
  } catch (err) {
    alert('Gagal terhubung ke server save.php.');
  }
}

async function confirmDeleteGallery(id, title) {
  if (!confirm(`Apakah Anda yakin ingin menghapus foto "${title}"?`)) return;

  const formData = new FormData();
  formData.append('action', 'delete_gallery');
  formData.append('id', id);

  try {
    const res = await fetch('../save.php', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      showAdminToast(data.message || 'Foto galeri berhasil dihapus.');
      loadAllData();
    } else {
      alert(`Gagal menghapus: ${data.error}`);
    }
  } catch (err) {
    alert('Gagal terhubung ke server save.php.');
  }
}

/* TOAST NOTIFICATION */
function showAdminToast(msg) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #1B5E20;
      color: #FFFFFF;
      padding: 1rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.95rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 4000;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform: translateY(100px);
    `;
    document.body.appendChild(toast);
  }

  toast.innerText = msg;
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* =====================================================
   CAROUSEL SLOT MANAGER
   ===================================================== */

// Pending file uploads per carousel type & slot
const carouselPendingFiles = { hero: [null, null, null], pertanian: [null, null, null], peternakan: [null, null, null] };

function renderCarouselSlots(type, images) {
  const container = document.getElementById(`${type}-carousel-slots`);
  if (!container) return;

  const labels = ['Foto 1 (Utama)', 'Foto 2', 'Foto 3'];
  const imagesArr = [images[0] || '', images[1] || '', images[2] || ''];

  container.innerHTML = imagesArr.map((imgPath, i) => {
    const isExternal = imgPath && imgPath.startsWith('http');
    const displaySrc = imgPath ? (isExternal ? imgPath : `../${imgPath}`) : '';
    const hasImage = !!imgPath;

    return `
      <div style="background:var(--bg-alt); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; display:flex; flex-direction:column; gap:0.75rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--text-muted);">${labels[i]}</span>
        
        <div style="width:100%; height:140px; background:var(--bg-surface); border:1px dashed var(--border-color); border-radius:var(--radius-sm); overflow:hidden; display:flex; align-items:center; justify-content:center;">
          ${hasImage
            ? `<img id="carousel-preview-${type}-${i}" src="${displaySrc}" alt="Slot ${i+1}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">`
            : `<span id="carousel-preview-${type}-${i}" style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">Belum ada foto</span>`
          }
        </div>

        <input type="file" id="carousel-file-${type}-${i}" accept="image/png,image/jpeg,image/webp"
          style="font-size:0.8rem;"
          onchange="handleCarouselFilePreview(this, '${type}', ${i})">

        ${hasImage ? `
          <button onclick="deleteCarouselSlot('${type}', ${i})" class="btn-sm btn-delete" style="font-size:0.78rem; padding:0.35rem 0.75rem;">
            🗑️ Hapus Foto
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  // Reset pending files
  carouselPendingFiles[type] = [null, null, null];
}

function handleCarouselFilePreview(input, type, slot) {
  if (input.files && input.files[0]) {
    carouselPendingFiles[type][slot] = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewEl = document.getElementById(`carousel-preview-${type}-${slot}`);
      if (previewEl) {
        if (previewEl.tagName === 'SPAN') {
          // Replace span with img
          const img = document.createElement('img');
          img.id = previewEl.id;
          img.src = e.target.result;
          img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
          previewEl.replaceWith(img);
        } else {
          previewEl.src = e.target.result;
        }
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function deleteCarouselSlot(type, slot) {
  if (!confirm(`Hapus foto slot ${slot + 1} dari carousel ${type}?`)) return;
  // Mark this slot for deletion
  carouselPendingFiles[type][slot] = 'DELETE';

  // Update UI
  const previewEl = document.getElementById(`carousel-preview-${type}-${slot}`);
  if (previewEl) {
    if (previewEl.tagName === 'IMG') {
      const span = document.createElement('span');
      span.id = previewEl.id;
      span.style.cssText = 'color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;';
      span.textContent = 'Belum ada foto';
      previewEl.replaceWith(span);
    }
  }
  // Clear the file input
  const fileInput = document.getElementById(`carousel-file-${type}-${slot}`);
  if (fileInput) fileInput.value = '';

  showAdminToast(`Foto slot ${slot + 1} akan dihapus saat kamu klik Simpan.`);
}

async function saveCarouselImages(type) {
  const formData = new FormData();
  formData.append('action', 'save_carousel_images');
  formData.append('carousel_type', type);

  const currentImages = window.cachedSettings[`${type}_images`] || ['', '', ''];

  for (let i = 0; i < 3; i++) {
    const pending = carouselPendingFiles[type]?.[i];
    if (pending === 'DELETE') {
      formData.append(`delete_slot_${i}`, '1');
    } else if (pending instanceof File) {
      formData.append(`image_file_slot_${i}`, pending);
    } else {
      // Keep existing path
      formData.append(`slot_${i}`, currentImages[i] || '');
    }
  }

  try {
    const res = await fetch('../save.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showAdminToast(data.message || 'Carousel berhasil diperbarui!');
      // Update cached settings and re-render slots
      if (!window.cachedSettings) window.cachedSettings = {};
      window.cachedSettings[`${type}_images`] = data.images || ['', '', ''];
      renderCarouselSlots(type, window.cachedSettings[`${type}_images`]);
    } else {
      alert(`Gagal: ${data.error || 'Terjadi kesalahan'}`);
    }
  } catch (err) {
    alert('Gagal terhubung ke server save.php.');
  }
}
