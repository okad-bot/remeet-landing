// Shared bits for pages that don't load app.js: mobile menu and footer sections open on desktop.
(function () {
  var t = document.querySelector('.menu-toggle'), n = document.querySelector('.site-nav');
  if (t && n && !t.dataset.bound) {
    t.dataset.bound = '1';
    t.addEventListener('click', function () { var o = n.classList.toggle('open'); t.setAttribute('aria-expanded', String(o)); });
    n.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { n.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); }); });
  }
  if (window.innerWidth > 700) document.querySelectorAll('details.footer-col').forEach(function (d) { d.open = true; });
})();
