/**
 * Singh Web Creations — Dynamic & Professional Interactive Engine
 * Pure Vanilla JavaScript — 60 FPS, High Performance, Zero Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initTypewriter();
  initCounters();
  initTiltCards();
  initHeroParallax();
  initProjectFilter();
  initLightbox();
  initSiteState();
  initCopyButtons();
  initFaqAccordion();
  initCurrencySwitcher();
  initScopeCalculator();
  initScrollReveal();
  initContactForm();
  initBackToTop();
  initActiveNav();
  initReviewSection();
});

async function initSiteState() {
  try {
    const response = await fetch('/api/site-state');
    if (!response.ok) return;
    const state = await response.json();
    (state.hiddenScreenshots || []).forEach(src => {
      document.querySelectorAll(`img[src="${CSS.escape(src)}"]`).forEach(image => {
        const frame = image.closest('.frame');
        if (frame) frame.remove();
      });
    });
  } catch (_) {}
}

/* ==========================================================================
   1. Mobile Navigation Drawer & Hamburger Toggle
   ========================================================================== */
function initMobileNav() {
  const hamburger = document.querySelector('.hamburger-btn');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const backdrop = document.querySelector('.mobile-drawer-backdrop');

  if (!hamburger || !drawer) return;

  function toggleMenu(forceClose = false) {
    const shouldOpen = forceClose ? false : !drawer.classList.contains('open');
    hamburger.classList.toggle('is-active', shouldOpen);
    drawer.classList.toggle('open', shouldOpen);
    if (backdrop) backdrop.classList.toggle('active', shouldOpen);
    document.body.style.overflow = shouldOpen ? 'hidden' : '';
  }

  hamburger.addEventListener('click', () => toggleMenu());
  if (backdrop) backdrop.addEventListener('click', () => toggleMenu(true));

  // Close drawer on link click
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleMenu(true));
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      toggleMenu(true);
    }
  });
}

/* ==========================================================================
   4. Hero Typewriter Effect
   ========================================================================== */
function initTypewriter() {
  const target = document.querySelector('.typewriter-text');
  if (!target) return;

  const words = [
    'High-Performance Web Apps.',
    'Pixel-Perfect UI/UX.',
    'Scalable Full-Stack Solutions.',
    'Modern Digital Experiences.'
  ];

  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 90;

  function type() {
    const currentWord = words[wordIndex];

    if (isDeleting) {
      target.textContent = currentWord.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 45;
    } else {
      target.textContent = currentWord.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 95;
    }

    if (!isDeleting && charIndex === currentWord.length) {
      // Pause at full word
      typingSpeed = 1800;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typingSpeed = 400;
    }

    setTimeout(type, typingSpeed);
  }

  type();
}

/* ==========================================================================
   5. Animated Number Counters
   ========================================================================== */
function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const targetValue = parseFloat(el.getAttribute('data-target'));
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        const isDecimal = targetValue % 1 !== 0;
        const duration = 1600; // ms
        const startTime = performance.now();

        function updateCounter(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          const currentVal = easeProgress * targetValue;

          el.textContent = `${prefix}${isDecimal ? currentVal.toFixed(1) : Math.floor(currentVal)}${suffix}`;

          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            el.textContent = `${prefix}${targetValue}${suffix}`;
          }
        }

        requestAnimationFrame(updateCounter);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
}

/* ==========================================================================
   6. 3D Tilt Cards, Tactile Tiles & Glare Reflection
   ========================================================================== */
