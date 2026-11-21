/* ReMeet /proof: photo picker, upload, UTM, countdown */
(function () {
  // Where the form posts (multipart/form-data). Empty = backend not connected yet.
  var PROOF_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzwVGoW_BcdCjok1d3Ga2LIdTELb9i5lslE5Jqrtly3qp2Uxz47ff85Q77xC9XhAtKBBg/exec';
  var MAX = 30, MIN = 10, MAX_MB = 25;
  var OK_EXT = /\.(jpe?g|png|heic|heif)$/i;

  // UTM: keep from the first landing URL for the whole session
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var q = new URLSearchParams(location.search);
  UTM.forEach(function (k) {
    try {
      if (q.get(k)) sessionStorage.setItem('remeet_' + k, q.get(k));
      var v = sessionStorage.getItem('remeet_' + k);
      var f = document.querySelector('#proofForm [name="' + k + '"]');
      if (f && v) f.value = v;
    } catch (e) {}
  });

  // Christmas countdown
  var cd = document.querySelector('.pf-countdown');
  if (cd) {
    var end = new Date(cd.dataset.deadline).getTime();
    var tick = function () {
      var t = Math.max(0, end - Date.now());
      var u = { d: Math.floor(t / 864e5), h: Math.floor(t / 36e5) % 24, m: Math.floor(t / 6e4) % 60, s: Math.floor(t / 1e3) % 60 };
      Object.keys(u).forEach(function (k) { cd.querySelector('[data-u="' + k + '"]').textContent = u[k]; });
      if (t === 0) { var sec = cd.closest('.pf-xmas'); if (sec) sec.hidden = true; return; }
      setTimeout(tick, 1000);
    };
    tick();
  }

  var form = document.getElementById('proofForm');
  if (!form) return;
  var input = document.getElementById('pfFiles');
  var drop = document.getElementById('pfDrop');
  var thumbs = document.getElementById('pfThumbs');
  var counter = document.getElementById('pfCounter');
  var fileMsg = document.getElementById('pfFileMsg');
  var errBox = document.getElementById('pfError');
  var btn = document.getElementById('pfSubmit');
  var prog = document.getElementById('pfProgress');
  var files = [];

  function render() {
    thumbs.innerHTML = '';
    files.forEach(function (f, i) {
      var d = document.createElement('div');
      d.className = 'pf-th';
      d.textContent = f.name.replace(/\.[^.]+$/, '').slice(0, 14);
      if (!/\.hei[cf]$/i.test(f.name)) {
        var img = document.createElement('img');
        img.alt = '';
        img.src = URL.createObjectURL(f);
        img.onload = function () { URL.revokeObjectURL(img.src); };
        img.onerror = function () { img.remove(); };
        d.appendChild(img);
      }
      var x = document.createElement('button');
      x.type = 'button'; x.setAttribute('aria-label', 'Remove photo'); x.textContent = '×';
      x.onclick = function () { files.splice(i, 1); render(); };
      d.appendChild(x);
      thumbs.appendChild(d);
    });
    counter.textContent = files.length + ' / ' + MAX;
  }

  function add(list) {
    var skipped = [];
    Array.prototype.forEach.call(list, function (f) {
      var okType = /^image\//.test(f.type) || OK_EXT.test(f.name);
      if (!okType) { skipped.push(f.name + ' (not a photo)'); return; }
      if (f.size > MAX_MB * 1048576) { skipped.push(f.name + ' (over ' + MAX_MB + ' MB)'); return; }
      if (files.some(function (g) { return g.name === f.name && g.size === f.size; })) return;
      if (files.length >= MAX) { skipped.push(f.name + ' (30 max)'); return; }
      files.push(f);
    });
    fileMsg.textContent = skipped.length ? 'Skipped: ' + skipped.slice(0, 3).join(', ') + (skipped.length > 3 ? ' and ' + (skipped.length - 3) + ' more' : '') : '';
    render();
  }

  input.addEventListener('change', function () { add(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('drag'); }); });
  drop.addEventListener('drop', function (ev) { if (ev.dataTransfer) add(ev.dataTransfer.files); });

  function fail(msg) { errBox.textContent = msg; errBox.hidden = false; errBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;
    var fd = new FormData(form);
    if (!String(fd.get('first_name') || '').trim()) return fail('Please add your first name.');
    if (!/^\S+@\S+\.\S+$/.test(String(fd.get('email') || ''))) return fail('Please check your email.');
    if (!fd.get('who')) return fail("Please pick who the book is for.");
    if (!fd.get('when')) return fail('Please pick when you need it.');
    if (files.length < MIN) return fail('Please add at least ' + MIN + ' photos (you have ' + files.length + ').');
    if (!fd.get('agree')) return fail('Please tick the box about your photos.');
    if (!PROOF_ENDPOINT) return fail("Uploads aren't switched on yet. Email your photos to olga@okad.agency and I'll send your spread.");

    btn.disabled = true; prog.hidden = false;
    var bar = prog.querySelector('div'), label = prog.querySelector('span');
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var name = String(fd.get('first_name') || '').trim();
    var done = 0, total = files.length;
    function setProg() {
      var p = Math.round(done / total * 100);
      bar.style.width = p + '%';
      label.textContent = 'Uploading photo ' + Math.min(done + 1, total) + ' of ' + total + '…';
    }
    setProg();
    var queue = files.slice(), failed = 0;
    function worker() {
      var f = queue.shift();
      if (!f) return Promise.resolve();
      return sendPhoto(f, id, name, 0).then(function () { done++; setProg(); }, function () { failed++; done++; setProg(); }).then(worker);
    }
    Promise.all([worker(), worker(), worker()]).then(function () {
      if (failed > total / 2) throw new Error('too many failed');
      label.textContent = 'Almost done…';
      var lead = {};
      fd.forEach(function (v, k) { lead[k] = v; });
      delete lead.agree;
      lead.id = id; lead.photos_count = (total - failed) + (failed ? ' (' + failed + ' failed)' : ''); lead.page = location.href;
      return post(lead);
    }).then(function () {
      if (window.fbq) fbq('track', 'Lead', { content_name: 'proof_spread' });
      if (window.gtag) gtag('event', 'generate_lead', { event_category: 'proof', event_label: fd.get('who') });
      try { sessionStorage.setItem('remeet_proof_sent', '1'); } catch (e) {}
      location.href = '/proof/thanks/';
    }).catch(function () {
      btn.disabled = false; prog.hidden = true;
      fail('Something went wrong with the upload. Please try again, or email your photos to olga@okad.agency.');
    });
  });

  function post(obj) {
    return fetch(PROOF_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(obj) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || j.status !== 'ok') throw new Error('bad'); return j; });
  }

  function sendPhoto(f, id, name, attempt) {
    return shrink(f).then(function (blob) { return toB64(blob).then(function (b64) {
      return post({ action: 'photo', id: id, first_name: name, name: f.name.replace(/\.(hei[cf]|png)$/i, blob.type === 'image/jpeg' ? '.jpg' : '.$1'), type: blob.type || f.type || 'image/jpeg', data: b64 });
    }); }).catch(function (e) { if (attempt < 1) return sendPhoto(f, id, name, attempt + 1); throw e; });
  }

  // Resize to max 2400px JPEG when the browser can decode the file; otherwise send it as is.
  function shrink(f) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var max = 2400, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b && b.size < f.size ? b : f); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(f); };
      img.src = url;
    });
  }

  function toB64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1]); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
})();
