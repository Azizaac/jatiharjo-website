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

/* 0. FETCH DYNAMIC DATA FROM SUPABASE VIA get-data.php */
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

    // Update: render galeri preview di beranda (maks 4 foto)
    if (data.gallery && data.gallery.length > 0) {
      renderHomeGallery(data.gallery);
    }
  } catch (err) {
    console.log('Using default HTML fallback data.');
    renderHeroCarousel(['assets/images/hero.webp', 'assets/images/hero-kkn.jpg']);
  } finally {
    initCounters();
  }
}

function parseImagesSetting(val, fallback) {
  if (!val) return fallback;
  try {
    if (Array.isArray(val)) return val.filter(Boolean).length ? val.filter(Boolean) : fallback;
    const arr = JSON.parse(val);
    if (Array.isArray(arr)) {
      const filtered = arr.filter(Boolean);
      return filtered.length ? filtered : fallback;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

function applySettingsData(s) {
  // Update: Hero carousel images (dikelola dari admin, disimpan sebagai JSON array)
  // Fallback 2 foto = sama seperti fallback panel admin, agar hero tetap bergantian
  // walau key hero_images belum pernah disimpan ke Supabase.
  if (s.hero_images !== undefined) {
    const heroImgs = parseImagesSetting(s.hero_images, ['assets/images/hero.webp', 'assets/images/hero-kkn.jpg']);
    renderHeroCarousel(heroImgs);
  } else {
    renderHeroCarousel(['assets/images/hero.webp', 'assets/images/hero-kkn.jpg']);
  }

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

  // Update Feature Images & Texts (JSON Data)
  if (s.pertanian_data) {
    try {
      const p = JSON.parse(s.pertanian_data);
      if (p.badge_title) document.getElementById('pertanian-badge-title').innerText = p.badge_title;
      if (p.badge_desc) document.getElementById('pertanian-badge-desc').innerText = p.badge_desc;
      if (p.title) document.getElementById('pertanian-title').innerText = p.title;
      if (p.desc) document.getElementById('pertanian-desc').innerHTML = p.desc;
      if (p.steps && p.steps.length === 3) {
        document.getElementById('pertanian-step1-title').innerText = p.steps[0].title;
        document.getElementById('pertanian-step1-desc').innerText = p.steps[0].desc;
        document.getElementById('pertanian-step2-title').innerText = p.steps[1].title;
        document.getElementById('pertanian-step2-desc').innerText = p.steps[1].desc;
        document.getElementById('pertanian-step3-title').innerText = p.steps[2].title;
        document.getElementById('pertanian-step3-desc').innerText = p.steps[2].desc;
      }
      if (p.images && p.images.length > 0) {
        renderCarousel('pertanian', p.images);
      }
    } catch(e) { console.error('Error parsing pertanian data'); }
  }

  if (s.peternakan_data) {
    try {
      const pt = JSON.parse(s.peternakan_data);
      if (pt.badge_title) document.getElementById('peternakan-badge-title').innerText = pt.badge_title;
      if (pt.badge_desc) document.getElementById('peternakan-badge-desc').innerText = pt.badge_desc;
      if (pt.title) document.getElementById('peternakan-title').innerText = pt.title;
      if (pt.desc) document.getElementById('peternakan-desc').innerHTML = pt.desc;
      if (pt.features && pt.features.length === 2) {
        document.getElementById('peternakan-feat1-title').innerText = pt.features[0].title;
        document.getElementById('peternakan-feat1-desc').innerText = pt.features[0].desc;
        document.getElementById('peternakan-feat2-title').innerText = pt.features[1].title;
        document.getElementById('peternakan-feat2-desc').innerText = pt.features[1].desc;
      }
      if (pt.images && pt.images.length > 0) {
        renderCarousel('peternakan', pt.images);
      }
    } catch(e) { console.error('Error parsing peternakan data'); }
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
          <img src="${safeImgSrc}" alt="${safeTitle}" class="umkm-img" loading="lazy" onerror="this.src='assets/images/umkm.webp'">
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
  if (!imagePath) return 'assets/images/umkm.webp';
  // Allow only http/https URLs or relative paths
  if (/^(javascript|data|vbscript):/i.test(imagePath)) return 'assets/images/umkm.webp';
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
  img.onerror = function() { this.src = 'assets/images/umkm.webp'; };

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

// Carousel Rendering Logic
function renderCarousel(prefix, images) {
  const container = document.getElementById(`${prefix}-carousel-container`);
  const dotsContainer = document.getElementById(`${prefix}-carousel-dots`);
  if (!container || !dotsContainer) return;

  if (container._autoplayTimer) {
    clearInterval(container._autoplayTimer);
  }

  container.innerHTML = '';
  dotsContainer.innerHTML = '';

  images.forEach((src, index) => {
    // Add Slide
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.innerHTML = `<img src="${src}" loading="lazy" alt="Carousel image ${index+1}">`;
    container.appendChild(slide);

    // Add Dot
    const dot = document.createElement('div');
    dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => {
      container.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    });
    dotsContainer.appendChild(dot);
  });

  // Update dots on scroll
  container.addEventListener('scroll', () => {
    const slideWidth = container.clientWidth;
    if (slideWidth === 0) return;
    const activeIndex = Math.round(container.scrollLeft / slideWidth);
    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
      if (i === activeIndex) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  });

  // Auto-play / Moving carousel logic (if > 1 image)
  if (images.length > 1) {
    let currentIndex = 0;
    const startAutoplay = () => {
      if (container._autoplayTimer) clearInterval(container._autoplayTimer);
      container._autoplayTimer = setInterval(() => {
        const slideWidth = container.clientWidth;
        if (slideWidth === 0) return;
        currentIndex = (Math.round(container.scrollLeft / slideWidth) + 1) % images.length;
        container.scrollTo({ left: currentIndex * slideWidth, behavior: 'smooth' });
      }, 4000);
    };

    const stopAutoplay = () => {
      if (container._autoplayTimer) clearInterval(container._autoplayTimer);
    };

    startAutoplay();

    // Pause on hover or touch
    const wrapper = container.closest('.carousel-wrapper') || container;
    wrapper.addEventListener('mouseenter', stopAutoplay);
    wrapper.addEventListener('mouseleave', startAutoplay);
    wrapper.addEventListener('touchstart', stopAutoplay, { passive: true });
    wrapper.addEventListener('touchend', startAutoplay, { passive: true });
  }
}

/* =====================================================
   UPDATE: HERO CAROUSEL (multi-foto fade, dari Supabase settings.hero_images)
   ===================================================== */
let heroCurrentSlide = 0;
let heroAutoPlayTimer = null;
let heroImages = [];

function renderHeroCarousel(images) {
  const safeImages = (images || []).map(getSafeImageSrc).filter(Boolean);
  heroImages = safeImages.length ? safeImages : ['assets/images/hero.webp'];
  const container = document.getElementById('hero-carousel');
  const dotsEl = document.getElementById('hero-dots');
  if (!container) return;

  if (heroAutoPlayTimer) {
    clearInterval(heroAutoPlayTimer);
    heroAutoPlayTimer = null;
  }
  heroCurrentSlide = 0;

  container.innerHTML = '';
  heroImages.forEach((src, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero-carousel-slide' + (i === 0 ? ' active' : '');
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Foto Desa Jatiharjo ' + (i + 1);
    img.className = 'hero-bg-img';
    if (i === 0) img.setAttribute('fetchpriority', 'high');
    else img.setAttribute('loading', 'lazy');
    img.onerror = function() { this.src = 'assets/images/hero.webp'; };
    slide.appendChild(img);
    container.appendChild(slide);
  });

  if (dotsEl) {
    dotsEl.innerHTML = '';
    if (heroImages.length > 1) {
      dotsEl.style.display = 'flex';
      heroImages.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', () => goToHeroSlide(i));
        dotsEl.appendChild(dot);
      });
    } else {
      dotsEl.style.display = 'none';
    }
  }

  if (heroImages.length > 1) startHeroAutoPlay();
}

function goToHeroSlide(idx, resetTimer = true) {
  const slides = document.querySelectorAll('#hero-carousel .hero-carousel-slide');
  const dots = document.querySelectorAll('#hero-dots .hero-dot');
  if (!slides.length || heroImages.length <= 1) return;
  heroCurrentSlide = ((idx % heroImages.length) + heroImages.length) % heroImages.length;
  slides.forEach((s, i) => s.classList.toggle('active', i === heroCurrentSlide));
  dots.forEach((d, i) => d.classList.toggle('active', i === heroCurrentSlide));
  if (resetTimer) startHeroAutoPlay();
}

function startHeroAutoPlay() {
  if (heroAutoPlayTimer) clearInterval(heroAutoPlayTimer);
  heroAutoPlayTimer = setInterval(() => {
    goToHeroSlide(heroCurrentSlide + 1, false);
  }, 5000);
}

/* =====================================================
   UPDATE: GALERI PREVIEW DI BERANDA (maks 4 foto dari Supabase gallery)
   ===================================================== */
function renderHomeGallery(gallery) {
  const container = document.getElementById('home-gallery-grid');
  if (!container) return;
  const previewItems = gallery.slice(0, 4);

  container.innerHTML = '';
  previewItems.forEach((g) => {
    const imgSrc = getSafeImageSrc(g.image_path) || 'assets/images/hero.webp';
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = g.title || 'Dokumentasi Desa Jatiharjo';
    img.loading = 'lazy';
    img.onerror = function() { this.src = 'assets/images/hero.webp'; };

    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';

    const cat = document.createElement('span');
    cat.style.cssText = 'font-size:0.75rem;font-weight:700;color:#8FED9D;text-transform:uppercase;margin-bottom:0.25rem;display:block;';
    cat.textContent = g.category || 'Kegiatan';

    const title = document.createElement('h4');
    title.style.cssText = 'font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:0.25rem;';
    title.textContent = g.title || '';

    const desc = document.createElement('p');
    desc.style.cssText = 'font-size:0.85rem;color:rgba(255,255,255,0.85);';
    desc.textContent = g.description || '';

    overlay.appendChild(cat);
    overlay.appendChild(title);
    overlay.appendChild(desc);
    item.appendChild(img);
    item.appendChild(overlay);

    item.style.cursor = 'pointer';
    item.addEventListener('click', () => openGalleryDetailModal(g));

    container.appendChild(item);
  });
}

function openGalleryDetailModal(g) {
  const backdrop = document.getElementById('modal-backdrop');
  const modalBody = document.getElementById('modal-body-content');
  if (!backdrop || !modalBody) return;
  modalBody.innerHTML = '';

  const imgWrap = document.createElement('div');
  imgWrap.style.cssText = 'position:relative;height:300px;border-radius:12px;overflow:hidden;margin-bottom:1.5rem;background:var(--bg-alt);';
  const img = document.createElement('img');
  img.src = getSafeImageSrc(g.image_path) || 'assets/images/hero.webp';
  img.alt = g.title || '';
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
  img.onerror = function() { this.src = 'assets/images/hero.webp'; };
  const badge = document.createElement('span');
  badge.style.cssText = 'position:absolute;top:1rem;left:1rem;background:rgba(0,0,0,0.75);color:#fff;padding:0.4rem 1rem;border-radius:6px;font-size:0.8rem;font-weight:700;text-transform:uppercase;';
  badge.textContent = g.category || 'Kegiatan';
  imgWrap.appendChild(img);
  imgWrap.appendChild(badge);
  modalBody.appendChild(imgWrap);

  if (g.date) {
    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:0.85rem;color:var(--text-muted);font-weight:600;margin-bottom:0.5rem;';
    dateEl.textContent = g.date;
    modalBody.appendChild(dateEl);
  }

  const titleEl = document.createElement('h3');
  titleEl.style.cssText = 'font-size:1.45rem;font-weight:800;margin-bottom:0.75rem;color:var(--text-main);';
  titleEl.textContent = g.title || '';
  modalBody.appendChild(titleEl);

  const descEl = document.createElement('p');
  descEl.style.cssText = 'font-size:0.95rem;color:var(--text-muted);line-height:1.6;margin-bottom:1.5rem;';
  descEl.textContent = g.description || '';
  modalBody.appendChild(descEl);

  const linkWrap = document.createElement('div');
  linkWrap.style.textAlign = 'right';
  const link = document.createElement('a');
  link.href = 'galeri.html';
  link.className = 'btn-primary';
  link.style.cssText = 'padding:0.6rem 1.25rem;font-size:0.9rem;text-decoration:none;';
  link.textContent = 'Buka Halaman Galeri Lengkap →';
  linkWrap.appendChild(link);
  modalBody.appendChild(linkWrap);

  backdrop.classList.add('active');
}
