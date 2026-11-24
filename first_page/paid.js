/* ReMeet /first_page/paid: after Stripe. Upload the rest of the photos, then notes. */
(function () {
  var O = window.REMEET_ORDER, $ = function (i) { return document.getElementById(i); };
  var q = new URLSearchParams(location.search), order = {};
  try { order = JSON.parse(localStorage.getItem('remeet_order') || '{}') || {}; } catch (e) {}
  var id = q.get('id') || order.id || O.newId();
  var email = q.get('e') || order.email || '';
  order.id = id; order.email = email;
  try { localStorage.setItem('remeet_order', JSON.stringify(order)); } catch (e) {}
  document.querySelectorAll('.pi-email-echo').forEach(function (el) { el.textContent = email || 'your email'; });
  if (!email) document.querySelector('.pi-mailbar').textContent = '✉ Your receipt is in your inbox.';

  // Purchase: once, right after Stripe (same flow as /thank-you)
  (function () {
    var v = 0;
    try { v = Number(localStorage.getItem('remeet_order_total')) || 0; localStorage.removeItem('remeet_order_total'); } catch (e) {}
    if (v) {
      if (window.fbq) fbq('track', 'Purchase', { value: v, currency: 'USD' });
      if (window.ym) ym(114414250, 'reachGoal', 'purchase', { order_price: v, currency: 'USD' });
      O.post({ action: 'paid', id: id, email: email, total: v, format: order.format || '', style: order.style || '', page: location.origin + '/first_page/paid/?id=' + id + (email ? '&e=' + encodeURIComponent(email) : '') }).catch(function () {});
    }
  })();

  if ((order.copies || 1) > 1) {
    var extra = order.copies - 1, ex = document.createElement('p'); ex.className = 'pi-note';
    ex.textContent = 'Extra copies: I\'ll email you an invoice for ' + extra + ' more book' + (extra > 1 ? 's' : '') + ', $' + extra * O.prices.copy + '.';
    document.querySelector('#pdMain .pi-sub').after(ex);
  }
  if (O.links.copy && $('pdCopy')) $('pdCopy').href = O.links.copy + '?client_reference_id=' + encodeURIComponent(id) + (email ? '&prefilled_email=' + encodeURIComponent(email) : '');

  if (/^(occasion:|book:)/.test(order.style || '')) { var w = document.querySelector('[name=who]'); if (w) { var box = w.closest('.pi-chips'); if (box) { box.hidden = true; if (box.previousElementSibling) box.previousElementSibling.hidden = true; } } }
  var LIMIT = 300;
  if (true) { var sub = document.querySelector('#pdMain .pi-sub'); if (sub) sub.textContent = "Add everything, I'll pick the best. Up to 300 photos here, or paste an album link for more. You can come back from the link in your email."; }
  var MAX = 300, files = [], state = {}, queue = [], active = 0;
  var grid = $('pdGrid'), count = $('pdCount'), msg = $('pdMsg'), input = $('pdFiles');
  input.addEventListener('change', function () { add(input.files); input.value = ''; });
  function add(list) {
    Array.prototype.forEach.call(list, function (f) {
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)) return;
      if (files.length >= MAX || files.some(function (g) { return g.name === f.name && g.size === f.size; })) return;
      f._k = O.newId(); files.push(f); state[f._k] = 'wait'; queue.push(f);
    });
    pump(); draw();
  }
  function draw() {
    var done = files.filter(function (f) { return state[f._k] === 'ok'; }).length;
    var left = files.length - done - files.filter(function (f) { return state[f._k] === 'fail'; }).length;
    count.textContent = files.length + ' of ' + LIMIT;
    msg.textContent = left > 0 ? 'Uploading ' + left + ' more… you can keep adding.' : (files.some(function (f) { return state[f._k] === 'fail'; }) ? "A few photos didn't upload. Add them again or email them to me." : '');
    grid.innerHTML = '';
    files.slice(-14).forEach(function (f) {
      var d = document.createElement('div'); d.className = 'pi-th';
      var img = document.createElement('img'); img.alt = ''; img.src = URL.createObjectURL(f);
      img.onload = function () { URL.revokeObjectURL(img.src); }; img.onerror = function () { img.remove(); };
      d.appendChild(img);
      var m = document.createElement('span'); m.className = state[f._k] === 'ok' ? 'pi-ok' : 'pi-up'; m.textContent = state[f._k] === 'ok' ? '✓' : '';
      d.appendChild(m); grid.appendChild(d);
    });
    var a = document.createElement('label'); a.className = 'pi-th pi-add'; a.htmlFor = 'pdFiles'; a.textContent = '+'; grid.appendChild(a);
  }
  function pump() {
    while (active < 3 && queue.length) {
      var f = queue.shift(); active++;
      send(f, 0).then(function (k) { state[k] = 'ok'; }, function (k) { state[k] = 'fail'; }).then(function () { active--; draw(); pump(); });
    }
  }
  function send(f, attempt) {
    return shrink(f).then(function (b) { return b64(b).then(function (d) {
      return O.post({ action: 'photo', id: id, first_name: (email || 'client').split('@')[0], name: b === f ? f.name : f.name.replace(/\.[^.]+$/, '') + '.jpg', type: b.type || 'image/jpeg', data: d });
    }); }).then(function () { return f._k; }, function () { if (attempt < 1) return send(f, attempt + 1); throw f._k; });
  }
  function shrink(f) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { res(b && b.size < f.size ? b : f); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(f); };
      img.src = u;
    });
  }
  function b64(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(b); }); }

  $('pdForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('pdErr'), btn = $('pdDone'), f = e.target;
    if (!files.length && !f.notes.value.trim() && !(f.album && f.album.value.trim())) { err.textContent = 'Add your photos first, or paste an album link.'; err.hidden = false; return; }
    err.hidden = true; btn.disabled = true;
    var wait = setInterval(function () {
      var left = files.filter(function (x) { return state[x._k] === 'wait'; }).length;
      btn.textContent = left ? 'Finishing upload, ' + left + ' left…' : 'Sending…';
      if (left) return;
      clearInterval(wait);
      var who = f.querySelector('[name=who]:checked'), found = f.querySelector('[name=found]:checked');
      O.post({ action: 'done', id: id, email: email, who: who ? who.value : '', title: f.title.value, notes: f.notes.value, photos_link: f.album ? f.album.value.trim() : '', found: found ? found.value : '',
        photos_count: files.filter(function (x) { return state[x._k] === 'ok'; }).length })
        .catch(function () {})
        .then(function () {
          if (window.ym) ym(114414250, 'reachGoal', 'photos_sent'); try { if (window.clarity) clarity('event', 'photos_sent'); } catch (x) {}
          $('pdMain').hidden = true; $('pdThanks').hidden = false; window.scrollTo(0, 0);
        });
    }, 400);
  });
  draw();
})();