function initTiltCards() {
  // Disable tilt on touch devices or if reduced motion is requested
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const tiltElements = document.querySelectorAll(
    '.project-card, .service, .contact-method, .process-step, .stat, .user-review-card, .skill-chip, .photo-card'
  );

  tiltElements.forEach(card => {
    // Inject dynamic specular glare element if not present (except small chips and stats)
    if (!card.querySelector('.card-glare') && !card.classList.contains('skill-chip') && !card.classList.contains('stat')) {
      const glare = document.createElement('div');
      glare.className = 'card-glare';
      card.appendChild(glare);
    }

    let isHovered = false;

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      card.style.transition = 'transform 0.12s ease-out, border-color 0.2s ease-out, box-shadow 0.25s ease-out';
    });

    card.addEventListener('mousemove', (e) => {
      if (!isHovered) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Mouse spotlight variables for card-glare
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      // Gentle Multi-Layer 3D Tilt
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const maxAngle = card.classList.contains('skill-chip') ? 6 : (card.classList.contains('stat') ? 5 : 7);
      const rotateX = ((y - centerY) / centerY) * -maxAngle;
      const rotateY = ((x - centerX) / centerX) * maxAngle;
      const lift = card.classList.contains('skill-chip') ? -6 : -5;
      const zDepth = card.classList.contains('skill-chip') ? 14 : 10;

      card.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(${zDepth}px) translateY(${lift}px)`;
    });

    card.addEventListener('mouseleave', () => {
      isHovered = false;
      card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.3s ease, box-shadow 0.4s ease';
      card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0) translateY(0)';
    });
  });
}

/**
 * Hero Profile Parallax Tracking (Subtle, organic 3D ambient tilt)
 */
function initHeroParallax() {
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hero = document.querySelector('.hero');
  const photoCard = document.querySelector('.photo-card');
  if (!hero || !photoCard) return;

  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;
  let isHovering = false;
  let rafId = null;

  hero.addEventListener('mouseenter', () => {
    isHovering = true;
    if (!rafId) updateParallax();
  });

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const cX = rect.left + rect.width / 2;
    const cY = rect.top + rect.height / 2;
    mouseX = ((e.clientX - cX) / (rect.width / 2)) * 5; // gentle 5 deg max
    mouseY = ((e.clientY - cY) / (rect.height / 2)) * -5;
  }, { passive: true });

  hero.addEventListener('mouseleave', () => {
    isHovering = false;
    mouseX = 0;
    mouseY = 0;
  });

  function updateParallax() {
    currentX += (mouseX - currentX) * 0.08;
    currentY += (mouseY - currentY) * 0.08;

    // Only apply if user is not hovering directly over the photo card itself
    if (!photoCard.matches(':hover')) {
      photoCard.style.transform = `perspective(1200px) rotateX(${currentY.toFixed(2)}deg) rotateY(${currentX.toFixed(2)}deg)`;
    }

    if (isHovering || Math.abs(currentX) > 0.04 || Math.abs(currentY) > 0.04) {
      rafId = requestAnimationFrame(updateParallax);
    } else {
      photoCard.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
      rafId = null;
    }
  }
}

/* ==========================================================================
   7. Project Category Filter & Live Search
   ========================================================================== */
function initProjectFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card, .project-detail');
  const searchInput = document.getElementById('projectSearchInput');
  const countBadge = document.getElementById('projectCountBadge');

  if (!filterButtons.length && !projectCards.length) return;

  let activeFilter = 'all';
  let currentSearch = '';

  function applyFilters() {
    let visibleCount = 0;
    const query = currentSearch.toLowerCase().trim();

    projectCards.forEach(card => {
      const category = (card.getAttribute('data-category') || '').toLowerCase();
      const content = card.textContent.toLowerCase();

      const matchesFilter = activeFilter === 'all' || category.includes(activeFilter.toLowerCase());
      const matchesSearch = !query || content.includes(query);

      if (matchesFilter && matchesSearch) {
        card.style.display = '';
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0) scale(1)';
        }, 30);
        visibleCount++;
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(12px) scale(0.97)';
        setTimeout(() => {
          if (!matchesFilter || !matchesSearch) card.style.display = 'none';
        }, 220);
      }
    });

    if (countBadge) {
      if (query) {
        countBadge.textContent = visibleCount === 0
          ? `No projects match "${currentSearch}"`
          : `Showing ${visibleCount} of ${projectCards.length} matching "${currentSearch}"`;
      } else if (activeFilter !== 'all') {
        const activeBtn = document.querySelector(`.filter-btn[data-filter="${activeFilter}"]`);
        const filterName = activeBtn ? activeBtn.textContent.trim() : activeFilter;
        countBadge.textContent = `Showing ${visibleCount} ${filterName} Project${visibleCount === 1 ? '' : 's'}`;
      } else {
        countBadge.textContent = `Showing All ${projectCards.length} Projects`;
      }
    }
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      activeFilter = btn.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearch = e.target.value;
        applyFilters();
      }, 120);
    });
  }

  // Initial count badge setup
  if (countBadge && projectCards.length) {
    countBadge.textContent = `Showing All ${projectCards.length} Projects`;
  }
}

/* ==========================================================================
   8. Lightbox Modal with Keyboard Navigation & Counter
   ========================================================================== */
function initLightbox() {
  const overlay = document.getElementById('screenshotOverlay');
  const modalImg = document.getElementById('screenshotImage');
  const modalTitle = document.getElementById('screenshotTitle');
  const modalCounter = document.getElementById('modalCounter');
  const closeBtn = document.getElementById('closeScreenshot');
  const prevBtn = document.getElementById('modalPrev');
  const nextBtn = document.getElementById('modalNext');

  if (!overlay || !modalImg) return;

  let currentGallery = [];
  let currentIndex = 0;

  // Gather all frames and add overlay icon
  document.querySelectorAll('.frame').forEach(frame => {
    const img = frame.querySelector('img');
    if (!img) return;

    // Add hover overlay if not present
    if (!frame.querySelector('.frame-overlay')) {
      const overlayDiv = document.createElement('div');
      overlayDiv.className = 'frame-overlay';
      overlayDiv.innerHTML = '<span>🔍 View Fullscreen</span>';
      frame.appendChild(overlayDiv);
    }

    frame.addEventListener('click', async () => {
      const user = window.requireAuthenticatedUser ? await window.requireAuthenticatedUser() : true;
      if (!user) {
        showAuthPrompt('Sign in or create an account to view full-size project screenshots.');
        return;
      }

      // Find parent section or container frames
      const parentContainer = frame.closest('.frames') || document;
      const imagesInParent = Array.from(parentContainer.querySelectorAll('.frame img'));

      currentGallery = imagesInParent.map(i => ({
        src: i.src,
        alt: i.alt || 'Screenshot Preview'
      }));

      currentIndex = imagesInParent.indexOf(img);
      if (currentIndex === -1) currentIndex = 0;

      updateModalView();
      openModal();
    });
  });

  function updateModalView() {
    if (!currentGallery.length) return;
    const item = currentGallery[currentIndex];
    modalImg.src = item.src;
    modalImg.alt = item.alt;
    modalImg.classList.remove('zoomed');

    if (modalTitle) modalTitle.textContent = item.alt;
    if (modalCounter) {
      modalCounter.textContent = `${currentIndex + 1} / ${currentGallery.length}`;
    }
  }

  function openModal() {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showNext() {
    if (currentGallery.length <= 1) return;
    currentIndex = (currentIndex + 1) % currentGallery.length;
    updateModalView();
  }

  function showPrev() {
    if (currentGallery.length <= 1) return;
    currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    updateModalView();
  }

  // Event handlers
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  modalImg.addEventListener('click', (e) => {
    e.stopPropagation();
    modalImg.classList.toggle('zoomed');
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('show')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });
}

/* ==========================================================================
   9. One-Click Copy to Clipboard with Tooltip
   ========================================================================== */
function initCopyButtons() {
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<span>✓ Copied!</span>';

        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalText;
        }, 2200);
      } catch (err) {
        console.warn('Clipboard copy failed:', err);
      }
    });
  });
}

/* ==========================================================================
   10. Interactive FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!questionBtn || !answer) return;

    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const otherBtn = otherItem.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
        }
      });

      if (!isOpen) {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        item.classList.remove('active');
        questionBtn.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = null;
      }
    });
  });
}

/* ==========================================================================
   11. Smooth Entrance & Scroll Reveal Animations
   ========================================================================== */
function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.hero-left > *, .photo-card, .card-banner, .section-header, .project-card, .service, .process-step, .review, .feature-list li, .contact-method, .contact-form-wrapper, .faq-item, .skill-chip, .review-form-card'
  );

  targets.forEach((el, index) => {
    el.classList.add('reveal-item');
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
}

/* ==========================================================================
   12. Fully Validated Contact Form with Status Feedback & Multi-Backend
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');
  const selectedServiceInput = document.getElementById('selectedService');
  const selectedBudgetInput = document.getElementById('selectedBudget');
  const urgencySelect = document.getElementById('urgency');
  const submitBtn = document.getElementById('contactSubmitBtn') || form.querySelector('button[type="submit"]');
  const statusDiv = document.getElementById('status');

  // 1. Interactive Service and Budget Selection Pills
  const servicePills = document.querySelectorAll('#servicePills .inquiry-pill');
  servicePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const wasActive = pill.classList.contains('active');
      servicePills.forEach(p => p.classList.remove('active'));
      if (!wasActive) {
        pill.classList.add('active');
        if (selectedServiceInput) selectedServiceInput.value = pill.getAttribute('data-value') || '';
      } else {
        if (selectedServiceInput) selectedServiceInput.value = '';
      }
    });
  });

  const budgetPills = document.querySelectorAll('#budgetPills .inquiry-pill');
  budgetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const wasActive = pill.classList.contains('active');
      budgetPills.forEach(p => p.classList.remove('active'));
      if (!wasActive) {
        pill.classList.add('active');
        if (selectedBudgetInput) selectedBudgetInput.value = pill.getAttribute('data-value') || '';
      } else {
        if (selectedBudgetInput) selectedBudgetInput.value = '';
      }
    });
  });

  // 2. Pre-fill from URL parameters (e.g., ?plan=Pro&budget=5000&scope=...&service=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    const budgetParam = urlParams.get('budget');
    const currencyParam = urlParams.get('currency') || 'INR';
    const scopeParam = urlParams.get('scope');
    const serviceParam = urlParams.get('service');
    const subjectParam = urlParams.get('subject');

    if (subjectParam && subjectInput) {
      subjectInput.value = decodeURIComponent(subjectParam);
    } else if (planParam && subjectInput) {
      subjectInput.value = `Project Inquiry — ${decodeURIComponent(planParam)} Package`;
    }

    if (serviceParam) {
      const decodedService = decodeURIComponent(serviceParam).toLowerCase();
      servicePills.forEach(pill => {
        const val = (pill.getAttribute('data-value') || '').toLowerCase();
        if (val.includes(decodedService) || decodedService.includes(val)) {
          pill.click();
        }
      });
    }

    if (budgetParam) {
      const numBudget = parseInt(budgetParam, 10);
      if (!isNaN(numBudget) && budgetPills.length >= 4) {
        // Match appropriate budget tier based on INR equivalent or raw value
        if (numBudget <= 10000) {
          budgetPills[0]?.click();
        } else if (numBudget <= 25000) {
          budgetPills[1]?.click();
        } else if (numBudget <= 50000) {
          budgetPills[2]?.click();
        } else {
          budgetPills[3]?.click();
        }
      }
    }

    if (scopeParam && messageInput) {
      const decodedScope = decodeURIComponent(scopeParam);
      messageInput.value = `Selected Scope: ${decodedScope}\n\nProject Requirements & Vision:\n`;
    }
  } catch (_) {}

  /**
   * Validates whether an email address is authentic and acceptable.
   * Detects disposable addresses, test domains, placeholder usernames, and formatting errors.
   */
  function validateEmail(email) {
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed) {
      return { valid: false, error: 'Please enter your email address.' };
    }

    if (trimmed.length < 6 || trimmed.length > 254) {
      return { valid: false, error: 'Please enter a valid email address.' };
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Please enter a valid email format (e.g. name@domain.com).' };
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2) {
      return { valid: false, error: 'Please enter a valid email address.' };
    }

    const [user, domain] = parts;

    if (user.length < 2) {
      return { valid: false, error: 'Email username must be at least 2 characters.' };
    }
    if (user.startsWith('.') || user.endsWith('.') || user.includes('..')) {
      return { valid: false, error: 'Email address cannot start, end, or contain consecutive dots.' };
    }

    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) {
      return { valid: false, error: 'Email address must end with a valid domain extension (e.g. .com, .in).' };
    }

    // Disposable / temporary throwaway email domains
    const disposableDomains = new Set([
      'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'throwawaymail.com',
      'sharklasers.com', 'getairmail.com', 'dispostable.com', 'trashmail.com', 'yopmail.com',
      'fakeinbox.com', 'temp-mail.org', 'maildrop.cc', 'inboxkitten.com', 'mohmal.com',
      'crazymailing.com', 'nada.ltd', 'dropmail.me', 'fakemailgenerator.com', 'generator.email',
      'emailondeck.com', 'burnermail.io', 'getnada.com', 'trashmail.net', 'mytemp.email',
      'tempail.com', 'guerrillamailblock.com', 'guerrillamail.net', 'guerrillamail.biz', 'guerrillamail.org',
      'fakemail.net', 'trashmail.io', 'tempmailaddress.com', 'tmail.ws', 'trash-mail.com', 'mytempemail.com',
      'armyspy.com', 'cuvox.de', 'dayrep.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com', 'rhyta.com',
      'superrito.com', 'teleworm.us', 'tinemail.com', 'mailcatch.com', 'spambog.com', 'trashmail.de'
    ]);
    if (disposableDomains.has(domain)) {
      return { valid: false, error: 'Disposable or temporary email addresses are not accepted.' };
    }

    // Dummy / reserved / test domains
    const dummyDomains = new Set([
      'example.com', 'example.org', 'example.net', 'test.com', 'test.org', 'test.net', 'testing.com',
      'sample.com', 'sample.org', 'sample.net', 'invalid.com', 'invalid.org', 'fake.com', 'fakemail.com',
      'dummy.com', 'dummyemail.com', 'nowhere.com', 'asdf.com', 'xyz.com', 'abc.com', 'foo.com', 'bar.com',
      'baz.com', 'domain.com', 'somedomain.com', 'yourdomain.com', 'myemail.com', 'email.com', 'nomail.com'
    ]);
    if (dummyDomains.has(domain)) {
      return { valid: false, error: 'Placeholder or dummy email domains are not accepted. Please enter your genuine email.' };
    }

    // Common typosquatting domains
    const domainTypos = {
      'gamil.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmil.com': 'gmail.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmaill.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com'
    };
    if (domainTypos[domain]) {
      return { valid: false, error: `Did you mean @${domainTypos[domain]}? Please check your email domain spelling.` };
    }

    // Obvious placeholder / dummy usernames
    const fakeUsernames = new Set([
      'test', 'testing', 'fake', 'dummy', 'asdf', 'asdfgh', 'asdfghjkl', 'qwerty', 'qwertyuiop',
      'noemail', 'none', 'nobody', 'null', 'undefined', 'na', 'admin', 'administrator', 'root',
      'user', 'someone', 'anyone', 'temp', 'temporary', 'sample', 'demo', 'xyz', 'abc', '12345',
      '123456', '1234567', '12345678', '123456789', '1234567890'
    ]);
    if (fakeUsernames.has(user)) {
      return { valid: false, error: 'Please enter a genuine personal or business email address.' };
    }

    // Repetitive identical character usernames (e.g. aaaaa, 11111)
    if (user.length >= 4 && /^([a-zA-Z0-9])\1+$/.test(user)) {
      return { valid: false, error: 'Please enter a genuine email address. Repetitive dummy patterns are not accepted.' };
    }

    // Identical username and domain base (e.g. test@test.com)
    const baseDomain = domain.split('.')[0];
    if (user === baseDomain && ['test', 'mail', 'email', 'fake', 'dummy', 'user'].includes(user)) {
      return { valid: false, error: 'Please enter a genuine personal or business email address.' };
    }

    return { valid: true };
  }

  /**
   * Validates whether a phone number is genuine and acceptable.
   * Detects repetitive, sequential, dummy, or invalid international/local patterns.
   */
  function validatePhone(phone) {
    const trimmed = String(phone || '').trim();
    if (!trimmed) {
      return { valid: false, error: 'Please enter your phone or WhatsApp number.' };
    }

    // Allowed characters: digits, spaces, +, -, parentheses
    if (!/^[+\d\s\-()]+$/.test(trimmed)) {
      return { valid: false, error: 'Phone number can only contain digits, spaces, hyphens, parentheses, and leading +.' };
    }

    const digits = trimmed.replace(/\D/g, '');

    if (digits.length < 10) {
      return { valid: false, error: 'Phone number must have at least 10 digits.' };
    }
    if (digits.length > 15) {
      return { valid: false, error: 'Phone number cannot exceed 15 digits.' };
    }

    // All identical digits (e.g. 0000000000, 1111111111, 9999999999)
    if (/^(\d)\1+$/.test(digits)) {
      return { valid: false, error: 'Please enter a genuine phone number. Numbers with all identical digits are not accepted.' };
    }

    // 6 or more identical consecutive digits (e.g. 9899999912)
    if (/(\d)\1{5,}/.test(digits)) {
      return { valid: false, error: 'Please enter a valid phone number. Repeated dummy patterns are not accepted.' };
    }

    // Too few unique digits (< 3 unique digits is virtually always dummy, e.g. 1212121212, 1122112211)
    const uniqueDigits = new Set(digits);
    if (uniqueDigits.size < 3) {
      return { valid: false, error: 'Please enter a genuine phone number. Dummy patterns are not accepted.' };
    }

    // Sequential runs (ascending or descending)
    const sequentialPatterns = [
      '0123456789', '1234567890', '2345678901', '3456789012',
      '9876543210', '8765432109', '7654321098', '6543210987',
      '1234512345', '0123401234', '1231231234', '9879879870'
    ];
    for (const seq of sequentialPatterns) {
      if (digits.includes(seq)) {
        return { valid: false, error: 'Please enter a genuine phone number. Sequential dummy numbers are not accepted.' };
      }
    }

    // Fictional / dummy phone numbers (e.g. US 555-0100 to 555-0199)
    if (/55501\d{2}/.test(digits)) {
      return { valid: false, error: 'Fictional/reserved test numbers are not accepted.' };
    }

    // 10-digit number specific check (mobile format without international prefix)
    if (digits.length === 10) {
      if (digits.startsWith('0') || digits.startsWith('1')) {
        return { valid: false, error: 'A 10-digit phone number cannot start with 0 or 1. Include your country code if international.' };
      }
    }

    // If starts with country code 91 (India) and is 12 digits: 91 + 10 digits
    if (digits.length === 12 && digits.startsWith('91')) {
      const nationalNumber = digits.slice(2);
      if (!['6', '7', '8', '9'].includes(nationalNumber.charAt(0))) {
        return { valid: false, error: 'Indian mobile numbers must start with 6, 7, 8, or 9 after +91.' };
      }
    }

    return { valid: true };
  }

  // Real-time error removal when user starts typing
  [nameInput, emailInput, phoneInput, subjectInput, messageInput].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const errEl = document.getElementById('contact' + input.id.charAt(0).toUpperCase() + input.id.slice(1) + 'Error');
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('active');
      }
    });
  });

  // Blur validation for instant feedback
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const val = emailInput.value.trim();
      if (!val) return;
      const res = validateEmail(val);
      if (!res.valid) {
        if (emailInput) emailInput.classList.add('is-invalid');
        const errEl = document.getElementById('contactEmailError');
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.add('active');
        }
      }
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('blur', () => {
      const val = phoneInput.value.trim();
      if (!val) return;
      const res = validatePhone(val);
      if (!res.valid) {
        if (phoneInput) phoneInput.classList.add('is-invalid');
        const errEl = document.getElementById('contactPhoneError');
        if (errEl) {
          errEl.textContent = res.error;
          errEl.classList.add('active');
        }
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasError = false;
    const nameVal = nameInput ? nameInput.value.trim() : '';
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const phoneVal = phoneInput ? phoneInput.value.trim() : '';
    const subjectVal = subjectInput ? subjectInput.value.trim() : '';
    const messageVal = messageInput ? messageInput.value.trim() : '';
    const serviceVal = selectedServiceInput ? selectedServiceInput.value.trim() : '';
    const budgetVal = selectedBudgetInput ? selectedBudgetInput.value.trim() : '';
    const urgencyVal = urgencySelect ? urgencySelect.value : 'Standard (2–3 weeks)';

    function showError(input, errorId, message) {
      if (input) input.classList.add('is-invalid');
      const errEl = document.getElementById(errorId);
      if (errEl) {
        errEl.textContent = message;
        errEl.classList.add('active');
      }
      if (!hasError && input) input.focus();
      hasError = true;
    }

    // Name Validation
    if (!nameVal || nameVal.length < 2) {
      showError(nameInput, 'contactNameError', 'Please enter your full name (minimum 2 characters).');
    }

    // Email Validation with Fake Detection
    const emailCheck = validateEmail(emailVal);
    if (!emailCheck.valid) {
      showError(emailInput, 'contactEmailError', emailCheck.error);
    }

    // Phone Validation with Fake Detection
    const phoneCheck = validatePhone(phoneVal);
    if (!phoneCheck.valid) {
      showError(phoneInput, 'contactPhoneError', phoneCheck.error);
    }

    // Subject Validation
    if (!subjectVal || subjectVal.length < 2) {
      showError(subjectInput, 'contactSubjectError', 'Please enter the project subject or topic.');
    }

    // Message Validation
    if (!messageVal || messageVal.length < 10) {
      showError(messageInput, 'contactMessageError', 'Please describe your project requirements in more detail (min 10 characters).');
    }

    if (hasError) return;

    // Button loading state
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const btnLoading = submitBtn ? submitBtn.querySelector('.btn-loading') : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (btnLoading) btnLoading.style.display = 'inline-flex';
    }
    if (statusDiv) statusDiv.style.display = 'none';

    try {
      // 1. Submit to Formspree endpoint (form data automatically carries hidden inputs & select)
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      // 2. Backup to Supabase 'messages' and 'orders' tables if connected
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('messages').insert([{
            name: nameVal,
            email: emailVal,
            phone: phoneVal,
            subject: serviceVal ? `[${serviceVal}] ${subjectVal}` : subjectVal,
            message: `Service: ${serviceVal || 'Not specified'}\nBudget: ${budgetVal || 'Not specified'}\nTimeline: ${urgencyVal}\n\nClient Requirements:\n${messageVal}`
          }]);
        } catch (_) {}

        try {
          if (window.SUPABASE_CONFIG_READY) await window.SUPABASE_CONFIG_READY;
          const { data: { user } } = await client.auth.getUser();

          // Calculate numeric total if extracted from budget
          let budgetNumeric = 0;
          if (budgetVal) {
            const digits = budgetVal.replace(/[^0-9]/g, '');
            if (digits) budgetNumeric = parseInt(digits, 10) || 0;
            if (budgetVal.toLowerCase().includes('k') && budgetNumeric < 1000) {
              budgetNumeric = budgetNumeric * 1000;
            }
          }

          await client.from('orders').insert([{
            user_id: user?.id || null,
            title: `${subjectVal} — ${nameVal}`,
            customer_name: nameVal,
            mobile: phoneVal || 'Not provided',
            description: `Service: ${serviceVal || 'Not specified'}\nBudget: ${budgetVal || 'Not specified'}\nTimeline: ${urgencyVal}\n\n${messageVal}`,
            status: 'pending',
            total: budgetNumeric
          }]);
        } catch (_) {}
      }

      if (response.ok) {
        if (statusDiv) {
          statusDiv.className = 'form-status success';
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = `<strong>✓ Inquiry Received!</strong> Thank you, ${escapeHTML(nameVal)}. Gursimran will contact you within 24 hours.`;
        }
        form.reset();
        servicePills.forEach(p => p.classList.remove('active'));
        budgetPills.forEach(p => p.classList.remove('active'));
        if (selectedServiceInput) selectedServiceInput.value = '';
        if (selectedBudgetInput) selectedBudgetInput.value = '';
      } else {
        throw new Error('Form service returned error status');
      }
    } catch (err) {
      if (statusDiv) {
        statusDiv.className = 'form-status error';
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<strong>✗ Message could not be sent right now.</strong> Please call <strong>9988113050</strong> or <a href="https://wa.me/9988113050?text=Hello%20Gursimran" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: underline;">message directly on WhatsApp</a>.';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline-block';
        if (btnLoading) btnLoading.style.display = 'none';
      }
    }
  });
}

/* ==========================================================================
   13. Floating Back-to-Top Button
   ========================================================================== */
function initBackToTop() {
  let backBtn = document.querySelector('.back-to-top');

  if (!backBtn) {
    backBtn = document.createElement('button');
    backBtn.className = 'back-to-top';
    backBtn.setAttribute('aria-label', 'Scroll to top');
    backBtn.innerHTML = '↑';
    document.body.appendChild(backBtn);
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 320) {
      backBtn.classList.add('visible');
    } else {
      backBtn.classList.remove('visible');
    }
  }, { passive: true });

  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ==========================================================================
   14. Smooth Navigation & Active Indicator
   ========================================================================== */
function initActiveNav() {
  const rawPath = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  
  // Normalize page keys to match navigation hrefs
  let currentPage = 'index.html';
  if (rawPath === '' || rawPath === 'index.html' || rawPath === 'index') {
    currentPage = 'index.html';
  } else if (rawPath.includes('about')) {
    currentPage = 'about.html';
  } else if (rawPath.includes('skill')) {
    currentPage = 'skills.html';
  } else if (rawPath.includes('project')) {
    currentPage = 'projects.html';
  } else if (rawPath.includes('feature') || rawPath.includes('service')) {
    currentPage = 'features.html';
  } else if (rawPath.includes('pricing')) {
    currentPage = 'pricing.html';
  } else if (rawPath.includes('review') || rawPath.includes('feedback')) {
    currentPage = 'reviews.html';
  } else if (rawPath.includes('contact')) {
    currentPage = 'contact.html';
  } else if (rawPath.includes('auth')) {
    currentPage = 'auth.html';
  } else if (rawPath.includes('account')) {
    currentPage = 'account.html';
  } else {
    currentPage = rawPath;
  }

  const isHomePage = currentPage === 'index.html';
  const nav = document.querySelector('.nav');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const hamburger = document.querySelector('.hamburger-btn');
  const backdrop = document.querySelector('.mobile-drawer-backdrop');

  function closeDrawer() {
    if (drawer && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
      if (hamburger) hamburger.classList.remove('is-active');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Set active class on desktop and mobile navigation
  document.querySelectorAll('.nav-links a, .mobile-nav-drawer a').forEach(link => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');

    const href = (link.getAttribute('href') || '').toLowerCase();
    const hrefPage = href.split('#')[0].split('/').pop();

    if (
      (isHomePage && (href === 'index.html' || href === '#home' || href === '/' || href === '')) ||
      (!isHomePage && hrefPage === currentPage)
    ) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Smooth scroll for all hash anchor links targeting current page
  document.querySelectorAll('a[href*="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const hashIndex = href.indexOf('#');
      if (hashIndex === -1) return;

      const targetPath = href.substring(0, hashIndex).toLowerCase();
      const targetHash = href.substring(hashIndex);

      // Check if target element exists on the current page
      const isTargetOnCurrentPage =
        targetPath === '' ||
        targetPath === currentPage ||
        (isHomePage && (targetPath === 'index.html' || targetPath === '/'));

      if (isTargetOnCurrentPage && targetHash && targetHash !== '#') {
        const targetEl = document.querySelector(targetHash);
        if (targetEl) {
          e.preventDefault();
          closeDrawer();
          const offset = nav ? nav.offsetHeight + 15 : 75;
          const targetY = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }
    });
  });
}

/* ==========================================================================
   Supabase Client Helper (Public Anon Key Architecture)
   ========================================================================== */
function getSupabaseClient() {
  if (window._supabaseClientInstance) return window._supabaseClientInstance;
  if (typeof window.supabase !== 'undefined' && window.SUPABASE_CONFIG) {
    const { url, anonKey } = window.SUPABASE_CONFIG;
    if (url && anonKey && !url.includes('YOUR_SUPABASE_URL') && !anonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
      try {
        window._supabaseClientInstance = window.supabase.createClient(url, anonKey);
        return window._supabaseClientInstance;
      } catch (err) {
        console.warn('[Supabase] Initialization notice:', err);
      }
    }
  }
  return null;
}

// Escaping helper
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

/* ==========================================================================
   15. Leave a Feedback Section (Supabase Real-Time Persistence)
   ========================================================================== */
async function initReviewSection() {
  const form = document.getElementById('portfolioReviewForm');
  if (!form) return;

  if (window.SUPABASE_CONFIG_READY) await window.SUPABASE_CONFIG_READY;

  const nameInput = document.getElementById('reviewName');
  const messageInput = document.getElementById('reviewMessage');
  const ratingInput = document.getElementById('selectedRating');
  const starGroup = document.getElementById('starRatingGroup');
  const starButtons = starGroup ? Array.from(starGroup.querySelectorAll('.star-btn')) : [];
  const ratingText = document.getElementById('starRatingText');
  const starClearBtn = document.getElementById('starClearBtn');
  const nameError = document.getElementById('nameError');
  const messageError = document.getElementById('messageError');
  const successAlert = document.getElementById('reviewSuccessAlert');
  const closeAlertBtn = document.getElementById('closeReviewAlertBtn');
  const errorAlert = document.getElementById('reviewErrorAlert');
  const closeErrorBtn = document.getElementById('closeReviewErrorBtn');
  const errorMsgText = document.getElementById('reviewErrorMessage');
  const postBtn = document.getElementById('postReviewBtn');
  const reviewsList = document.getElementById('userReviewsList');
  const countNumber = document.getElementById('reviewsCountNumber');
  const placeholder = document.getElementById('noReviewsPlaceholder');

  const STORAGE_KEY = 'swc_portfolio_reviews';
  let selectedRating = 0;
  let alertTimeoutId = null;

  const ratingLabels = {
    0: '0 / 5 stars (No rating selected)',
    1: '1 / 5 star (Needs improvement)',
    2: '2 / 5 stars (Fair experience)',
    3: '3 / 5 stars (Good & solid)',
    4: '4 / 5 stars (Very satisfied)',
    5: '5 / 5 stars (Exceptional work!)'
  };

  // 1. Star Rating UI Handler
  function updateStarsUI(rating, isHover = false) {
    starButtons.forEach(btn => {
      const btnRating = parseInt(btn.dataset.rating, 10);
      if (isHover) {
        if (btnRating <= rating) {
          btn.classList.add('hovered');
        } else {
          btn.classList.remove('hovered');
        }
      } else {
        btn.classList.remove('hovered');
        if (btnRating <= rating) {
          btn.classList.add('selected');
          btn.setAttribute('aria-checked', 'true');
        } else {
          btn.classList.remove('selected');
          btn.setAttribute('aria-checked', 'false');
        }
      }
    });
  }

  function setRating(val) {
    val = Math.max(0, Math.min(5, parseInt(val, 10) || 0));
    selectedRating = val;
    if (ratingInput) ratingInput.value = selectedRating;
    updateStarsUI(selectedRating, false);

    if (ratingText) {
      ratingText.textContent = ratingLabels[selectedRating] || `${selectedRating} / 5 stars`;
    }

    if (starClearBtn) {
      starClearBtn.style.display = selectedRating > 0 ? 'inline-block' : 'none';
    }
  }

  // Star button event listeners (hover & click)
  starButtons.forEach(btn => {
    const starVal = parseInt(btn.dataset.rating, 10);

    btn.addEventListener('mouseenter', () => {
      updateStarsUI(starVal, true);
      if (ratingText) {
        ratingText.textContent = ratingLabels[starVal] || `${starVal} / 5 stars`;
      }
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setRating(starVal);
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setRating(starVal);
      }
    });
  });

  if (starGroup) {
    starGroup.addEventListener('mouseleave', () => {
      updateStarsUI(selectedRating, false);
      if (ratingText) {
        ratingText.textContent = ratingLabels[selectedRating] || `${selectedRating} / 5 stars`;
      }
    });
  }

  if (starClearBtn) {
    starClearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setRating(0);
    });
  }

  // Clear validation errors on typing
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      nameInput.classList.remove('is-invalid');
      if (nameError) {
        nameError.textContent = '';
        nameError.classList.remove('active');
      }
    });
  }

  if (messageInput) {
    messageInput.addEventListener('input', () => {
      messageInput.classList.remove('is-invalid');
      if (messageError) {
        messageError.textContent = '';
        messageError.classList.remove('active');
      }
    });
  }

  if (closeAlertBtn && successAlert) {
    closeAlertBtn.addEventListener('click', () => {
      successAlert.style.display = 'none';
      if (alertTimeoutId) clearTimeout(alertTimeoutId);
    });
  }

  if (closeErrorBtn && errorAlert) {
    closeErrorBtn.addEventListener('click', () => {
      errorAlert.style.display = 'none';
    });
  }

  // Helpers
  function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  function formatReviewDate(dateObj) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const datePart = dateObj.toLocaleDateString('en-US', options);
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${datePart} • ${hours}:${minutes} ${ampm}`;
  }

  // Local Storage Cache Helpers
  function loadLocalReviews() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  function saveLocalReviews(reviews) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    } catch (_) {}
  }

  // 2. Create Review Card Element
  function createReviewCardElement(review, isNew = false) {
    const card = document.createElement('article');
    card.className = `user-review-card ${isNew ? 'card-new' : ''}`;
    card.id = `review-${review.id || Date.now()}`;

    const rating = Math.max(0, Math.min(5, parseInt(review.rating, 10) || 0));
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        starsHtml += '<span class="star-filled">★</span>';
      } else {
        starsHtml += '<span class="star-empty">★</span>';
      }
    }

    const ratingLabelText = rating === 0 ? '0/5 (Unrated)' : `${rating}/5`;
    const initials = getInitials(review.name);
    const dateDisplay = escapeHTML(review.date || (review.created_at ? formatReviewDate(new Date(review.created_at)) : 'Recently'));
    const safeDate = review.created_at || (review.timestamp ? new Date(review.timestamp).toISOString() : new Date().toISOString());

    card.innerHTML = `
      <div class="card-top-bar">
        <div class="card-stars" aria-label="${rating} out of 5 stars">
          ${starsHtml}
          <span class="card-rating-num">${ratingLabelText}</span>
        </div>
        <time class="card-date" datetime="${safeDate}">
          📅 ${dateDisplay}
        </time>
      </div>
      <p class="card-review-text">${escapeHTML(review.review)}</p>
      <div class="card-author-footer">
        <div class="card-avatar" aria-hidden="true">${escapeHTML(initials)}</div>
        <div class="card-author-info">
          <span class="card-author-name">${escapeHTML(review.name)}</span>
          <span class="card-author-badge">Public Review</span>
        </div>
      </div>
    `;

    return card;
  }

  // 3. Render Reviews
  function renderReviewsList(reviews) {
    if (!reviewsList) return;
    reviewsList.innerHTML = '';

    if (countNumber) {
      countNumber.textContent = reviews.length;
    }

    if (!reviews || reviews.length === 0) {
      if (placeholder) placeholder.style.display = 'block';
      return;
    }

    if (placeholder) placeholder.style.display = 'none';

    reviews.forEach(item => {
      const cardEl = createReviewCardElement(item, false);
      reviewsList.appendChild(cardEl);
    });
  }

  // 4. Fetch Reviews from Supabase or Local Cache
  async function loadAndDisplayReviews() {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('reviews')
          .select('id, name, review, rating, created_at')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          // Format created_at to readable date strings
          const formatted = data.map(item => ({
            ...item,
            date: formatReviewDate(new Date(item.created_at))
          }));
          saveLocalReviews(formatted);
          renderReviewsList(formatted);
          return;
        } else if (error) {
          console.warn('[Supabase] Could not fetch reviews:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase] Query error:', err);
      }
    }

    // Fallback to local storage
    const cached = loadLocalReviews();
    renderReviewsList(cached);
  }

  // 5. Submit New Review
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = window.requireAuthenticatedUser ? await window.requireAuthenticatedUser() : true;
    if (!user) {
      showAuthPrompt('Sign in or create an account before posting feedback.');
      return;
    }

    let isValid = true;
    const nameVal = nameInput ? nameInput.value.trim() : '';
    const reviewVal = messageInput ? messageInput.value.trim() : '';
    const ratingVal = Math.max(0, Math.min(5, parseInt(ratingInput ? ratingInput.value : 0, 10) || 0));

    // Reset error visuals
    if (nameInput) nameInput.classList.remove('is-invalid');
    if (messageInput) messageInput.classList.remove('is-invalid');
    if (nameError) {
      nameError.textContent = '';
      nameError.classList.remove('active');
    }
    if (messageError) {
      messageError.textContent = '';
      messageError.classList.remove('active');
    }

    // Validate Name (Required)
    if (!nameVal || nameVal.length < 2) {
      isValid = false;
      if (nameInput) nameInput.classList.add('is-invalid');
      if (nameError) {
        nameError.textContent = 'Please enter your name (minimum 2 characters).';
        nameError.classList.add('active');
      }
      if (nameInput) nameInput.focus();
    }

    // Validate Review (Required)
    if (!reviewVal || reviewVal.length < 5) {
      if (isValid && messageInput) messageInput.focus();
      isValid = false;
      if (messageInput) messageInput.classList.add('is-invalid');
      if (messageError) {
        messageError.textContent = 'Please write your feedback (minimum 5 characters).';
        messageError.classList.add('active');
      }
    }

    if (!isValid) return;

    // Button loading state
    const btnText = postBtn ? postBtn.querySelector('.btn-text') : null;
    const btnLoading = postBtn ? postBtn.querySelector('.btn-loading') : null;
    if (postBtn) {
      postBtn.disabled = true;
      postBtn.classList.add('is-loading');
      if (btnText) btnText.style.display = 'none';
      if (btnLoading) btnLoading.style.display = 'inline-flex';
    }

    if (errorAlert) errorAlert.style.display = 'none';

    const client = getSupabaseClient();
    let createdReview = null;

    try {
      if (client) {
        // Insert into Supabase database
        const { data, error } = await client
          .from('reviews')
          .insert([{
            name: nameVal,
            review: reviewVal,
            rating: ratingVal
          }])
          .select();

        if (error) {
          throw new Error(error.message || 'Failed to save review to Supabase');
        }

        if (data && data.length > 0) {
          createdReview = {
            ...data[0],
            date: formatReviewDate(new Date(data[0].created_at))
          };
        }
      }

      // If Supabase is not yet configured or returned clean
      if (!createdReview) {
        createdReview = {
          id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name: nameVal,
          review: reviewVal,
          rating: ratingVal,
          date: formatReviewDate(new Date()),
          created_at: new Date().toISOString()
        };
        console.info('[Supabase] Review saved locally. Configure js/supabase-config.js to sync reviews live across all visitors!');
      }

      // Update Local Storage Cache
      const currentList = loadLocalReviews();
      currentList.unshift(createdReview);
      saveLocalReviews(currentList);

      // Prepend card to DOM
      if (placeholder) placeholder.style.display = 'none';
      const newCard = createReviewCardElement(createdReview, true);
      if (reviewsList) reviewsList.prepend(newCard);

      // Update counter
      if (countNumber) {
        countNumber.textContent = currentList.length;
      }

      // Show Success Alert
      if (successAlert) {
        successAlert.style.display = 'flex';
        if (alertTimeoutId) clearTimeout(alertTimeoutId);
        alertTimeoutId = setTimeout(() => {
          successAlert.style.display = 'none';
        }, 8000);
      }

      // Reset form and star rating
      form.reset();
      setRating(0);

      // Smooth scroll to show newly added review
      newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      console.error('[Review Submit Error]:', err);
      if (errorAlert) {
        if (errorMsgText) errorMsgText.textContent = err.message || 'Unable to post review. Please check your connection and try again.';
        errorAlert.style.display = 'flex';
      }
    } finally {
      if (postBtn) {
        postBtn.disabled = false;
        postBtn.classList.remove('is-loading');
        if (btnText) btnText.style.display = 'inline-block';
        if (btnLoading) btnLoading.style.display = 'none';
      }
    }
  });

  // Initial load
  loadAndDisplayReviews();
}

