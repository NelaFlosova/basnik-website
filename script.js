/* ══════════════════════════════════════════════
   BASNÍK v2 — "The Threshold of Silence"
   Scroll-driven Door Engine

   ARCHITECTURE:
   ─────────────
   The split-screen door moves ONLY on scroll.
   No mouse/drag interaction. No preloader.

   IntersectionObserver detects which dialogue scene
   enters the viewport → GSAP tweens the divider
   position (--divider-x CSS variable).

   After the dialogue section ends, the sticky bg
   unsticks naturally and the particles fade.
   ══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── STATE ─────────────────────────────────── */
  var state = {
    dividerX: 0.5,
  };

  /* ── DOM REFS ──────────────────────────────── */
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var particles   = $('#particles');
  var progressBar = $('#progressBar');

  /* ── AUTO-INIT ─────────────────────────────── */
  // initParticles();
  initScrollDivider();
  initScrollReveal();
  initSynopsisReveal();
  initImageZoom();
  initProgress();


  /* ══════════════════════════════════════════════
     PARTICLE SYSTEM
     ══════════════════════════════════════════════ */
  function initParticles() {
    var canvas = particles;
    var ctx = canvas.getContext('2d');
    var w, h;
    var particleArray = [];

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    var COUNT = 80;
    for (var i = 0; i < COUNT; i++) {
      particleArray.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 0.8,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.1,
        opacity: Math.random() * 0.5 + 0.15,
        drift: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var divX = state.dividerX * w;

      particleArray.forEach(function (p) {
        p.drift += 0.004;
        p.x += p.speedX + Math.sin(p.drift) * 0.08;
        p.y += p.speedY + Math.cos(p.drift) * 0.04;

        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        if (p.y > h + 5) p.y = -5;

        var isLawSide = p.x < divX;
        if (isLawSide) {
          ctx.fillStyle = 'rgba(140, 170, 200, ' + (p.opacity * 0.7) + ')';
        } else {
          ctx.fillStyle = 'rgba(212, 160, 96, ' + (p.opacity * 0.85) + ')';
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    draw();
  }


  /* ══════════════════════════════════════════════
     SCROLL-DRIVEN DIVIDER
     ══════════════════════════════════════════════ */
  function initScrollDivider() {
    var scenes = $$('.scene');
    var heroGone = false;

    setDivider(0.5);

    // Track when hero is fully out of view
    var hero = document.getElementById('hero');
    if (hero) {
      var heroObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            heroGone = !entry.isIntersecting;
            if (entry.isIntersecting) {
              animateDivider(0.5);
            }
          });
        },
        { threshold: 0 }
      );
      heroObserver.observe(hero);
    }

    // In-view class for fade-in (keeps working as before)
    var viewObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -50% 0px' }
    );
    scenes.forEach(function (scene) { viewObserver.observe(scene); });

    // Direction-aware divider movement
    var dialogueScenes = $$('.scene--dialogue');
    var lastScrollY = window.scrollY;
    var vh = window.innerHeight;
    var lastActiveSide = null;

    window.addEventListener('resize', function () { vh = window.innerHeight; });

    window.addEventListener('scroll', function () {
      if (!heroGone || vh <= 0 || window.innerWidth <= 800) return;

      var scrollY = window.scrollY;
      var scrollingDown = scrollY >= lastScrollY;
      lastScrollY = scrollY;

      var activeScene = null;

      for (var i = 0; i < dialogueScenes.length; i++) {
        var rect = dialogueScenes[i].getBoundingClientRect();

        if (scrollingDown) {
          // top border passes 60% of viewport
          if (rect.top <= vh * 0.6) {
            activeScene = dialogueScenes[i];
          }
        } else {
          // bottom border reaches 30% of viewport (first match from top)
          if (rect.bottom >= vh * 0.3 && !activeScene) {
            activeScene = dialogueScenes[i];
          }
        }
      }

      if (activeScene) {
        var side = activeScene.dataset.side;
        if (side !== lastActiveSide) {
          lastActiveSide = side;
          if (side === 'law') {
            animateDivider(0.62);
          } else if (side === 'poet') {
            animateDivider(0.38);
          } else {
            animateDivider(0.5);
          }
        }
      }
    }, { passive: true });

    // Show divider only while dialogue section is in view
    var dialogueSection = document.getElementById('dialogueSection');
    var divider = document.getElementById('divider');
    if (dialogueSection && divider) {
      var dividerObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              divider.classList.add('visible');
            } else {
              divider.classList.remove('visible');
            }
          });
        },
        { threshold: 0 }
      );
      dividerObserver.observe(dialogueSection);
    }
  }

  function setDivider(value) {
    state.dividerX = value;
    document.documentElement.style.setProperty('--divider-x', (value * 100) + '%');
  }

  function animateDivider(target) {
    if (typeof gsap !== 'undefined') {
      gsap.to(state, {
        dividerX: target,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: function () {
          document.documentElement.style.setProperty(
            '--divider-x', (state.dividerX * 100) + '%'
          );
        }
      });
    } else {
      setDivider(target);
    }
  }


  /* ══════════════════════════════════════════════
     SCROLL REVEAL — Static sections fade in
     ══════════════════════════════════════════════ */
  function initScrollReveal() {
    var blocks = $$('.section, .donio');

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    blocks.forEach(function (block) { observer.observe(block); });
  }


  /* ══════════════════════════════════════════════
     SYNOPSIS — Scroll-driven word reveal
     ══════════════════════════════════════════════ */
  function initSynopsisReveal() {
    var body = document.querySelector('.section--synopsis .section__body');
    if (!body || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Split text into word spans
    var text = body.textContent;
    var words = text.trim().split(/[ ]+/);
    body.innerHTML = words.map(function (w) {
      return '<span class="word">' + w + '</span>';
    }).join(' ');

    var wordEls = body.querySelectorAll('.word');

    // Scrub-linked reveal: gray → white as user scrolls
    gsap.to(wordEls, {
      color: 'rgba(255, 255, 255, 0.9)',
      duration: 0.3,
      stagger: 0.06,
      scrollTrigger: {
        trigger: '.section--synopsis',
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: true,
      }
    });
  }


  /* ══════════════════════════════════════════════
     IMAGE ZOOM — Expands from container to viewport
     ══════════════════════════════════════════════ */
  function initImageZoom() {
    var image = document.getElementById('filmImage');
    if (!image || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.to(image, {
      maxWidth: '100%',
      borderColor: 'rgba(255, 255, 255, 0)',
      scrollTrigger: {
        trigger: image,
        start: 'top 80%',
        end: 'center center',
        scrub: true,
      }
    });
  }


  /* ══════════════════════════════════════════════
     PROGRESS BAR — Full page scroll progress
     ══════════════════════════════════════════════ */
  function initProgress() {
    window.addEventListener('scroll', function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      progressBar.style.width = (progress * 100) + '%';
    }, { passive: true });
  }

})();
