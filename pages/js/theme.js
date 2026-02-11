(function() {
  var variant = localStorage.getItem('wv-variant') || 'v0';
  document.documentElement.setAttribute('data-theme', variant);
  // Also add class for CSS specificity
  document.body.classList.add('theme-' + variant);
})();
