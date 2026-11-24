/* Book flip videos: play only while on screen. */
(function () {
  var vids = document.querySelectorAll('video[data-flip]');
  if (!vids.length) return;
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  if (!('IntersectionObserver' in window)) { vids.forEach(play); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) play(e.target); else e.target.pause(); });
  }, { rootMargin: '150px 0px' });
  vids.forEach(function (v) { io.observe(v); });
})();
