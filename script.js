/**
 * DESA JATIHARJO - INTERACTIVE SCRIPT
 * Branding & Digital Showcase - Jatipuro, Karanganyar
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initNavbarScroll();
  initMobileMenu();
  initScrollReveal();
  fetchDynamicData();
  initUmkmFilter();
  initContactForm();
  initBackToTop();
});

/* 0. FETCH DYNAMIC DATA FROM DATA.JSON (ZERO DATABASE) */
async function fetchDynamicData() {
  try {
    // Ambil data (tanpa query string agar bisa dicache oleh Vercel CDN untuk pengunjung publik)
    const res = await fetch('get-data.php');
    const data = await res.json();

    if (data.settings) {
      applySettingsData(data.settings);
    }

    if (data.products && data.products.length > 0) {
      renderUmkmProducts(data.products);
      initUmkmFilter(); // Re-bind filter for newly rendered cards
    }
  } catch (err) {
    console.log('Using default HTML fallback data.');
  } finally {
    initCounters();
  }
}

function applySettingsData(s) {
  // Update Stats values and labels
  if (s.stat_sawah_val) {
    const el = document.getElementById('stat-sawah-val');
    if (el) el.setAttribute('data-target', s.stat_sawah_val);
  }
  if (s.stat_sawah_label) {
    const el = document.getElementById('stat-sawah-label');
    if (el) el.innerText = s.stat_sawah_label;
  }

  if (s.stat_sapi_val) {
    const el = document.getElementById('stat-sapi-val');
    if (el) el.setAttribute('data-target', s.stat_sapi_val);
  }
  if (s.stat_sapi_label) {
    const el = document.getElementById('stat-sapi-label');
    if (el) el.innerText = s.stat_sapi_label;
  }

  if (s.stat_umkm_val) {
    const el = document.getElementById('stat-umkm-val');
    if (el) el.setAttribute('data-target', s.stat_umkm_val);
  }
  if (s.stat_umkm_label) {
    const el = document.getElementById('stat-umkm-label');
    if (el) el.innerText = s.stat_umkm_label;
  }

  if (s.stat_poktan_val) {
    const el = document.getElementById('stat-poktan-val');
    if (el) el.setAttribute('data-target', s.stat_poktan_val);
  }
  if (s.stat_poktan_label) {
    const el = document.getElementById('stat-poktan-label');
    if (el) el.innerText = s.stat_poktan_label;
  }

  // Update WA Contact URLs
  if (s.wa_kelompok_tani) {
    const btn = document.getElementById('btn-wa-tani');
    if (btn) btn.href = `https://wa.me/${s.wa_kelompok_tani}?text=Halo%20Pengelola%20Kelompok%20Tani%20Desa%20Jatiharjo,%20saya%20ingin%20tanya%20mengenai%20potensi%20gabah/beras.`;
  }
  if (s.wa_kelompok_ternak) {
    const btn = document.getElementById('btn-wa-ternak');
    if (btn) btn.href = `https://wa.me/${s.wa_kelompok_ternak}?text=Halo%20Pengelola%20Peternakan%20Desa%20Jatiharjo,%20saya%20ingin%20tanya%20mengenai%20potensi%20ternak%20sapi/pupuk.`;
  }
  if (s.wa_daftar_umkm) {
    const btn = document.getElementById('btn-wa-daftar-umkm');
    if (btn) btn.href = `https://wa.me/${s.wa_daftar_umkm}?text=Halo%20Admin%20Desa%20Jatiharjo,%20saya%20warga%20Jatiharjo%20ingin%20mendaftarkan%20produk%20UMKM%20ke%20website.`;
  }
}