function showAuthPrompt(message) {
  let prompt = document.getElementById('authActionPrompt');
  if (!prompt) {
    prompt = document.createElement('div');
    prompt.id = 'authActionPrompt';
    prompt.className = 'auth-action-prompt';
    prompt.innerHTML = `
      <div class="auth-action-card" role="dialog" aria-modal="true" aria-labelledby="authActionTitle">
        <button class="auth-action-close" type="button" aria-label="Close login prompt">×</button>
        <span class="section-tag">Account Required</span>
        <h2 id="authActionTitle">Account Required</h2>
        <p class="auth-action-message"></p>
        <div class="auth-action-buttons">
          <a class="btn btn-primary" href="auth.html">Log In / Sign Up →</a>
          <button class="btn btn-secondary auth-action-cancel" type="button">Continue Browsing</button>
        </div>
      </div>`;
    document.body.appendChild(prompt);
    const close = () => prompt.classList.remove('show');
    prompt.querySelector('.auth-action-close').addEventListener('click', close);
    prompt.querySelector('.auth-action-cancel').addEventListener('click', close);
    prompt.addEventListener('click', event => { if (event.target === prompt) close(); });
  }
  prompt.querySelector('.auth-action-message').textContent = message;
  prompt.classList.add('show');
}

/* ==========================================================================
   14. Multi-Currency Converter (INR, USD, EUR, GBP)
   ========================================================================== */
