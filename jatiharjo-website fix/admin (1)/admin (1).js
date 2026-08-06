/**
 * DESA JATIHARJO - ADMIN DASHBOARD SCRIPT (FLAT-FILE JSON)
 * Manages UMKM Products, Site Statistics & WA Contacts directly via data.json & save.php
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
    const res = await fetch('../data.json?v=' + new Date().getTime());
    const data = await res.json();

    // Cache products & settings
    window.cachedProducts = data.products || [];
    window.cachedSettings = data.settings || {};

    // Render Products Table
    renderProductsTable(window.cachedProducts);

    // Populate Settings Forms
    populateSettingsForm(window.cachedSettings);

  } catch (err) {
    console.error(err);
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

/* 4. FORM SUBMISSION LISTENERS VIA SAVE.PHP */
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

/* 5. DELETE PRODUCT */
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
      border-radius: 12px;
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