function renderUmkmProducts(products) {
  const container = document.getElementById('umkm-grid-container');
  if (!container) return;

  container.innerHTML = products.map(p => {
    const catLabel = p.category === 'hasil-bumi' ? 'Hasil Bumi' : (p.category === 'makanan' ? 'Olahan Pangan' : 'Kerajinan');
    const waNum    = p.wa_number || '6281234567890';
    const safeId   = parseInt(p.id, 10);
    // Sanitize all user-controlled values before inserting into HTML
    const safeCategory = escapeHtml(p.category);
    const safeTitle    = escapeHtml(p.title);
    const safeOwner    = escapeHtml(p.owner);
    const safeDesc     = escapeHtml(p.description);
    const safePrice    = escapeHtml(p.price);
    const safeCatLabel = escapeHtml(catLabel);
    const safeWa       = escapeHtml(waNum.replace(/[^0-9]/g, ''));
    // Validate image source
    const safeImgSrc   = escapeHtml(getSafeImageSrc(p.image_path));

    return `
      <div class="umkm-card" data-category="${safeCategory}">
        <div class="umkm-img-wrapper">
          <img src="${safeImgSrc}" alt="${safeTitle}" class="umkm-img" loading="lazy" onerror="this.src='assets/images/umkm.png'">
          <span class="umkm-category-badge">${safeCatLabel}</span>
        </div>
        <div class="umkm-body">
          <div class="umkm-owner">${safeOwner}</div>
          <h3 class="umkm-title">${safeTitle}</h3>
          <p class="umkm-desc">${safeDesc}</p>
          <div class="umkm-footer">
            <span class="umkm-price">${safePrice}</span>
            <button class="btn-wa-order" data-id="${safeId}">
              Detail / Pesan
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners AFTER rendering (avoids inline onclick XSS)
  container.querySelectorAll('.btn-wa-order[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const p  = products.find(item => parseInt(item.id, 10) === id);
      if (p) openProductModal(p);
    });
  });
}

/* HELPER: Safe Image Source — blocks javascript: and data: URIs */
function getSafeImageSrc(imagePath) {
  if (!imagePath) return 'assets/images/umkm.png';
  // Allow only http/https URLs or relative paths
  if (/^(javascript|data|vbscript):/i.test(imagePath)) return 'assets/images/umkm.png';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  // Relative path — return as is (browser will resolve)
  return imagePath;
}

/* HELPER: Escape HTML entities to prevent XSS */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function escapeJsString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

/* 1. DARK MODE TOGGLE WITH LOCALSTORAGE */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');

  // Check saved theme or system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  applyTheme(currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(currentTheme);
      localStorage.setItem('theme', currentTheme);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    }
  }
}

/* 2. NAVBAR SCROLL EFFECT */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active link update on scroll
    let scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });
}

/* 3. MOBILE MENU TOGGLE */
function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      const isOpen = mobileMenu.classList.contains('open');
      hamburgerBtn.setAttribute('aria-expanded', isOpen);
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
      });
    });
  }
}

/* 4. SCROLL REVEAL ANIMATION (INTERSECTION OBSERVER) */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  reveals.forEach(el => revealObserver.observe(el));
}

/* 5. STATS COUNTER ANIMATION */
function initCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  const counterSection = document.querySelector('.stats-strip');
  if (!counterSection) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        statNumbers.forEach(counter => {
          const target = +counter.getAttribute('data-target');
          const duration = 2000;
          const stepTime = 20;
          const steps = duration / stepTime;
          const increment = target / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              counter.innerText = target.toLocaleString('id-ID');
              clearInterval(timer);
            } else {
              counter.innerText = Math.ceil(current).toLocaleString('id-ID');
            }
          }, stepTime);
        });
      }
    });
  }, { threshold: 0.5 });

  observer.observe(counterSection);
}

/* 6. UMKM FILTER GRID */
function initUmkmFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const umkmCards = document.querySelectorAll('.umkm-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      umkmCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

/* 7. CONTACT FORM SIMULATION */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('form-name').value;
    
    showToast(`Terima kasih ${name}, pesan Anda berhasil terkirim ke Pengelola Etalase Jatiharjo!`);
    form.reset();
  });
}

/* TOAST NOTIFICATION */
function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1B5E20;
      color: #FFFFFF;
      padding: 1rem 2rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.95rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 3000;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      text-align: center;
      max-width: 90%;
    `;
    document.body.appendChild(toast);
  }

  toast.innerText = message;
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, 4000);
}

