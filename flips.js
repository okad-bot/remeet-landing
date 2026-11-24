/* Book flip videos: load and play when scrolled into view. */
(function () {
  var vids = document.querySelectorAll('video[data-flip]');
  if (!vids.length) return;
  function play(v) {
    if (v.readyState < 2) v.load();
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (!('IntersectionObserver' in window)) { vids.forEach(play); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) play(e.target); else e.target.pause(); });
  }, { rootMargin: '150px 0px' });
  vids.forEach(function (v) { io.observe(v); });
})();
