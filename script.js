/* ============================================================
   VEX — Custom 3D Mechanical Keyboard Portfolio
   script.js  (scroll-jacked canvas + GSAP ScrollTrigger)
   ============================================================ */

/* ============================================================
   0. GSAP PLUGIN REGISTRATION
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

// Prevent GSAP from recalculating ScrollTrigger positions on every tiny
// resize event fired by the mobile browser address bar expanding/collapsing.
ScrollTrigger.config({ ignoreMobileResize: true });

/* ============================================================
   1. CONSTANTS & CONFIG
   ============================================================ */
const TOTAL_FRAMES = 120;
const FRAME_DIR = 'assets/keyboard_frames/';
const FRAME_PREFIX = '';
const FRAME_EXT = '.png';

// True when the page is first loaded on a narrow (mobile) screen.
// Used throughout to skip GSAP animations that start elements at opacity:0,
// which would otherwise leave content invisible if ScrollTrigger never fires.
const IS_MOBILE = window.innerWidth < 768;

/** Zero-pads a number to 4 digits: 1 → "0001" */
function zeroPad4(n) {
  return String(n).padStart(4, '0');
}

/** Returns the path for frame index i (1-based). */
function framePath(i) {
  return `${FRAME_DIR}${FRAME_PREFIX}${zeroPad4(i)}${FRAME_EXT}`;
}

/* ============================================================
   2. PRELOADER — load all frames, then boot experience
   ============================================================ */
(function initApp() {

  const loaderEl = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderLabel = document.getElementById('loader-label');

  const frameImages = [];   // pre-cached Image objects
  let loadedCount = 0;

  function onFrameLoad() {
    loadedCount++;
    const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);

    // Update progress bar
    if (loaderBar) loaderBar.style.width = pct + '%';
    if (loaderLabel) loaderLabel.textContent = `Loading frames… ${pct}%`;

    if (loadedCount === TOTAL_FRAMES) {
      onAllFramesLoaded();
    }
  }

  // Kick off parallel loads
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    img.onload = onFrameLoad;
    img.onerror = onFrameLoad; // count errors too so we always proceed
    img.src = framePath(i);
    frameImages.push(img);
  }

  /* Called once every frame has either loaded or errored */
  function onAllFramesLoaded() {

    // Dismiss loader with a slick fade-out
    gsap.to(loaderEl, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        loaderEl.style.display = 'none';
        loaderEl.setAttribute('aria-hidden', 'true');
      },
    });

    // Reveal nav
    gsap.to('#nav', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      delay: 0.2,
    });

    // Init all page animations
    initHeroAnimation();
    initExplosionCanvas(frameImages);
    initCallouts();
    initFeatureCards();
    initSpecRows();
    initSectionTitles();
    initGallery();
    initFooter();
    initSmoothAnchors();
  }

})();

/* ============================================================
   3. HERO ENTRANCE ANIMATION
   ============================================================ */