/* 8. BACK TO TOP BUTTON */
function initBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (!backToTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* 9. GLOBAL MODAL FOR PRODUCTS / GALLERY LIGHTBOX */
function openProductModal(p) {
  const backdrop  = document.getElementById('modal-backdrop');
  const modalBody = document.getElementById('modal-body-content');
  if (!backdrop || !modalBody) return;

  // Safely build WA URL — strip non-numeric chars from WA number
  const safeWaNumber = (p.wa_number || '6281234567890').replace(/[^0-9]/g, '');
  const encodedMsg   = encodeURIComponent('Halo, saya berminat dengan produk dari Etalase Website Desa Jatiharjo. Bisa minta informasi selengkapnya?');
  const waUrl        = `https://wa.me/${safeWaNumber}?text=${encodedMsg}`;

  // Validate image src — block javascript: and data: URIs
  const safeImgSrc = getSafeImageSrc(p.image_path);

  // Build modal content using DOM API (not innerHTML) to prevent XSS
  modalBody.innerHTML = '';

  // Image wrapper
  const imgWrap = document.createElement('div');
  imgWrap.style.cssText = 'position:relative;height:260px;border-radius:12px;overflow:hidden;margin-bottom:1.5rem;';

  const img = document.createElement('img');
  img.src = safeImgSrc;
  img.alt = p.title || '';
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
  img.onerror = function() { this.src = 'assets/images/umkm.png'; };

  const catLabel = p.category === 'hasil-bumi' ? 'Hasil Bumi' : (p.category === 'makanan' ? 'Olahan Pangan' : 'Kerajinan');
  const catBadge = document.createElement('span');
  catBadge.style.cssText = 'position:absolute;top:1rem;right:1rem;background:rgba(0,0,0,0.7);color:#fff;padding:0.4rem 1rem;border-radius:99px;font-size:0.8rem;font-weight:700;';
  catBadge.textContent = catLabel;

  imgWrap.appendChild(img);
  imgWrap.appendChild(catBadge);
  modalBody.appendChild(imgWrap);

  // Owner
  const ownerEl = document.createElement('p');
  ownerEl.style.cssText = 'font-size:0.85rem;color:#2E7D32;font-weight:700;text-transform:uppercase;margin-bottom:0.25rem;';
  ownerEl.textContent = p.owner || '';
  modalBody.appendChild(ownerEl);

  // Title
  const titleEl = document.createElement('h3');
  titleEl.style.cssText = 'font-size:1.5rem;font-weight:800;margin-bottom:0.75rem;';
  titleEl.textContent = p.title || '';
  modalBody.appendChild(titleEl);

  // Description
  const descEl = document.createElement('p');
  descEl.style.cssText = 'font-size:1rem;color:var(--text-muted);margin-bottom:1.5rem;line-height:1.6;';
  descEl.textContent = p.description || '';
  modalBody.appendChild(descEl);

  // Footer: price + WA button
  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-top:1rem;border-top:1px solid var(--border-color);';

  const priceWrap = document.createElement('div');
  const priceLabel = document.createElement('span');
  priceLabel.style.cssText = 'font-size:0.8rem;color:var(--text-light);display:block;';
  priceLabel.textContent = 'Kisaran Harga / Unit';
  const priceVal = document.createElement('span');
  priceVal.style.cssText = 'font-size:1.35rem;font-weight:800;color:var(--text-main);';
  priceVal.textContent = p.price || '';
  priceWrap.appendChild(priceLabel);
  priceWrap.appendChild(priceVal);

  const waBtn = document.createElement('a');
  waBtn.href = waUrl;
  waBtn.target = '_blank';
  waBtn.rel = 'noopener noreferrer';
  waBtn.className = 'btn-wa-order';
  waBtn.style.cssText = 'padding:0.8rem 1.5rem;font-size:0.95rem;';
  waBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> Pesan Via WhatsApp`;

  footer.appendChild(priceWrap);
  footer.appendChild(waBtn);
  modalBody.appendChild(footer);

  backdrop.classList.add('active');
}

function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}
