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
    const res = await fetch('data.json?v=' + new Date().getTime());
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
    const waNum = p.wa_number || '6281234567890';
    const escapedDesc = escapeJsString(p.description);
    const escapedTitle = escapeJsString(p.title);
    const escapedOwner = escapeJsString(p.owner);
    const escapedPrice = escapeJsString(p.price);

    return `
      <div class="umkm-card" data-category="${p.category}">
        <div class="umkm-img-wrapper">
          <img src="${p.image_path}" alt="${p.title}" class="umkm-img" onerror="this.src='assets/images/umkm.png'">
          <span class="umkm-category-badge">${catLabel}</span>
        </div>
        <div class="umkm-body">
          <div class="umkm-owner">${p.owner}</div>
          <h3 class="umkm-title">${p.title}</h3>
          <p class="umkm-desc">${p.description}</p>
          <div class="umkm-footer">
            <span class="umkm-price">${p.price}</span>
            <button onclick="openProductModal('${escapedTitle}', '${escapedOwner}', '${catLabel}', '${escapedDesc}', '${escapedPrice}', '${p.image_path}', '${waNum}')" class="btn-wa-order">
              Detail / Pesan
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
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
function openProductModal(title, owner, category, desc, price, imgUrl, waNumber) {
  const backdrop = document.getElementById('modal-backdrop');
  const modalBody = document.getElementById('modal-body-content');
  if (!backdrop || !modalBody) return;

  const encodedMsg = encodeURIComponent(`Halo ${owner}, saya berminat dengan produk "${title}" dari Etalase Website Desa Jatiharjo. Bisa minta informasi selengkapnya?`);
  const waUrl = `https://wa.me/${waNumber}?text=${encodedMsg}`;

  modalBody.innerHTML = `
    <div style="position: relative; height: 260px; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem;">
      <img src="${imgUrl}" alt="${title}" style="width:100%; height:100%; object-fit:cover;">
      <!-- ganti dengan foto asli desa -->
      <span style="position:absolute; top:1rem; right:1rem; background:rgba(0,0,0,0.7); color:#fff; padding:0.4rem 1rem; border-radius:99px; font-size:0.8rem; font-weight:700;">
        ${category}
      </span>
    </div>
    <p style="font-size:0.85rem; color:#2E7D32; font-weight:700; text-transform:uppercase; margin-bottom:0.25rem;">${owner}</p>
    <h3 style="font-size:1.5rem; font-weight:800; margin-bottom:0.75rem;">${title}</h3>
    <p style="font-size:1rem; color:var(--text-muted); margin-bottom:1.5rem; line-height:1.6;">${desc}</p>
    <div style="display:flex; align-items:center; justify-content:space-between; padding-top:1rem; border-top:1px solid var(--border-color);">
      <div>
        <span style="font-size:0.8rem; color:var(--text-light); display:block;">Kisaran Harga / Unit</span>
        <span style="font-size:1.35rem; font-weight:800; color:var(--text-main);">${price}</span>
      </div>
      <a href="${waUrl}" target="_blank" rel="noopener" class="btn-wa-order" style="padding:0.8rem 1.5rem; font-size:0.95rem;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        Pesan Via WhatsApp
      </a>
    </div>
  `;

  backdrop.classList.add('active');
}

function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}
