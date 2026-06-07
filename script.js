/**
 * ================================================
 * LOVE LETTER WEBSITE — script.js
 * ================================================
 * Sections:
 *  1.  Star canvas renderer
 *  2.  Floating particles
 *  3.  Intro → Letter transition
 *  4.  Typewriter effect
 *  5.  Scroll-reveal (IntersectionObserver)
 *  6.  Parallax star drift
 *  7.  Music player
 *  8.  Final section star brightening
 *  9.  Init (called on DOMContentLoaded)
 * ================================================
 */

'use strict';

/* ─────────────────────────────────────────────────
   1. STAR CANVAS RENDERER
   Draws and animates a field of stars on a <canvas>
   ───────────────────────────────────────────────── */

const StarField = (() => {

  const canvas  = document.getElementById('starCanvas');
  const ctx     = canvas.getContext('2d');

  let stars     = [];
  let raf       = null;
  let W, H;

  // Configuration — tweak these numbers for different effects
  const CONFIG = {
    count:        160,   // Total number of stars
    minR:         0.3,   // Smallest star radius
    maxR:         1.5,   // Largest star radius
    minOpacity:   0.2,
    maxOpacity:   0.9,
    twinkleSpeed: 0.005, // How fast stars pulse
    driftX:       0,     // Drift offset (updated by parallax)
    driftY:       0,
    glowBoost:    0,     // Boosted by final-section trigger
  };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStar() {
    return {
      x:       Math.random() * (W || window.innerWidth),
      y:       Math.random() * (H || window.innerHeight),
      r:       CONFIG.minR + Math.random() * (CONFIG.maxR - CONFIG.minR),
      opacity: CONFIG.minOpacity + Math.random() * (CONFIG.maxOpacity - CONFIG.minOpacity),
      // Phase offset so all stars don't twinkle in sync
      phase:   Math.random() * Math.PI * 2,
      speed:   CONFIG.twinkleSpeed * (0.5 + Math.random()),
      // Each star has a subtle drift speed
      vx:      (Math.random() - 0.5) * 0.04,
      vy:      (Math.random() - 0.5) * 0.02,
    };
  }

  function build() {
    stars = Array.from({ length: CONFIG.count }, createStar);
  }

  function draw(timestamp) {
    ctx.clearRect(0, 0, W, H);

    const t = timestamp * 0.001; // seconds

    stars.forEach(star => {
      // Gentle slow drift
      star.x += star.vx + CONFIG.driftX * 0.003;
      star.y += star.vy + CONFIG.driftY * 0.003;

      // Wrap around edges
      if (star.x < -2) star.x = W + 2;
      if (star.x > W + 2) star.x = -2;
      if (star.y < -2) star.y = H + 2;
      if (star.y > H + 2) star.y = -2;

      // Twinkle: sine wave on opacity
      const pulse = Math.sin(t * star.speed * 6 + star.phase);
      const alpha = star.opacity + pulse * 0.18 + CONFIG.glowBoost * 0.3;
      const radius = star.r + CONFIG.glowBoost * star.r * 0.6;

      // Draw soft glow first
      if (radius > 0.8) {
        const grd = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, radius * 3.5);
        grd.addColorStop(0,   `rgba(232, 220, 200, ${Math.min(alpha * 0.3, 0.4)})`);
        grd.addColorStop(1,   'rgba(232, 220, 200, 0)');
        ctx.beginPath();
        ctx.arc(star.x, star.y, radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Draw star core
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 220, 200, ${Math.min(Math.max(alpha, 0), 1)})`;
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    build();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', () => { resize(); build(); });
  }

  // Allow external code to set drift (for parallax)
  function setDrift(x, y) {
    CONFIG.driftX = x;
    CONFIG.driftY = y;
  }

  // Allow external code to boost star brightness (for final section)
  function setGlowBoost(val) {
    CONFIG.glowBoost = val;
  }

  return { init, setDrift, setGlowBoost };
})();


/* ─────────────────────────────────────────────────
   2. FLOATING PARTICLES
   Creates soft rising golden particles
   ───────────────────────────────────────────────── */

const Particles = (() => {

  const container = document.getElementById('particles');
  let active = false;

  function createParticle() {
    if (!active) return;

    const p = document.createElement('div');
    p.className = 'particle';

    const size = 2 + Math.random() * 4;   // px
    const left = Math.random() * 100;      // vw
    const dur  = 8 + Math.random() * 12;  // seconds
    const delay = Math.random() * -dur;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}vw;
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
    `;

    container.appendChild(p);

    // Remove particle from DOM when animation ends to keep things clean
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }

  function init() {
    active = true;
    // Stagger initial burst
    for (let i = 0; i < 12; i++) {
      setTimeout(createParticle, i * 200);
    }
    // Then trickle in at interval
    setInterval(() => {
      if (active) createParticle();
    }, 1200);
  }

  return { init };
})();


/* ─────────────────────────────────────────────────
   3. INTRO → LETTER TRANSITION
   Handles the "Open My Letter" button click
   ───────────────────────────────────────────────── */

const Intro = (() => {

  const introEl     = document.getElementById('intro');
  const mainEl      = document.getElementById('mainContent');
  const openBtn     = document.getElementById('openBtn');
  const musicPlayer = document.getElementById('musicPlayer');

  function open() {
    // 1. Disable button to prevent double-click
    openBtn.disabled = true;

    // 2. Start particles
    Particles.init();

    // 3. Show music player immediately — it's fixed so always visible while scrolling
    musicPlayer.classList.add('visible');

    // 4. Fade out intro
    introEl.classList.add('hidden');

    // 5. Reveal main content after fade completes
    setTimeout(() => {
      introEl.setAttribute('hidden', '');
      mainEl.removeAttribute('hidden');

      // 6. Instantly jump scroll to the very top so typewriter is visible
      window.scrollTo({ top: 0, behavior: 'instant' });

      // 7. Trigger the CSS animation via class
      requestAnimationFrame(() => {
        mainEl.classList.add('visible');

        // 8. Start typewriter
        TypeWriter.start();
      });
    }, 900);
  }

  function init() {
    openBtn.addEventListener('click', open);

    // Also allow keyboard Enter/Space
    openBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  }

  return { init };
})();


/* ─────────────────────────────────────────────────
   4. TYPEWRITER EFFECT
   Types text character by character with pauses
   ───────────────────────────────────────────────── */

const TypeWriter = (() => {

  const el = document.getElementById('typewriterText');

  // =============================================
  // TYPEWRITER TEXT — Edit this message freely.
  // Use '\n' to add a new line.
  // =============================================
  const message = "To My Greatest Nicolai...";

  let i       = 0;
  let started = false;

  function type() {
    if (!started) return;

    if (i < message.length) {
      el.textContent += message[i];
      i++;

      // Variable typing speed for realism
      const char = message[i - 1];
      let delay = 55 + Math.random() * 40;

      // Pause longer at punctuation
      if ('.…,;:!?'.includes(char)) delay = 300 + Math.random() * 200;

      setTimeout(type, delay);
    } else {
      // Done typing — remove blinking cursor
      el.classList.add('done');

      // Reveal scroll hint
      document.getElementById('scrollHint').style.opacity = '';
    }
  }

  function start() {
    started = true;
    el.textContent = '';
    // Small delay before starting to type
    setTimeout(type, 900);
  }

  return { start };
})();


/* ─────────────────────────────────────────────────
   5. SCROLL-REVEAL — IntersectionObserver
   Watches elements and adds .in-view when visible
   ───────────────────────────────────────────────── */

const ScrollReveal = (() => {

  // Selectors for all animated elements
  const SELECTORS = [
    '.reveal-up',
    '.reveal-card',
    '.reveal-photo',
    '.reveal-video',
    '.reveal-letter',
    '.reveal-final',
    '.reveal-final-slow',
  ].join(', ');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');

          // Once revealed, stop observing (saves performance)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,        // trigger when 12% visible
      rootMargin: '0px 0px -5% 0px',  // slight bottom offset
    }
  );

  function init() {
    document.querySelectorAll(SELECTORS).forEach(el => observer.observe(el));
  }

  return { init };
})();


