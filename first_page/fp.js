/* ReMeet /proof: 6 photos -> email -> instant spread in 6 styles -> pick -> order. */
(function () {
  var O = window.REMEET_ORDER, R = window.RemeetRender;
  var MAX = 10, MIN = 6, MAX_MB = 25, BUILD_MS = 15000;
  var $ = function (id) { return document.getElementById(id); };
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function track(ev, ymGoal, params) { if (window.fbq) fbq(ev[0], ev[1], params || {}); if (window.ym && ymGoal) ym(114414250, 'reachGoal', ymGoal); }

  // UTM for the whole session
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'], q = new URLSearchParams(location.search);
  UTM.forEach(function (k) { if (q.get(k)) ss('remeet_' + k, q.get(k)); });
  function utm() { var o = {}; UTM.forEach(function (k) { o[k] = ss('remeet_' + k) || ''; }); return o; }

  var id = ss('remeet_fp_id') || O.newId(); ss('remeet_fp_id', id);
  var files = [], uploads = {}, results = null, current = 0, chosen = null, email = '';
  var screens = ['s1', 's2', 's3', 's4', 's5', 's6'];

  // ---------- screens + back button
  var hstep = document.createElement('span'); hstep.className = 'pi-hstep';
  var tb = document.querySelector('.topbar'); if (tb) tb.appendChild(hstep);
  var STEP = { s2: 'Step 1 of 2', s3: 'Step 2 of 2' };
  function show(name, push) {
    hstep.textContent = STEP[name] || '';
    document.body.classList.toggle('pi-app', name !== 's1');
    document.body.classList.toggle('pi-dark-page', name === 's4');
    screens.forEach(function (s) { $(s).hidden = s !== name; });
    window.scrollTo(0, 0);
    if (window.remeetTypo) requestAnimationFrame(function () { window.remeetTypo($(name)); });
    if (push !== false) history.pushState({ s: name }, '', location.pathname + location.search + (name === 's1' ? '' : '#' + name));
  }
  window.addEventListener('popstate', function (e) {
    var s = (e.state && e.state.s) || 's1';
    if (s === 's4') s = results ? 's5' : 's3';
    if ((s === 's5' || s === 's6') && !results) s = files.length ? 's3' : 's1';
    if (s !== 's1' && !files.length) s = 's1';
    show(s, false);
  });
  history.replaceState({ s: 's1' }, '', location.pathname + location.search);

  // ---------- s1 / s2: photos
  var input = $('piFiles'), grid = $('piGrid'), counter = $('piCount'), msg = $('piMsg'), cont = $('piContinue');
  function pick() { input.click(); }
  document.querySelectorAll('[data-pick]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); pick(); }); });
  input.addEventListener('change', function () {
    var first = !files.length;
    add(input.files); input.value = '';
    if (files.length) { if (first) track(['trackCustom', 'UploadStarted'], 'proof_photos'); if ($('s2').hidden) show('s2'); }
  });

  function add(list) {
    var skipped = 0;
    Array.prototype.forEach.call(list, function (f) {
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)) { skipped++; return; }
      if (f.size > MAX_MB * 1048576 || files.length >= MAX) { skipped++; return; }
      if (files.some(function (g) { return g.name === f.name && g.size === f.size; })) return;
      f._k = O.newId(); files.push(f); upload(f);
    });
    msg.textContent = skipped ? (files.length >= MAX ? 'Up to ' + MAX + ' photos here. You add the rest after.' : 'Some files were skipped.') : '';
    draw();
  }
  function draw() {
    grid.innerHTML = '';
    files.forEach(function (f, i) {
      var d = document.createElement('div'); d.className = 'pi-th';
      var img = document.createElement('img'); img.alt = ''; img.src = URL.createObjectURL(f);
      img.onload = function () { URL.revokeObjectURL(img.src); }; img.onerror = function () { img.remove(); };
      d.appendChild(img);
      var st = uploads[f._k];
      var mark = document.createElement('span'); mark.className = st === 'ok' ? 'pi-ok' : 'pi-up'; mark.textContent = st === 'ok' ? '✓' : '';
      d.appendChild(mark);
      var x = document.createElement('button'); x.type = 'button'; x.className = 'pi-x'; x.setAttribute('aria-label', 'Remove photo'); x.textContent = '×';
      x.onclick = function () { files.splice(i, 1); results = null; draw(); };
      d.appendChild(x); grid.appendChild(d);
    });
    if (files.length < MAX) {
      var a = document.createElement('button'); a.type = 'button'; a.className = 'pi-th pi-add'; a.textContent = '+'; a.setAttribute('aria-label', 'Add photos');
      a.onclick = pick; grid.appendChild(a);
    }
    counter.textContent = files.length + ' / ' + MAX;
    cont.disabled = files.length < MIN;
    cont.textContent = files.length < MIN ? 'Add ' + (MIN - files.length) + ' more' : 'Continue';
    var strip = $('piStrip'); if (strip) { strip.innerHTML = grid.innerHTML; strip.querySelectorAll('button').forEach(function (b) { b.remove(); }); }
  }
  cont.addEventListener('click', function () { if (files.length >= MIN) { show('s3'); startRender(); setTimeout(function () { $('piEmail').focus(); }, 250); } });

  // Background upload of the preview photos into the client's Drive folder
  var upQueue = [], upActive = 0;
  function upload(f) { uploads[f._k] = 'wait'; upQueue.push(f); pump(); }
  function pump() {
    while (upActive < 3 && upQueue.length) {
      var f = upQueue.shift(); upActive++;
      sendPhoto(f, 0).then(function (k) { uploads[k] = 'ok'; }, function () {}).then(function () { upActive--; draw(); pump(); });
    }
  }
  function sendPhoto(f, attempt) {
    return shrink(f).then(function (blob) {
      return toB64(blob).then(function (b64) {
        var name = 'preview_' + (blob === f ? f.name : f.name.replace(/\.[^.]+$/, '') + '.jpg');
        return O.post({ action: 'photo', id: id, first_name: (email || 'client').split('@')[0], name: name, type: blob.type || 'image/jpeg', data: b64 });
      });
    }).then(function () { return f._k; })
      .catch(function (e) { if (attempt < 1) return sendPhoto(f, attempt + 1); throw e; });
  }
  function shrink(f, max, qual) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var m = max || 2400, k = Math.min(1, m / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b && b.size < f.size ? b : f); }, 'image/jpeg', qual || 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(f); };
      img.src = url;
    });
  }
  function toB64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(blob); }); }

  // ---------- render (starts as soon as photos are in)
  var renderP = null;
  function startRender() {
    renderP = R.renderAll(files.slice()).then(function (r) { results = r; return r; });
    renderP.catch(function () {});
    return renderP;
  }

  // ---------- s3: email
  var emailIn = $('piEmail'), hint = $('piHint'), err = $('piErr');
  var DOM = { 'gmail.con': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gnail.com': 'gmail.com', 'yahoo.con': 'yahoo.com', 'hotmail.con': 'hotmail.com', 'icloud.con': 'icloud.com', 'outlook.con': 'outlook.com', 'yaho.com': 'yahoo.com', 'iclod.com': 'icloud.com' };
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  emailIn.addEventListener('input', function () {
    err.hidden = true;
    var v = emailIn.value.trim().toLowerCase(), d = v.split('@')[1];
    if (d && DOM[d]) {
      var fix = v.split('@')[0] + '@' + DOM[d];
      hint.innerHTML = 'Did you mean <button type="button">' + fix.replace(/</g, '') + '</button>?';
      hint.hidden = false; hint.querySelector('button').onclick = function () { emailIn.value = fix; hint.hidden = true; };
    } else hint.hidden = true;
  });
  $('piEmailForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = emailIn.value.trim();
    if (!emailOk(v)) { err.textContent = 'Please check your email.'; err.hidden = false; emailIn.focus(); return; }
    email = v; ss('remeet_proof_email', v);
    var lead = utm(); lead.action = 'email'; lead.id = id; lead.email = v; lead.page = location.href; lead.photos_count = files.length;
    O.post(lead).catch(function () {});
    track(['track', 'Lead'], 'proof_email', { content_name: 'first_page' });
    document.querySelectorAll('.pi-email-echo').forEach(function (el) { el.textContent = v; });
    show('s4'); build();
  });

  // ---------- s4: building
  function build() {
    var bar = $('piBar'), line = $('piLine');
    var t0 = Date.now(), tick = 0;
    var raf = setInterval(function () { bar.style.width = Math.min(96, 4 + 92 * (Date.now() - t0) / BUILD_MS) + '%'; }, 150);
    (renderP || startRender()).then(function (r) {
      var wait = Math.max(0, BUILD_MS - (Date.now() - t0));
      setTimeout(function () {
        clearInterval(tick); clearInterval(raf); bar.style.width = '100%';
        showResults(r); sendPreview(r);
      }, wait);
    }).catch(function () {
      clearInterval(tick); clearInterval(raf);
      line.textContent = "I couldn't open these photos here. I'll make your preview by hand and email it within 24 hours.";
      O.post(Object.assign(utm(), { id: id, email: email, first_name: email.split('@')[0], photos_count: files.length, page: location.href, notes: 'Preview failed in browser, make by hand' })).catch(function () {});
    });
  }

  function sendPreview(r) {
    var imgs = r.map(function (o) { return { name: o.key + '.jpg', style: o.name, data: o.src.split(',')[1] }; });
    var lead = utm(); lead.action = 'preview'; lead.id = id; lead.email = email; lead.first_name = email.split('@')[0];
    lead.photos_count = files.length; lead.page = location.href; lead.images = imgs;
    O.post(lead).catch(function () {});
  }

  // ---------- s5: pick a style
  var car = $('piCar'), dots = $('piDots'), styleName = $('piStyleName'), styleNum = $('piStyleNum');
  var FIRST = 99, shown = FIRST, moreBtn = $('piMore');
  function small(c) {
    var k = 1200 / c.width, t = document.createElement('canvas');
    t.width = 1200; t.height = Math.round(c.height * k);
    t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL('image/jpeg', 0.86);
  }
  function showResults(r) {
    car.innerHTML = ''; dots.innerHTML = '';
    shown = Math.min(FIRST, r.length);
    r.forEach(function (o, i) {
      var fig = document.createElement('figure'); fig.className = 'pi-slide';
      var img = document.createElement('img'); img.alt = 'Your first spread, ' + o.name + ' style'; o.src = small(o.canvas); img.src = o.src;
      img.addEventListener('click', function () { zoom(o.src); });
      fig.appendChild(img); car.appendChild(fig);
      var d = document.createElement('button'); d.type = 'button'; d.textContent = 'Style ' + (i + 1); d.setAttribute('aria-label', 'Style ' + (i + 1) + ', ' + o.name);
      if (i >= shown) { fig.hidden = true; d.hidden = true; }
      d.onclick = function () { car.scrollTo({ left: i * car.clientWidth, behavior: 'auto' }); setCurrent(i); };
      dots.appendChild(d);
    });
    moreBtn.hidden = r.length <= shown;
    moreBtn.textContent = 'See ' + (r.length - shown) + ' more styles';
    current = 0; setCurrent(0);
    if ($('piNone')) $('piNone').href = '/first_page/?step=2&id=' + encodeURIComponent(id) + '&e=' + encodeURIComponent(email);
    show('s5');
    track(['trackCustom', 'PreviewViewed'], 'proof_preview');
  }
  function setCurrent(i) {
    current = i;
    styleName.textContent = results[i].name; styleNum.textContent = (i + 1) + ' of ' + shown;
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
  }
  car.addEventListener('scroll', function () {
    var i = Math.round(car.scrollLeft / Math.max(1, car.clientWidth));
    if (results && i !== current && i >= 0 && i < shown) setCurrent(i);
  }, { passive: true });
  $('piPrev').onclick = function () { car.scrollTo({ left: Math.max(0, current - 1) * car.clientWidth, behavior: 'smooth' }); };
  $('piNext').onclick = function () { car.scrollTo({ left: Math.min(shown - 1, current + 1) * car.clientWidth, behavior: 'smooth' }); };
  moreBtn.onclick = function () {
    var first = shown; shown = results.length;
    Array.prototype.forEach.call(car.children, function (f) { f.hidden = false; });
    Array.prototype.forEach.call(dots.children, function (d) { d.hidden = false; });
    moreBtn.hidden = true; setCurrent(current);
    car.scrollTo({ left: first * car.clientWidth, behavior: 'smooth' });
  };
  // Save or share the preview spread (with a small remeet.cc line under it)
  if ($('piSave')) $('piSave').addEventListener('click', function () {
    var o = results && results[current]; if (!o) return;
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'), pad = 70;
      c.width = img.width; c.height = img.height + pad;
      var x = c.getContext('2d');
      x.fillStyle = '#F4EFE6'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0);
      x.fillStyle = '#334639'; x.font = '26px Georgia, serif'; x.textAlign = 'center';
      x.fillText('My book preview · remeet.cc', c.width / 2, img.height + 45);
      c.toBlob(function (blob) {
        var file = new File([blob], 'my-remeet-book.jpg', { type: 'image/jpeg' });
        track(['trackCustom', 'PreviewSaved'], 'preview_saved');
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'My ReMeet book', text: 'Look what my photos became: remeet.cc' }).catch(function () {});
        } else {
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-remeet-book.jpg';
          document.body.appendChild(a); a.click(); a.remove();
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = o.src;
  });
  $('piChoose').addEventListener('click', function () {
    chosen = results[current];
    O.post({ action: 'style', id: id, email: email, style: chosen.name }).catch(function () {});
    track(['trackCustom', 'StyleChosen'], 'proof_style', { style: chosen.name });
    $('piChosen').src = chosen.src; $('piChosenName').textContent = chosen.name;
    if ($('piRecap')) { $('piRecapImg').src = chosen.src; $('piRecapTitle').textContent = 'Your book'; $('piRecap').hidden = false; }
    var others = results.filter(function (o) { return o !== chosen; });
    $('piBlur1').src = others[0].src; $('piBlur2').src = others[1].src;
    show('s6'); price();
  });

  function zoom(src) {
    var z = $('piZoom'); z.querySelector('img').src = src; z.hidden = false;
  }
  $('piZoom').addEventListener('click', function () { this.hidden = true; });

  // ---------- s6: order
  var form = $('piOrder'), payBtn = $('piPay'), fallback = $('piFallback');
  function sel() { var f = form.querySelector('input[name=format]:checked'); return { format: f ? f.value : 'pdf', picks: !!(form.querySelector('input[name=picks]') || {}).checked }; }
  function price() {
    var s = sel(), t = O.total(s.format, s.picks);
    form.querySelectorAll('.pi-opt').forEach(function (l) { l.classList.toggle('sel', l.querySelector('input').checked); });
    payBtn.textContent = 'Make my full book, $' + t;
  }
  form.addEventListener('change', price);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = sel();
    payBtn.disabled = true; payBtn.textContent = 'One moment…';
    var went = O.checkout({ id: id, email: email, format: s.format, picks: s.picks, style: chosen ? chosen.name : '' });
    if (!went) { payBtn.hidden = true; fallback.hidden = false; }
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { payBtn.disabled = false; price(); } });

  // Sticky "Add photos" on the long landing
  var sticky = $('piSticky'), hero = $('s1');
  if (sticky && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { sticky.hidden = es[0].isIntersecting || document.body.classList.contains('pi-app'); }, { threshold: 0.05 }).observe(hero.querySelector('.pi-add-btn'));
  if (sticky) sticky.addEventListener('click', function (e) { e.preventDefault(); pick(); });

  draw();

  // Photos picked on the homepage come over here
  if (/from=home/.test(location.search) && window.indexedDB) {
    try {
      var rq = indexedDB.open('remeet', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('handoff'); };
      rq.onsuccess = function () {
        var db = rq.result, tx = db.transaction('handoff', 'readwrite'), st = tx.objectStore('handoff'), g = st.get('files');
        g.onsuccess = function () {
          var list = (g.result || []).map(function (x) { try { return new File([x.blob], x.name, { type: x.type }); } catch (e) { x.blob.name = x.name; return x.blob; } });
          st.delete('files');
          if (list.length) { add(list); track(['trackCustom', 'UploadStarted'], 'proof_photos'); show('s2'); }
        };
      };
    } catch (e) {}
  }
})();
