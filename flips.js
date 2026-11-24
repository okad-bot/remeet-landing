/* Videos: load & play when visible (iOS Safari compatible). */
(function () {
  var flips = document.querySelectorAll('video[data-flip]');
  var hero = document.querySelector('.styles-loop video');

  function play(v) {
    function go() { v.play().catch(function () {}); }
    if (v.readyState >= 3) { go(); return; }
    v.addEventListener('canplay', go, { once: true });
    v.load();
  }

  if (hero) play(hero);

  if (!flips.length) return;
  if (!('IntersectionObserver' in window)) { flips.forEach(play); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) play(e.target); else e.target.pause(); });
  }, { rootMargin: '150px 0px' });
  flips.forEach(function (v) { io.observe(v); });
})();