const CURRENCY_CONFIG = {
  INR: { rate: 1, symbol: '₹', code: 'INR' },
  USD: { rate: 0.012, symbol: '$', code: 'USD' },
  EUR: { rate: 0.011, symbol: '€', code: 'EUR' },
  GBP: { rate: 0.0095, symbol: '£', code: 'GBP' }
};

let currentCurrencyCode = 'INR';

function convertInrToActiveCurrency(inrAmount, currencyCode = currentCurrencyCode) {
  const conf = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.INR;
  const converted = Math.round(inrAmount * conf.rate);
  return {
    symbol: conf.symbol,
    formatted: converted.toLocaleString('en-US'),
    raw: converted,
    code: conf.code
  };
}

function initCurrencySwitcher() {
  const currencyBtns = document.querySelectorAll('.currency-btn');
  if (!currencyBtns.length) return;

  function setCurrency(currencyCode) {
    if (!CURRENCY_CONFIG[currencyCode]) return;
    currentCurrencyCode = currencyCode;

    // 1. Update button states
    currencyBtns.forEach(btn => {
      const match = btn.getAttribute('data-currency') === currencyCode;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    // 2. Update all standard pricing cards
    document.querySelectorAll('.pricing-price[data-base-inr]').forEach(priceEl => {
      const baseInr = parseFloat(priceEl.getAttribute('data-base-inr'));
      if (isNaN(baseInr)) return;

      const { symbol, formatted, raw } = convertInrToActiveCurrency(baseInr, currencyCode);
      const symbolSpan = priceEl.querySelector('.currency-symbol');
      const valSpan = priceEl.querySelector('.price-val');

      if (symbolSpan) symbolSpan.textContent = symbol;
      if (valSpan) valSpan.textContent = formatted;

      // Update CTA book link URL budget & currency query parameters
      const card = priceEl.closest('.pricing-card');
      if (card) {
        const ctaBtn = card.querySelector('.pricing-button');
        if (ctaBtn && ctaBtn.href) {
          try {
            const url = new URL(ctaBtn.href, window.location.href);
            url.searchParams.set('budget', raw);
            url.searchParams.set('currency', currencyCode);
            ctaBtn.href = url.pathname + url.search;
          } catch (_) {}
        }
      }
    });

    // 3. Recalculate scope estimator with new currency
    if (typeof window.recalcScopeEstimate === 'function') {
      window.recalcScopeEstimate();
    }
  }

  currencyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-currency');
      setCurrency(selected);
    });
  });
}

