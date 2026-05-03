/* ── Scroll-Expansion Hero ─────────────────────────────────────────────
   Vanilla-JS recreation of the scroll-expansion-hero React component.
   Captures wheel / touch events to drive a 0→1 progress value that:
     - Expands a centered media card from 300px → full viewport
     - Splits the title words apart via translateX
     - Fades the background image out
     - Reveals downstream content once fully expanded
   Once progress === 1, normal page scrolling resumes.
   Scrolling back up re-captures the section.

   IMPORTANT: This script only captures scroll when the expansion
   section is in view (top edge at or above viewport center). This
   prevents interference with the GSAP scroll-video section above.
──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const section = document.getElementById('lc-expand-hero');
  if (!section) return;

  const media = section.querySelector('.lc-expand-media');
  const bgLayer = section.querySelector('.lc-expand-bg');
  const titleTop = section.querySelector('.lc-expand-title-top');
  const titleBottom = section.querySelector('.lc-expand-title-bottom');
  const scrollHint = section.querySelector('.lc-expand-scroll-hint');
  const revealContent = section.querySelector('.lc-expand-reveal');

  let progress = 0;
  let isMobile = window.innerWidth < 768;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function calculateProgress() {
    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const start = viewportHeight * 0.80;
    const end = -viewportHeight * 0.10;
    return clamp((start - rect.top) / (start - end), 0, 1);
  }

  function updateLayout() {
    // Viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Media: starts at a small card, grows to full viewport
    const startW = isMobile ? 280 : 420;
    const startH = isMobile ? 320 : 380;
    const mediaWidth = startW + progress * (vw - startW);
    const mediaHeight = startH + progress * (vh - startH);

    // Title: shifts outward in px (enough to exit viewport)
    const textShift = progress * (isMobile ? 200 : 350);

    // Media card size
    media.style.width = mediaWidth + 'px';
    media.style.height = mediaHeight + 'px';

    // Background fade
    bgLayer.style.opacity = 1 - progress;

    // Title split — move apart and fade out
    const titleOpacity = Math.max(0, 1 - progress * 1.8);
    if (titleTop) {
      titleTop.style.transform = 'translateX(-' + textShift + 'px)';
      titleTop.style.opacity = titleOpacity;
    }
    if (titleBottom) {
      titleBottom.style.transform = 'translateX(' + textShift + 'px)';
      titleBottom.style.opacity = titleOpacity;
    }

    // Eyebrow fades with title
    const eyebrow = section.querySelector('.lc-expand-eyebrow');
    if (eyebrow) eyebrow.style.opacity = titleOpacity;

    // Scroll hint fade (fast)
    if (scrollHint) scrollHint.style.opacity = Math.max(0, 1 - progress * 3);

    // Content reveal — appears near the end
    if (revealContent) {
      const revealOpacity = progress >= 0.75 ? (progress - 0.75) / 0.25 : 0;
      revealContent.style.opacity = revealOpacity;
      revealContent.style.pointerEvents = progress >= 0.85 ? 'auto' : 'none';
    }

    // Media border-radius shrinks to 0 at full expansion
    const radius = Math.max(0, 18 * (1 - progress));
    media.style.borderRadius = radius + 'px';

    // At full expansion, remove max-width/max-height constraints
    if (progress >= 0.98) {
      media.style.maxWidth = 'none';
      media.style.maxHeight = 'none';
    } else {
      media.style.maxWidth = '95vw';
      media.style.maxHeight = '85vh';
    }
  }

  function handleScroll() {
    progress = calculateProgress();
    updateLayout();
  }

  function handleResize() {
    isMobile = window.innerWidth < 768;
    progress = calculateProgress();
    updateLayout();
  }

  // Bind events
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);

  // Initial paint
  progress = calculateProgress();
  updateLayout();
})();