/* ─────────────────────────────────────────────────
   6. PARALLAX STAR DRIFT
   Subtle mouse-move parallax on desktop;
   deviceorientation on mobile
   ───────────────────────────────────────────────── */

const Parallax = (() => {

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  function smoothUpdate() {
    // Lerp (linear interpolation) for smooth easing
    currentX += (targetX - currentX) * 0.04;
    currentY += (targetY - currentY) * 0.04;

    StarField.setDrift(currentX, currentY);
    requestAnimationFrame(smoothUpdate);
  }

  function initMouse() {
    window.addEventListener('mousemove', e => {
      // Normalize to -1 → 1 around center
      targetX = ((e.clientX / window.innerWidth)  - 0.5) * 12;
      targetY = ((e.clientY / window.innerHeight) - 0.5) * 6;
    });
  }

  function initGyro() {
    window.addEventListener('deviceorientation', e => {
      if (e.gamma !== null && e.beta !== null) {
        targetX = (e.gamma / 45) * 8;  // gamma = left/right tilt
        targetY = (e.beta  / 90) * 4;  // beta  = front/back tilt
      }
    });
  }

  function init() {
    smoothUpdate();
    initMouse();

    // Try gyroscope on mobile (needs permission on iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requires explicit user gesture to request
        // We'll init after a touch event
        window.addEventListener('touchstart', () => {
          DeviceOrientationEvent.requestPermission()
            .then(state => { if (state === 'granted') initGyro(); })
            .catch(() => {});
        }, { once: true });
      } else {
        initGyro();
      }
    }
  }

  return { init };
})();


