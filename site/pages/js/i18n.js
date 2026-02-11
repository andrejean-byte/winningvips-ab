/*  Winning VIPs — i18n Engine
    Reads data-i18n attributes and swaps textContent based on selected language.
    Also handles data-i18n-placeholder for form inputs.
    Depends on WV_TRANSLATIONS from translations.js (loaded first).
*/
(function() {
  'use strict';

  var STORAGE_KEY = 'wv-lang';
  var DEFAULT_LANG = 'en';

  function getSavedLang() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; }
    catch(e) { return DEFAULT_LANG; }
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e) {}
  }

  function applyLanguage(lang) {
    if (!WV_TRANSLATIONS || !WV_TRANSLATIONS[lang]) lang = DEFAULT_LANG;
    var dict = WV_TRANSLATIONS[lang];
    var fallback = WV_TRANSLATIONS[DEFAULT_LANG];

    // Update all data-i18n elements
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      var text = dict[key] || fallback[key];
      if (text) {
        // If element has child elements (like <span class="accent">), use innerHTML only for specific safe keys
        if (els[i].getAttribute('data-i18n-html') === 'true') {
          els[i].innerHTML = text;
        } else {
          els[i].textContent = text;
        }
      }
    }

    // Update placeholders
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var pKey = placeholders[j].getAttribute('data-i18n-placeholder');
      var pText = dict[pKey] || fallback[pKey];
      if (pText) placeholders[j].setAttribute('placeholder', pText);
    }

    // Update document lang attribute
    document.documentElement.setAttribute('lang', lang);

    // Sync all lang pickers on the page
    var pickers = document.querySelectorAll('.lang-select');
    for (var k = 0; k < pickers.length; k++) {
      pickers[k].value = lang;
    }
  }

  function init() {
    var lang = getSavedLang();

    // Apply on load
    applyLanguage(lang);

    // Bind all lang-select dropdowns
    var pickers = document.querySelectorAll('.lang-select');
    for (var p = 0; p < pickers.length; p++) {
      pickers[p].value = lang;
      pickers[p].addEventListener('change', function() {
        var newLang = this.value;
        saveLang(newLang);
        applyLanguage(newLang);
      });
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