/* ==========================================================================
   15. Interactive Custom Scope & Cost Estimator
   ========================================================================== */
function initScopeCalculator() {
  const rangeInput = document.getElementById('pageCountRange');
  const pageDisplay = document.getElementById('pageCountDisplay');
  const addonCheckboxes = document.querySelectorAll('.addons-grid input[type="checkbox"]');
  const totalPriceEl = document.getElementById('calcTotalPrice');
  const currencySymbolEl = document.getElementById('calcCurrencySymbol');
  const timelineEl = document.getElementById('calcTimelineText');
  const bookBtn = document.getElementById('calcBookBtn');

  if (!rangeInput || !totalPriceEl) return;

  function calculateEstimate() {
    const pages = parseInt(rangeInput.value, 10) || 5;

    // Pricing Model: 5 pages = ₹5,000 INR. +₹800/page above 5, -₹500/page below 5 (min ₹3,000)
    let basePriceInr = 5000;
    if (pages > 5) {
      basePriceInr += (pages - 5) * 800;
    } else if (pages < 5) {
      basePriceInr = Math.max(3000, 5000 - (5 - pages) * 500);
    }

    // Timeline Model: 3–4 business days base + 1 day per 3 extra pages
    let minDays = 3 + Math.floor(Math.max(0, pages - 5) / 3);
    let maxDays = minDays + 1;

    let totalInr = basePriceInr;
    let selectedAddonNames = [];
    let isRush = false;

    addonCheckboxes.forEach(cb => {
      if (cb.checked) {
        const extraInr = parseFloat(cb.getAttribute('data-inr')) || 0;
        const extraDays = parseInt(cb.getAttribute('data-days'), 10) || 0;
        totalInr += extraInr;
        minDays += extraDays;
        maxDays += extraDays;

        const titleEl = cb.closest('.addon-chip')?.querySelector('.addon-title');
        if (titleEl) {
          selectedAddonNames.push(titleEl.textContent.replace(/^[^\w\s]+/, '').trim());
        }

        if (cb.id === 'addonRush') {
          isRush = true;
        }
      }
    });

    if (minDays < 2) minDays = 2;
    if (maxDays <= minDays) maxDays = minDays + 1;

    // Update page count indicator badge
    if (pageDisplay) {
      pageDisplay.textContent = `${pages} ${pages === 1 ? 'Page' : 'Pages'}`;
    }

    // Convert total to currently active currency
    const { symbol, formatted, raw } = convertInrToActiveCurrency(totalInr, currentCurrencyCode);
    if (currencySymbolEl) currencySymbolEl.textContent = symbol;
    if (totalPriceEl) totalPriceEl.textContent = formatted;

    // Update estimated delivery timeline
    if (timelineEl) {
      if (isRush) {
        timelineEl.textContent = `2–3 Business Days (Express Rush ⚡)`;
      } else {
        timelineEl.textContent = `${minDays}–${maxDays} Business Days`;
      }
    }

    // Update CTA Book button link with query parameters
    if (bookBtn) {
      const scopeSummary = `${pages} Pages${selectedAddonNames.length ? ' + ' + selectedAddonNames.join(', ') : ''}`;
      const params = new URLSearchParams({
        plan: 'Custom Scope',
        budget: raw,
        currency: currentCurrencyCode,
        scope: scopeSummary
      });
      bookBtn.href = `contact.html?${params.toString()}`;
    }
  }

  // Expose global updater so currency switcher can invoke it
  window.recalcScopeEstimate = calculateEstimate;

  rangeInput.addEventListener('input', calculateEstimate);
  rangeInput.addEventListener('change', calculateEstimate);

  addonCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const chip = cb.closest('.addon-chip');
      if (chip) chip.classList.toggle('selected', cb.checked);
      calculateEstimate();
    });
  });

  // Run initial estimate calculation
  calculateEstimate();
}
