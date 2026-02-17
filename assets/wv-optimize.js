/**
 * WinningVIPs — CRO Tracking + UX Optimization v3
 * Injected into every variant page.
 * DOES NOT modify CTA destination URLs.
 *
 * Tracking: dataLayer (GTM), Meta Pixel (fbq), sendBeacon, GA4 gtag
 * Bot defense: isTrusted check, nonce, UA heuristic, rate-limit (client-side)
 * UX: sticky CTA, FAQ, microcopy, trust strip, review buttons, how-we-rank
 */
(function () {
  'use strict';

  var VARIANT = localStorage.getItem('wv-variant') || 'unknown';
  var PAGE_PATH = location.pathname;

  // ── 0. OFFER MAP (canonical mapping — prevents mis-labeling) ──
  var OFFER_MAP = {
    'A9t2XfP4': { key: 'neospin',       name: 'NeoSpin' },
    'Z4rW8pK2': { key: 'golden-crown',  name: 'Golden Crown' },
    'q7N5bD1L': { key: 'luckyvibe',     name: 'LuckyVibe' },
    'H6yG2aS7': { key: 'skycrown',      name: 'SkyCrown' },
    'm9E1jR4t': { key: 'wild-tokyo',    name: 'Wild Tokyo' }
  };

  // Review page mapping (same slugs → review page paths)
  var REVIEW_MAP = {
    'A9t2XfP4': 'neospin',
    'Z4rW8pK2': 'golden-crown',
    'q7N5bD1L': 'luckyvibe',
    'H6yG2aS7': 'skycrown',
    'm9E1jR4t': 'wild-tokyo'
  };

  function resolveOffer(href) {
    if (!href) return { key: 'unknown', name: 'unknown' };
    for (var slug in OFFER_MAP) {
      if (OFFER_MAP.hasOwnProperty(slug) && href.indexOf(slug) !== -1) {
        return OFFER_MAP[slug];
      }
    }
    return { key: 'unknown', name: 'unknown' };
  }

  function getReviewUrl(href) {
    if (!href) return null;
    for (var slug in REVIEW_MAP) {
      if (REVIEW_MAP.hasOwnProperty(slug) && href.indexOf(slug) !== -1) {
        return '../../pages/reviews/' + REVIEW_MAP[slug] + '.html';
      }
    }
    return null;
  }

  // ── 0b. BOT / PREFETCH DETECTION ──────────────────────────────
  function isLikelyBot() {
    var ua = navigator.userAgent || '';
    if (/bot|crawl|spider|slurp|facebookexternalhit|Bytespider|GPTBot|Googlebot|bingbot|yandex|baidu|semrush|ahref|mj12|dotbot|screaming|prerender|headless|phantom|puppeteer|lighthouse/i.test(ua)) return true;
    if (navigator.webdriver) return true;
    if (window.__nightmare) return true;
    return false;
  }

  var IS_BOT = isLikelyBot();

  // Client-side rate limit: max 3 clicks per offer per 60s
  var clickLog = {};
  function isRateLimited(offerKey) {
    var now = Date.now();
    var window60 = 60000;
    if (!clickLog[offerKey]) clickLog[offerKey] = [];
    clickLog[offerKey] = clickLog[offerKey].filter(function (t) { return now - t < window60; });
    if (clickLog[offerKey].length >= 3) return true;
    clickLog[offerKey].push(now);
    return false;
  }

  // Short-lived nonce
  var NONCE = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  // ── 1. TRACKING ENGINE ────────────────────────────────────────
  window.dataLayer = window.dataLayer || [];

  function genEventId() {
    return 'wv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  }

  function pushEvent(eventName, extra) {
    if (IS_BOT) return;

    var eventId = genEventId();
    var payload = {
      event: eventName,
      event_id: eventId,
      variant: VARIANT,
      page_path: PAGE_PATH,
      timestamp: new Date().toISOString()
    };
    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) payload[k] = extra[k];
      }
    }

    // 1. GTM dataLayer
    window.dataLayer.push(payload);

    // 2. Meta Pixel (if loaded via GTM or otherwise)
    if ((eventName === 'cta_click' || eventName === 'review_click') && typeof fbq === 'function') {
      try {
        var pixelEvent = eventName === 'cta_click' ? 'OutboundClick' : 'ViewContent';
        fbq('trackCustom', pixelEvent, {
          event_id: eventId,
          offer_key: extra.offer_key || '',
          offer_name: extra.offer_name || '',
          variant: VARIANT,
          destination_domain: eventName === 'cta_click' ? 'betncrypt.com' : 'winningvips',
          page_path: PAGE_PATH
        }, { eventID: eventId });
      } catch (e) { /* silent */ }
    }

    // 3. GA4 gtag (if loaded via GTM or otherwise)
    if (typeof gtag === 'function') {
      try {
        gtag('event', eventName, {
          event_id: eventId,
          variant: VARIANT,
          offer_key: extra.offer_key || '',
          offer_name: extra.offer_name || '',
          page_path: PAGE_PATH
        });
      } catch (e) { /* silent */ }
    }

    // 4. Fire-and-forget beacon to /track-click
    var qs = 'variant=' + encodeURIComponent(VARIANT) +
             '&event=' + encodeURIComponent(eventName) +
             '&event_id=' + encodeURIComponent(eventId) +
             '&nonce=' + encodeURIComponent(NONCE) +
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

  // ── 1a. CTA Click Tracking ────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;

    var link = e.target.closest('a.btn-cta, a.mega-cta');
    if (!link) return;

    var href = link.href || '';
    var offer = resolveOffer(href);

    if (isRateLimited(offer.key)) return;

    var ctaPosition = 'grid';
    if (link.closest('.featured-card')) ctaPosition = 'hero-featured';
    else if (link.closest('.mega-hero')) ctaPosition = 'mega-hero';
    else if (link.closest('#wv-sticky-cta')) ctaPosition = 'sticky-bar';
    else if (link.closest('table')) ctaPosition = 'comparison-table';

    pushEvent('cta_click', {
      offer_key: offer.key,
      offer_name: offer.name,
      cta_id: offer.key,
      cta_url: href,
      cta_position: ctaPosition,
      device: window.innerWidth <= 768 ? 'mobile' : 'desktop'
    });
  }, true);

  // ── 1b. Review Click Tracking ─────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;

    var link = e.target.closest('a.btn-review');
    if (!link) return;

    // Find the associated CTA to resolve the offer
    var container = link.closest('.casino-card, .featured-card, .mega-card, .secondary-row, .mobile-card, .wv-cta-group, td');
    var ctaLink = container ? container.querySelector('a.btn-cta, a.mega-cta') : null;
    var href = ctaLink ? ctaLink.getAttribute('href') : '';
    var offer = resolveOffer(href);

    pushEvent('review_click', {
      offer_key: offer.key,
      offer_name: offer.name,
      review_url: link.href || '',
      cta_position: 'review-link',
      device: window.innerWidth <= 768 ? 'mobile' : 'desktop'
    });
  }, true);

  // ── 1c. Form Submit Tracking ──────────────────────────────────
  document.addEventListener('submit', function (e) {
    if (!e.isTrusted) return;
    var form = e.target;
    pushEvent('form_submit', { form_id: form.id || form.action || 'unknown-form' });
  }, true);

  // ── 1d. Scroll Depth Tracking ─────────────────────────────────
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

  // ── 1e. Time to First Interaction ─────────────────────────────
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

  // ── 1f. Meta Pixel PageView ───────────────────────────────────
  if (typeof fbq === 'function') {
    try { fbq('track', 'PageView'); } catch (e) { /* silent */ }
  }

  // ── 2. DATA-CTA ATTRIBUTES ───────────────────────────────────
  document.querySelectorAll('.btn-cta, .mega-cta').forEach(function (el) {
    if (el.getAttribute('data-cta')) return;
    var href = el.getAttribute('href') || '';
    var offer = resolveOffer(href);
    el.setAttribute('data-cta', offer.key);
    el.setAttribute('data-offer', offer.name);
  });

  // ── 3. TRUST LINE PER CARD ───────────────────────────────────
  document.querySelectorAll('.casino-rating, .featured-rating, .mega-card-rating, .mobile-card-rating').forEach(function (rating) {
    var parent = rating.parentNode;
    if (!parent || parent.querySelector('.wv-trust-line')) return;
    var tl = document.createElement('div');
    tl.className = 'wv-trust-line';
    tl.textContent = 'Licensed \u00B7 Verified payouts \u00B7 18+';
    parent.insertBefore(tl, rating.nextSibling);
  });

  // ── 4. STICKY MOBILE CTA BAR ─────────────────────────────────
  var primaryCta = document.querySelector('.featured-card .btn-cta, .mega-cta, .casino-card .btn-cta');
  if (primaryCta) {
    var stickyBar = document.createElement('div');
    stickyBar.id = 'wv-sticky-cta';
    stickyBar.innerHTML =
      '<a href="' + primaryCta.href + '" target="_blank" rel="noopener" class="btn-cta" data-cta="sticky-bar">' +
      'CLAIM YOUR BONUS' +
      '</a>' +
      '<span class="wv-sticky-micro">Our #1 pick \u00B7 Free to join</span>';
    document.body.appendChild(stickyBar);

    var stickyVisible = false;
    window.addEventListener('scroll', function () {
      if (window.innerWidth > 768) {
        stickyBar.classList.remove('wv-sticky-show');
        return;
      }
      var shouldShow = window.scrollY > 300;
      if (shouldShow !== stickyVisible) {
        stickyVisible = shouldShow;
        stickyBar.classList.toggle('wv-sticky-show', shouldShow);
      }
    }, { passive: true });
  }

  // ── 5. MICROCOPY NEAR CTAs ───────────────────────────────────
  document.querySelectorAll('.casino-card .btn-cta, .featured-card .btn-cta, .mega-cta').forEach(function (cta) {
    if (cta.parentNode.querySelector('.wv-microcopy')) return;
    var micro = document.createElement('div');
    micro.className = 'wv-microcopy';
    micro.textContent = 'Free to join \u00B7 No promo code needed';
    cta.parentNode.insertBefore(micro, cta.nextSibling);
  });

  // ── 6. READ REVIEW BUTTONS + TERMS LINE ──────────────────────
  document.querySelectorAll('a.btn-cta, a.mega-cta').forEach(function (cta) {
    // Skip sticky bar CTA
    if (cta.closest('#wv-sticky-cta')) return;

    var href = cta.getAttribute('href') || '';
    var reviewUrl = getReviewUrl(href);
    if (!reviewUrl) return;

    var reviewLink = document.createElement('a');
    reviewLink.href = reviewUrl;
    reviewLink.className = 'btn-review';
    reviewLink.textContent = 'Read Review';

    var terms = document.createElement('div');
    terms.className = 'card-terms';
    terms.textContent = 'T&Cs apply \u00B7 18+ \u00B7 Play responsibly';

    // Check if CTA is a direct child of a CSS grid row (v8 secondary-row)
    var secondaryRow = cta.closest('.secondary-row');
    if (secondaryRow && cta.parentNode === secondaryRow) {
      // Wrap CTA + review + terms to avoid breaking the 3-col grid
      var wrapper = document.createElement('div');
      wrapper.className = 'wv-cta-group';
      secondaryRow.insertBefore(wrapper, cta);
      wrapper.appendChild(cta);
      wrapper.appendChild(reviewLink);
      wrapper.appendChild(terms);
    } else {
      // Normal insertion: after microcopy if present, else after CTA
      var insertAfterEl = cta;
      var sibling = cta.nextElementSibling;
      if (sibling && sibling.classList && sibling.classList.contains('wv-microcopy')) {
        insertAfterEl = sibling;
      }
      insertAfterEl.parentNode.insertBefore(reviewLink, insertAfterEl.nextSibling);
      reviewLink.parentNode.insertBefore(terms, reviewLink.nextSibling);
    }
  });

  // ── 7. HOW WE RANK SECTION ───────────────────────────────────
  var qualSection = document.querySelector('.qualification');
  var hwrTarget = qualSection || document.querySelector('.footer');
  if (hwrTarget && !document.querySelector('.wv-how-we-rank')) {
    var hwr = document.createElement('section');
    hwr.className = 'wv-how-we-rank';
    hwr.innerHTML =
      '<div style="max-width:600px;margin:0 auto;padding:0 20px;">' +
      '<h2 class="wv-hwr-title">How We Rank Casinos</h2>' +
      '<p class="wv-hwr-intro">Our editorial team evaluates every casino on four criteria before listing.</p>' +
      '<div class="wv-hwr-grid">' +
        '<div class="wv-hwr-item"><strong>Licensing</strong><span>Valid licence from a recognised authority (Curacao, MGA, or equivalent).</span></div>' +
        '<div class="wv-hwr-item"><strong>Payout Speed</strong><span>Withdrawal processing tested and verified by our team.</span></div>' +
        '<div class="wv-hwr-item"><strong>Bonus Fairness</strong><span>Wagering requirements, max bet limits, and game restrictions reviewed.</span></div>' +
        '<div class="wv-hwr-item"><strong>Player Safety</strong><span>SSL encryption, responsible gambling tools, and account security.</span></div>' +
      '</div>' +
      '</div>';
    hwrTarget.parentNode.insertBefore(hwr, hwrTarget);
  }

  // ── 8. FAQ ACCORDION ─────────────────────────────────────────
  var footer = document.querySelector('.footer');
  if (footer && !document.querySelector('.wv-faq')) {
    var faqSection = document.createElement('section');
    faqSection.className = 'wv-faq';
    faqSection.innerHTML =
      '<div style="max-width:720px;margin:0 auto;padding:0 20px;">' +
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
      '<div class="wv-faq-item">' +
        '<button class="wv-faq-q" aria-expanded="false">How are casinos ranked on this page?</button>' +
        '<div class="wv-faq-a" hidden>Our editorial team ranks casinos based on four criteria: licensing and regulation, payout speed and reliability, bonus fairness (wagering requirements and restrictions), and player safety features. We test every operator before listing.</div>' +
      '</div>' +
      '</div>';
    footer.parentNode.insertBefore(faqSection, footer);

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

  // ── 9. TRUST STRIP ──────────────────────────────────────────
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

  // ── 10. HERO PROOF POINTS ────────────────────────────────────
  // Only inject if the variant doesn't already have inline trust badges
  var heroSubtext = document.querySelector('.hero-subtext, .mega-hero-sub, .intro-banner p');
  if (heroSubtext && !document.querySelector('.wv-proof-points, .trust-bar, .trust-inline')) {
    var pp = document.createElement('div');
    pp.className = 'wv-proof-points';
    pp.innerHTML =
      '<span>Licensed & Verified</span>' +
      '<span>Published Bonus Terms</span>' +
      '<span>Updated Feb 2026</span>';
    heroSubtext.parentNode.insertBefore(pp, heroSubtext.nextSibling);
  }

})();