/* ─────────────────────────────────────────────────
   7. MUSIC PLAYER
   Toggle play/pause with visual feedback
   ───────────────────────────────────────────────── */

const Music = (() => {

  const btn       = document.getElementById('musicBtn');
  const audio     = document.getElementById('bgMusic');
  const playIcon  = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const label     = document.querySelector('.music-label');

  let playing = false;

  function toggle() {
    if (!playing) {
      // audio.play() returns a Promise — handle gracefully
      audio.play()
        .then(() => {
          playing = true;
          playIcon.style.display  = 'none';
          pauseIcon.style.display = '';
          btn.classList.add('playing');
          if (label) label.textContent = 'Pause music';
        })
        .catch(err => {
          // Browser blocked autoplay — this is fine, user clicked
          console.warn('Audio play error:', err);
        });
    } else {
      audio.pause();
      playing = false;
      playIcon.style.display  = '';
      pauseIcon.style.display = 'none';
      btn.classList.remove('playing');
      if (label) label.textContent = 'Play music';
    }
  }

  // Fade audio in/out smoothly instead of instant cut
  function fadeIn(duration = 1500) {
    audio.volume = 0;
    const steps = 20;
    const increment = 1 / steps;
    const interval = duration / steps;

    const fade = setInterval(() => {
      if (audio.volume < 1 - increment) {
        audio.volume += increment;
      } else {
        audio.volume = 1;
        clearInterval(fade);
      }
    }, interval);
  }

  function init() {
    btn.addEventListener('click', toggle);

    // When audio ends (if loop somehow fails), reset UI
    audio.addEventListener('ended', () => {
      if (!audio.loop) {
        playing = false;
        playIcon.style.display  = '';
        pauseIcon.style.display = 'none';
        btn.classList.remove('playing');
      }
    });
  }

  return { init, fadeIn };
})();


/* ─────────────────────────────────────────────────
   8. FINAL SECTION — STAR BRIGHTENING
   Stars grow brighter as user reaches the end
   ───────────────────────────────────────────────── */

const FinalEffect = (() => {

  let observer = null;

  function init() {
    const finalSection = document.getElementById('finalSection');
    if (!finalSection) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // Map intersection ratio (0→1) to glow boost (0→1)
          const ratio = entry.intersectionRatio;
          StarField.setGlowBoost(ratio * 0.85);
        });
      },
      {
        threshold: Array.from({ length: 21 }, (_, i) => i * 0.05), // 0, 0.05, 0.1 … 1
      }
    );

    observer.observe(finalSection);
  }

  return { init };
})();


/* ─────────────────────────────────────────────────
   9. INIT — Start everything on DOMContentLoaded
   ───────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  // Initialize the star field background (always active)
  StarField.init();

  // Initialize intro button and transition
  Intro.init();

  // Initialize mouse/gyro parallax
  Parallax.init();

  // Initialize music player controls
  Music.init();

  // Initialize scroll-reveal
  // Note: ScrollReveal watches ALL reveal elements including those
  // inside #mainContent — it's safe to call here because IntersectionObserver
  // only fires when elements are actually visible.
  ScrollReveal.init();

  // Initialize final-section star brightening
  FinalEffect.init();

  // =============================================
  // PERFORMANCE — Pause star animation when the
  // tab is not visible to save battery/CPU
  // =============================================
  document.addEventListener('visibilitychange', () => {
    // The canvas requestAnimationFrame loop handles this
    // automatically — browsers throttle it when tab is hidden.
    // This block is here for any additional cleanup if needed.
  });

});