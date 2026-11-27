/* Videos: autoplay muted when visible (iOS Safari compatible). */
(function () {
  var flips = document.querySelectorAll('video[data-flip]');
  var hero = document.querySelector('.styles-loop video');
  var all = [];
  flips.forEach(function (v) { all.push(v); });
  if (hero) all.push(hero);
  if (!all.length) return;

  all.forEach(function (v) {
    v.muted = true;
    v.playsInline = true;
  });

  function play(v) {
    v.preload = 'auto';

    function go() {
      v.play().catch(function () {
        setTimeout(function () { v.play().catch(function () {}); }, 500);
      });
    }

    if (v.readyState >= 2) { go(); return; }
    v.addEventListener('loadeddata', go, { once: true });
    v.load();
  }

  if (!('IntersectionObserver' in window)) { all.forEach(play); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) play(e.target); else e.target.pause(); });
  }, { rootMargin: '150px 0px' });
  all.forEach(function (v) { io.observe(v); });
})();
