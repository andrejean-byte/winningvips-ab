/**
 * WinningVIPs — CRO Tracking + UX Optimization
 * Injected into every variant page.
 * DOES NOT modify CTA destination URLs.
 */
(function () {
  'use strict';

  var VARIANT = localStorage.getItem('wv-variant') || 'unknown';
  var PAGE_PATH = location.pathname;

  // ── 1. TRACKING ─────────────────────────────────────────────
  window.dataLayer = window.dataLayer || [];

  function pushEvent(eventName, extra) {
    var payload = {
      event: eventName,
      variant: VARIANT,
      page_path: PAGE_PATH,
      timestamp: new Date().toISOString()
    };
    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) payload[k] = extra[k];
      }
    }
    window.dataLayer.push(payload);

    // Fire-and-forget beacon (no navigation blocking)
    var qs = 'variant=' + encodeURIComponent(VARIANT) +
             '&event=' + encodeURIComponent(eventName) +
             '&page=' + encodeURIComponent(PAGE_PATH) +
             '&ts=' + encodeURIComponent(payload.timestamp);
    if (extra) {
      for (var j in extra) {
        if (extra.hasOwnProperty(j)) qs += '&' + encodeURIComponent(j) + '=' + encodeURIComponent(extra[j]);
      }
    }
    var url = '/track-click?' + qs;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      try { fetch(url, { method: 'POST', keepalive: true }); } catch (e) { /* silent */ }
    }
  }

  // 1a. CTA Click Tracking
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a.btn-cta, a.mega-cta, [data-cta]');
    if (!link) return;
    var ctaId = link.getAttribute('data-cta') ||
                link.closest('.casino-card, .featured-card, .mega-hero')?.querySelector('.casino-name, .mega-hero-name')?.textContent?.trim() ||
                'hero-cta';
    pushEvent('cta_click', { cta_id: ctaId, cta_url: link.href });
  }, true); // capture phase — fires before navigation

  // 1b. Form Submit Tracking (if any forms exist)
  document.addEventListener('submit', function (e) {
    var form = e.target;
    pushEvent('form_submit', { form_id: form.id || form.action || 'unknown-form' });
  }, true);

  // 1c. Scroll Depth Tracking
  var scrollMarks = { 25: false, 50: false, 75: false };
  var scrollTick = false;
  window.addEventListener('scroll', function () {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      var pct = Math.round((window.scrollY / docH) * 100);
      for (var mark in scrollMarks) {
        if (!scrollMarks[mark] && pct >= parseInt(mark, 10)) {
          scrollMarks[mark] = true;
          pushEvent('scroll_depth', { depth: mark + '%' });
        }
      }
    });
  }, { passive: true });

  // 1d. Time to First Interaction
  var firstInteractionFired = false;
  ['click', 'scroll', 'keydown', 'touchstart'].forEach(function (evt) {
    document.addEventListener(evt, function () {
      if (firstInteractionFired) return;
      firstInteractionFired = true;
      pushEvent('first_interaction', {
        time_ms: Math.round(performance.now())
      });
    }, { once: true, passive: true });
  });

  // ── 2. DATA-CTA ATTRIBUTES ─────────────────────────────────
  // Label every CTA with a data-cta attribute for tracking
  document.querySelectorAll('.btn-cta, .mega-cta').forEach(function (el, i) {
    if (!el.getAttribute('data-cta')) {
      var card = el.closest('.casino-card, .featured-card, .mega-hero');
      var name = card && (card.querySelector('.casino-name') || card.querySelector('.mega-hero-name'));
      el.setAttribute('data-cta', name ? name.textContent.trim() : 'cta-' + i);
    }
  });

  // ── 3. STICKY MOBILE CTA BAR ───────────────────────────────
  // Find the primary CTA URL (first .btn-cta or .mega-cta on page)
  var primaryCta = document.querySelector('.featured-card .btn-cta, .mega-cta, .casino-card .btn-cta');
  if (primaryCta) {
    var stickyBar = document.createElement('div');
    stickyBar.id = 'wv-sticky-cta';
    stickyBar.innerHTML =
      '<a href="' + primaryCta.href + '" target="_blank" rel="noopener" class="btn-cta" data-cta="sticky-bar">' +
      'CLAIM YOUR BONUS' +
      '</a>' +
      '<span class="wv-sticky-micro">Our #1 pick &middot; Free to join</span>';
    document.body.appendChild(stickyBar);

    // Show/hide on scroll (only on mobile)
    var stickyVisible = false;
    window.addEventListener('scroll', function () {
      if (window.innerWidth > 768) {
        stickyBar.classList.remove('wv-sticky-show');
        return;
      }
      var shouldShow = window.scrollY > 400;
      if (shouldShow !== stickyVisible) {
        stickyVisible = shouldShow;
        stickyBar.classList.toggle('wv-sticky-show', shouldShow);
      }
    }, { passive: true });
  }

  // ── 4. FAQ ACCORDION ────────────────────────────────────────
  var footer = document.querySelector('.footer');
  if (footer) {
    var faqSection = document.createElement('section');
    faqSection.className = 'wv-faq';
    faqSection.innerHTML =
      '<div class="container" style="max-width:720px;margin:0 auto;padding:0 20px;">' +
      '<h2 class="wv-faq-title">Frequently Asked Questions</h2>' +
      '<div class="wv-faq-item">' +
        '<button class="wv-faq-q" aria-expanded="false">Are these casinos licensed and safe?</button>' +
        '<div class="wv-faq-a" hidden>Yes. Every casino listed holds a valid licence from a recognised authority (Curacao eGaming, MGA, or equivalent). We verify licensing status, SSL encryption, and responsible-gambling tools before listing any operator.</div>' +
      '</div>' +
      '<div class="wv-faq-item">' +
        '<button class="wv-faq-q" aria-expanded="false">How do I claim the welcome bonus?</button>' +
        '<div class="wv-faq-a" hidden>Click any "Claim Your Bonus" button to visit the casino\'s registration page. Create an account, and the welcome bonus is automatically applied to your first deposit. No promo code needed.</div>' +
      '</div>' +
      '<div class="wv-faq-item">' +
        '<button class="wv-faq-q" aria-expanded="false">Is signing up really free?</button>' +
        '<div class="wv-faq-a" hidden>Creating an account is completely free. Bonuses are applied when you make your first deposit. You can browse games and explore the platform before depositing anything.</div>' +
      '</div>' +
      '</div>';
    footer.parentNode.insertBefore(faqSection, footer);

    // Accordion toggle
    faqSection.addEventListener('click', function (e) {
      var btn = e.target.closest('.wv-faq-q');
      if (!btn) return;
      var answer = btn.nextElementSibling;
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !expanded);
      answer.hidden = expanded;
      pushEvent('faq_toggle', { question: btn.textContent.trim() });
    });
  }

  // ── 5. MICROCOPY NEAR CTAs ──────────────────────────────────
  document.querySelectorAll('.casino-card .btn-cta, .featured-card .btn-cta, .mega-cta').forEach(function (cta) {
    if (cta.parentNode.querySelector('.wv-microcopy')) return;
    var micro = document.createElement('div');
    micro.className = 'wv-microcopy';
    micro.textContent = 'Free to join \u00B7 No promo code needed';
    cta.parentNode.insertBefore(micro, cta.nextSibling);
  });

  // ── 6. TRUST BADGES NEAR CTA SECTION ───────────────────────
  var ctaSection = document.querySelector('.cta-section, .mega-hero');
  if (ctaSection) {
    var trustStrip = document.createElement('div');
    trustStrip.className = 'wv-trust-strip';
    trustStrip.innerHTML =
      '<span>Licensed & Regulated</span>' +
      '<span>Verified Payouts</span>' +
      '<span>Responsible Gambling 18+</span>' +
      '<span>Secure & Encrypted</span>';
    var ctaContainer = ctaSection.querySelector('.container') || ctaSection;
    ctaContainer.insertBefore(trustStrip, ctaContainer.firstChild);
  }

})();
