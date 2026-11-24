/* Keeps a new sentence from starting at the very end of a line: moves it to the next line. */
(function () {
  var SEL = 'h1,h2,h3,p,li,summary,figcaption,.hero-alt a';
  function rectOf(node, i) { var r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); var rs = r.getClientRects(); return rs.length ? rs[0] : null; }
  function fixEl(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var t = node.textContent, re = /[.!?]["”]?[ ](?=["“]?[A-Z0-9$])/g, m, guard = 0;
      while ((m = re.exec(t)) && guard++ < 20) {
        var s = m.index + m[0].length;
        var rest = t.slice(s), words = rest.split(/[ ]/), take = 0, k = 0;
        for (; k < Math.min(3, words.length); k++) take += words[k].length + 1;
        var a = rectOf(node, s), b = rectOf(node, Math.min(t.length - 1, s + Math.max(0, take - 2)));
        if (a && b && b.top > a.top + 2) {
          var after = node.splitText(s - 1); after.textContent = after.textContent.slice(1);
          var br = document.createElement('br'); br.className = 'tw'; node.parentNode.insertBefore(br, after);
          node = after; t = node.textContent; re.lastIndex = 0;
        }
      }
    });
  }
  function run() {
    document.querySelectorAll('br.tw').forEach(function (b) { var tn = document.createTextNode(' '); b.parentNode.replaceChild(tn, b); });
    document.body.normalize();
    document.querySelectorAll(SEL).forEach(fixEl);
  }
  window.remeetTypo = function (root) { (root || document).querySelectorAll(SEL).forEach(fixEl); };
  var w = window.innerWidth, timer;
  function go() { if (document.fonts && document.fonts.ready) document.fonts.ready.then(run); else run(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  window.addEventListener('resize', function () { if (window.innerWidth === w) return; w = window.innerWidth; clearTimeout(timer); timer = setTimeout(run, 150); });
  document.addEventListener('toggle', function (e) { if (!e.target.open) return; var d = e.target; requestAnimationFrame(function () { [d].concat([].slice.call(d.querySelectorAll(SEL))).forEach(function (x) { if (x.matches && x.matches(SEL)) fixEl(x); }); }); }, true);
})();
