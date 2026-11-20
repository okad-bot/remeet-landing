/* ReMeet /proof: photo picker, upload, UTM, countdown */
(function () {
  // Where the form posts (multipart/form-data). Empty = backend not connected yet.
  var PROOF_ENDPOINT = '';
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

    files.forEach(function (f) { fd.append('photos', f, f.name); });
    fd.append('page', location.href);
    btn.disabled = true; prog.hidden = false;
    var bar = prog.querySelector('div'), label = prog.querySelector('span');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', PROOF_ENDPOINT);
    xhr.upload.onprogress = function (ev) {
      if (!ev.lengthComputable) return;
      var p = Math.round(ev.loaded / ev.total * 100);
      bar.style.width = p + '%'; label.textContent = (p < 100 ? 'Uploading… ' : 'Almost done… ') + p + '%';
    };
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { sessionStorage.setItem('remeet_proof_sent', '1'); } catch (e) {}
        location.href = '/proof/thanks/';
      } else { btn.disabled = false; prog.hidden = true; fail('Something went wrong. Please try again, or email olga@okad.agency.'); }
    };
    xhr.onerror = function () { btn.disabled = false; prog.hidden = true; fail('Connection lost. Please try again, or email olga@okad.agency.'); };
    xhr.send(fd);
  });
})();