function initHeroAnimation() {
  const heroEls = ['.hero__eyebrow', '.hero__title', '.hero__subtitle', '#hero-cta'];

  if (IS_MOBILE) {
    // On mobile, skip the opacity:0 starting state entirely — just show everything.
    gsap.set(heroEls, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(heroEls, { y: 32 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.35 });
  tl.to('.hero__eyebrow', { opacity: 1, y: 0, duration: 0.65 })
    .to('.hero__title',   { opacity: 1, y: 0, duration: 0.75 }, '-=0.4')
    .to('.hero__subtitle',{ opacity: 1, y: 0, duration: 0.75 }, '-=0.45')
    .to('#hero-cta',      { opacity: 1, y: 0, duration: 0.6  }, '-=0.4');
}

/* ============================================================
   4. CANVAS EXPLOSION ANIMATION  (main scroll-jacked sequence)
   ============================================================ */
function initExplosionCanvas(frameImages) {
  const canvas = document.getElementById('explode-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Draw first frame immediately
  drawFrame(0);

  // State proxy for GSAP to tween
  const state = { frameIndex: 0 };

  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');

  // Reveal the progress indicator
  gsap.to('#explode-progress', {
    opacity: 1, duration: 0.6, ease: 'power2.out',
    scrollTrigger: { trigger: '#explode-section', start: 'top 80%' },
  });

  // Main scrub tween: drive frameIndex from 0 → TOTAL_FRAMES-1
  gsap.to(state, {
    frameIndex: TOTAL_FRAMES - 1,
    ease: 'none',
    scrollTrigger: {
      id: 'explode',
      trigger: '#explode-section',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate(self) {
        // Render the current frame
        const idx = Math.round(state.frameIndex);
        drawFrame(idx);

        // Update progress bar
        const pct = self.progress * 100;
        if (progressFill) progressFill.style.height = pct + '%';
        if (progressLabel) {
          if (self.progress < 0.05) {
            progressLabel.textContent = 'Scroll to explore';
          } else if (self.progress > 0.95) {
            progressLabel.textContent = 'Complete';
          } else {
            progressLabel.textContent = Math.round(pct) + '%';
          }
        }
      },
    },
  });

  /** Draws frame[idx] onto the canvas, letter-boxed to 1920×1080. */
  function drawFrame(idx) {
    const img = frameImages[idx];
    if (!img) return;

    // Clear
    ctx.clearRect(0, 0, 1920, 1080);

    // Draw image centred + scaled (cover/contain logic: use contain)
    const scale = Math.min(1920 / img.naturalWidth || 1, 1080 / img.naturalHeight || 1);
    const dw = (img.naturalWidth || 1920) * scale;
    const dh = (img.naturalHeight || 1080) * scale;
    const dx = (1920 - dw) / 2;
    const dy = (1080 - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

/* ============================================================
   5. CALLOUT OVERLAY ANIMATIONS  (synced to same ScrollTrigger)
   ============================================================ */
function initCallouts() {
  const callouts = [
    { el: '#callout-1', inStart: 0.0,  inEnd: 0.12, outStart: 0.35, outEnd: 0.47 },
    { el: '#callout-2', inStart: 0.40, inEnd: 0.52, outStart: 0.65, outEnd: 0.77 },
    { el: '#callout-3', inStart: 0.70, inEnd: 0.82, outStart: 0.93, outEnd: 1.00 },
  ];

  // On mobile, CSS already hides .callout via display:none (max-width:768px block).
  // Skip all GSAP logic so we never force opacity:0 on these elements.
  if (IS_MOBILE) return;

  /**
   * Desktop only — each callout:
   *   fadeIn  → the scroll progress fraction at which it fully appears
   *   fadeOut → the fraction at which it fully disappears
   *
   * Callout 1: appears 0%→10%,  holds 10%→35%,  fades 35%→45%
   * Callout 2: appears 40%→50%, holds 50%→65%,  fades 65%→75%
   * Callout 3: appears 70%→80%, holds 80%→95%,  fades 95%→100%
   */
  callouts.forEach(({ el, inStart, inEnd, outStart, outEnd }) => {
    const node = document.querySelector(el);
    if (!node) return;

    const isRight     = node.classList.contains('callout--right');
    const isBottomLeft= node.classList.contains('callout--bottom-left');
    const xOffset = isRight ? 20 : isBottomLeft ? 0 : -20;
    const yOffset = isBottomLeft ? 16 : 0;

    gsap.set(node, { opacity: 0, x: xOffset, y: yOffset });

    ScrollTrigger.create({
      trigger: '#explode-section',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate(self) {
        const p = self.progress;
        let opacity, tx, ty;

        if (p < inStart) {
          opacity = 0; tx = xOffset; ty = yOffset;
        } else if (p < inEnd) {
          const t = (p - inStart) / (inEnd - inStart);
          opacity = t;
          tx = xOffset * (1 - t);
          ty = yOffset * (1 - t);
        } else if (p < outStart) {
          opacity = 1; tx = 0; ty = 0;
        } else if (p < outEnd) {
          const t = (p - outStart) / (outEnd - outStart);
          opacity = 1 - t;
          tx = isRight ? 20 * t : isBottomLeft ? 0 : -20 * t;
          ty = isBottomLeft ? 16 * t : 0;
        } else {
          opacity = 0; tx = xOffset; ty = yOffset;
        }

        gsap.set(node, { opacity, x: tx, y: ty });
      },
    });
  });
}

/* ============================================================
   6. FEATURE CARDS — STAGGERED SCROLL-IN
   ============================================================ */
function initFeatureCards() {
  if (IS_MOBILE) {
    // Skip opacity:0 set — cards are visible by default via CSS.
    gsap.set('.feature-card', { opacity: 1, y: 0 });
    return;
  }

  gsap.set('.feature-card', { y: 40 });

  gsap.to('.feature-card', {
    opacity: 1, y: 0,
    duration: 0.7,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#features',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}

/* ============================================================
   7. SPECS ROWS — STAGGERED SCROLL-IN
   ============================================================ */
function initSpecRows() {
  if (IS_MOBILE) {
    gsap.set('.spec-row', { opacity: 1, x: 0 });
    return;
  }

  gsap.set('.spec-row', { x: -24 });

  gsap.to('.spec-row', {
    opacity: 1, x: 0,
    duration: 0.5,
    stagger: 0.07,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#specs',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}

/* ============================================================
   8. SECTION TITLES — FADE + RISE
   ============================================================ */
function initSectionTitles() {
  if (IS_MOBILE) {
    gsap.set('.section__title', { opacity: 1, y: 0 });
    return;
  }

  gsap.utils.toArray('.section__title').forEach((title) => {
    gsap.fromTo(
      title,
      { y: 24, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: title,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
}

/* ============================================================
   9. GALLERY — SCROLL-IN ANIMATION
   ============================================================ */
function initGallery() {
  if (IS_MOBILE) {
    gsap.set('.gallery__card', { opacity: 1, scale: 1, y: 0 });
    return;
  }

  // Cards are now static HTML — just animate them in on scroll
  gsap.set('.gallery__card', { scale: 0.94, y: 20, opacity: 0 });
  gsap.to('.gallery__card', {
    opacity: 1, scale: 1, y: 0,
    duration: 0.65,
    stagger: 0.09,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#gallery',
      start: 'top 82%',
      toggleActions: 'play none none none',
    },
  });
}

/* ============================================================
   10. FOOTER FADE-IN
   ============================================================ */
function initFooter() {
  gsap.fromTo(
    '#footer',
    { opacity: 0, y: 24 },
    {
      opacity: 1, y: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#footer',
        start: 'top 92%',
        toggleActions: 'play none none none',
      },
    }
  );
}

/* ============================================================
   11. SMOOTH ANCHOR NAV
   ============================================================ */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
