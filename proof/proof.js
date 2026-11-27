/* ReMeet /proof: email first, then photos. Uploads go to Google Apps Script. */
(function () {
  var PROOF_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzwVGoW_BcdCjok1d3Ga2LIdTELb9i5lslE5Jqrtly3qp2Uxz47ff85Q77xC9XhAtKBBg/exec';
  var MAX = 30, MIN = 10, MAX_MB = 25;
  var OK_EXT = /\.(jpe?g|png|heic|heif)$/i;

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  // UTM: keep from the first landing URL for the whole session
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var q = new URLSearchParams(location.search);
  UTM.forEach(function (k) {
    if (q.get(k)) ss('remeet_' + k, q.get(k));
    var v = ss('remeet_' + k);
    var f = document.querySelector('#proofForm [name="' + k + '"]');
    if (f && v) f.value = v;
  });

  // Sticky button while the form is off screen
  var sticky = document.getElementById('pfSticky');
  var formBox = document.getElementById('start');
  if (sticky && formBox && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { sticky.hidden = es[0].isIntersecting; }, { threshold: 0.15 }).observe(formBox);
  }
  if (sticky) sticky.addEventListener('click', function (e) {
    e.preventDefault();
    formBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () {
      var el = document.getElementById('pfStep2').hidden ? form.querySelector('[name=email]') : null;
      if (el) el.focus({ preventScroll: true });
    }, 450);
  });

  var form = document.getElementById('proofForm');
  if (!form) return;
  var step1 = document.getElementById('pfStep1'), step2 = document.getElementById('pfStep2');
  var emailIn = form.querySelector('[name=email]');
  var nextBtn = document.getElementById('pfNext');
  var emailDone = document.getElementById('pfEmailDone');
  var input = document.getElementById('pfFiles');
  var drop = document.getElementById('pfDrop');
  var thumbs = document.getElementById('pfThumbs');
  var counter = document.getElementById('pfCounter');
  var fileMsg = document.getElementById('pfFileMsg');
  var errBox = document.getElementById('pfError');
  var btn = document.getElementById('pfSubmit');
  var prog = document.getElementById('pfProgress');
  var files = [];
  var id = ss('remeet_proof_id') || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  ss('remeet_proof_id', id);

  function fail(msg) { errBox.textContent = msg; errBox.hidden = false; }
  function clearErr() { errBox.hidden = true; }
  function utm() { var o = {}; UTM.forEach(function (k) { o[k] = form.querySelector('[name="' + k + '"]').value; }); return o; }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  // Step 1: email. Saved right away, so a dropped upload still leaves a contact.
  function goStep2() {
    clearErr();
    var v = emailIn.value.trim();
    if (!emailOk(v)) { fail('Please check your email.'); emailIn.focus(); return; }
    var lead = utm(); lead.action = 'email'; lead.id = id; lead.email = v; lead.page = location.href;
    post(lead).catch(function () {});
    if (ss('remeet_proof_email') !== v) {
      if (window.fbq) fbq('trackCustom', 'ProofEmail', { content_name: 'proof' });
      if (window.ym) ym(114414250, 'reachGoal', 'proof_email');
      ss('remeet_proof_email', v);
    }
    step1.hidden = true; step2.hidden = false;
    emailDone.innerHTML = '';
    var t = document.createElement('span'); t.textContent = v;
    var ch = document.createElement('button'); ch.type = 'button'; ch.textContent = 'change';
    ch.onclick = function () { step2.hidden = true; step1.hidden = false; emailIn.focus(); };
    emailDone.appendChild(document.createTextNode('✓ ')); emailDone.appendChild(t); emailDone.appendChild(ch);
    // Bring the photo picker and the send button into view
    setTimeout(function () {
      var top = step2.getBoundingClientRect().top + window.pageYOffset - 84;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }, 60);
  }
  nextBtn.addEventListener('click', goStep2);
  emailIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goStep2(); } });

  // Step 2: photos
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!step1.hidden) { goStep2(); return; }
    clearErr();
    if (files.length < MIN) return fail('Please add at least ' + MIN + ' photos (you have ' + files.length + ').');

    btn.disabled = true; prog.hidden = false;
    var bar = prog.querySelector('div'), label = prog.querySelector('span');
    var email = emailIn.value.trim();
    var nameHint = email.split('@')[0];
    var done = 0, total = files.length, failed = 0, queue = files.slice();
    function setProg() {
      bar.style.width = Math.round(done / total * 100) + '%';
      label.textContent = 'Uploading photo ' + Math.min(done + 1, total) + ' of ' + total + '…';
    }
    setProg();
    function worker() {
      var f = queue.shift();
      if (!f) return Promise.resolve();
      return sendPhoto(f, nameHint, 0).then(function () { done++; setProg(); }, function () { failed++; done++; setProg(); }).then(worker);
    }
    Promise.all([worker(), worker(), worker()]).then(function () {
      if (failed > total / 2) throw new Error('too many failed');
      label.textContent = 'Almost done…';
      var lead = utm();
      lead.id = id; lead.email = email; lead.first_name = nameHint;
      var who = form.querySelector('[name=who]:checked'); lead.who = who ? who.value : '';
      lead.photos_count = (total - failed) + (failed ? ' (' + failed + ' failed)' : '');
      lead.page = location.href;
      return post(lead);
    }).then(function () {
      ss('remeet_proof_sent', '1');
      try { sessionStorage.removeItem('remeet_proof_id'); } catch (e) {}
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

  function sendPhoto(f, nameHint, attempt) {
    return shrink(f).then(function (blob) {
      return toB64(blob).then(function (b64) {
        var name = blob === f ? f.name : f.name.replace(/\.[^.]+$/, '') + '.jpg';
        return post({ action: 'photo', id: id, first_name: nameHint, name: name, type: blob.type || 'image/jpeg', data: b64 });
      });
    }).catch(function (e) { if (attempt < 1) return sendPhoto(f, nameHint, attempt + 1); throw e; });
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
