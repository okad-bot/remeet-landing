/* ReMeet instant preview: lays out up to 6 photos as a square-book spread in 6 styles, right in the browser. */
(function (root) {
  var W = 2000, H = 1000, P = 1000; // spread = two 1000x1000 pages
  var FONT_BASE = '/assets/proof/fonts/';
  var FONTS = [
    ['RM Serif', 'cormorant-garamond-latin-400-normal.woff2', '400', 'normal'],
    ['RM Serif', 'cormorant-garamond-latin-400-italic.woff2', '400', 'italic'],
    ['RM Serif', 'cormorant-garamond-latin-600-normal.woff2', '600', 'normal'],
    ['RM Hand', 'nothing-you-could-do-latin-400-normal.woff2', '400', 'normal'],
    ['RM Display', 'dm-serif-display-latin-400-normal.woff2', '400', 'normal'],
    ['RM Display', 'dm-serif-display-latin-400-italic.woff2', '400', 'italic'],
    ['RM Doodle', 'caveat-latin-600-normal.woff2', '600', 'normal'],
    ['RM Type', 'special-elite-latin-400-normal.woff2', '400', 'normal'],
    ['RM Sans', 'dm-sans-latin-500-normal.woff2', '500', 'normal']
  ];
  var fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    if (!('FontFace' in root)) return (fontsReady = Promise.resolve());
    fontsReady = Promise.all(FONTS.map(function (f) {
      var ff = new FontFace(f[0], 'url(' + FONT_BASE + f[1] + ')', { weight: f[2], style: f[3] });
      return ff.load().then(function (x) { document.fonts.add(x); }).catch(function () {});
    }));
    return fontsReady;
  }

  // Decode a File into a downscaled canvas (EXIF orientation is applied by the browser).
  function decode(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1500 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  // ---------- drawing helpers
  function cover(ctx, im, x, y, w, h, fy) {
    if (!im) { ctx.fillStyle = '#ddd5c8'; ctx.fillRect(x, y, w, h); return; }
    fy = fy == null ? 0.38 : fy;
    var r = Math.max(w / im.width, h / im.height), sw = w / r, sh = h / r;
    var sx = (im.width - sw) / 2, sy = (im.height - sh) * fy;
    ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
  }
  function fill(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function text(ctx, s, x, y, font, color, align, spacing) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    if (spacing && 'letterSpacing' in ctx) { ctx.letterSpacing = spacing + 'px'; ctx.fillText(s, x, y); ctx.letterSpacing = '0px'; }
    else ctx.fillText(s, x, y);
  }
  function lines(ctx, arr, x, y, lh, font, color, align) { arr.forEach(function (s, i) { text(ctx, s, x, y + i * lh, font, color, align); }); }
  function shadow(ctx, blur, oy, a) { ctx.shadowColor = 'rgba(0,0,0,' + (a || 0.22) + ')'; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; ctx.shadowOffsetX = 0; }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
  function rotated(ctx, cx, cy, deg, fn) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(deg * Math.PI / 180); fn(); ctx.restore(); }
  function polaroid(ctx, im, cx, cy, w, h, deg, cap, capFont, capColor) {
    rotated(ctx, cx, cy, deg, function () {
      var b = Math.round(w * 0.06), bb = cap ? Math.round(w * 0.2) : b;
      shadow(ctx, 26, 10, 0.2); fill(ctx, '#fff', -w / 2 - b, -h / 2 - b, w + 2 * b, h + b + bb); noShadow(ctx);
      cover(ctx, im, -w / 2, -h / 2, w, h);
      if (cap) text(ctx, cap, 0, h / 2 + bb * 0.68, capFont, capColor, 'center');
    });
  }
  function tape(ctx, cx, cy, w, deg, color) {
    rotated(ctx, cx, cy, deg, function () { ctx.fillStyle = color || 'rgba(236,226,200,.82)'; ctx.fillRect(-w / 2, -17, w, 34); });
  }
  function gutter(ctx, dark) {
    var g = ctx.createLinearGradient(P - 70, 0, P + 70, 0);
    var a = dark ? 0.35 : 0.12;
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(P - 70, 0, 140, H);
  }
  function watermark(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.10; ctx.font = '600 30px "RM Sans", sans-serif'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    for (var y = 120; y < H; y += 260) for (var x = (y / 260 % 2 ? 160 : 400); x < W; x += 520) {
      rotated(ctx, x, y, -18, function () { ctx.fillText('PREVIEW', 0, 0); });
    }
    ctx.restore();
  }
  function month() {
    var m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var d = new Date(); return m[d.getMonth()] + ' ' + d.getFullYear();
  }

  // Assign photos to slots by shape: 'v' portrait, 'h' landscape, 's' any.
  function assign(photos, slots) {
    var pool = photos.filter(Boolean).map(function (p) { return { im: p, r: p.width / p.height, used: 0 }; });
    if (!pool.length) return slots.map(function () { return null; });
    return slots.map(function (want) {
      var best = null, bestScore = 1e9;
      pool.forEach(function (p) {
        var shape = p.r < 0.9 ? 'v' : p.r > 1.15 ? 'h' : 's';
        var score = p.used * 10 + (want === 's' || shape === want ? 0 : shape === 's' ? 1 : 3);
        if (score < bestScore) { bestScore = score; best = p; }
      });
      best.used++; return best.im;
    });
  }

  // ---------- six styles
  var STYLES = [
    { key: 'calm', name: 'calm, quiet', slots: ['v', 'v', 'h'], draw: function (ctx, s, t) {
      fill(ctx, '#FBFAF7', 0, 0, W, H);
      cover(ctx, s[0], 0, 0, P, H);
      var g = ctx.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, P, H * 0.45);
      lines(ctx, t.title2, 64, H - 230, 86, '400 92px "RM Serif", serif', '#fff');
      text(ctx, t.when.toUpperCase(), 68, H - 70, '600 17px "RM Serif", serif', '#fff', 'left', 4);
      cover(ctx, s[1], P + 90, 90, 430, 600);
      cover(ctx, s[2], P + 560, 470, 350, 250);
      lines(ctx, ['the days we', "don't want to forget"], P + 560, 160, 36, 'italic 400 31px "RM Serif", serif', '#23262f');
      text(ctx, 'ONE', P + 90, 760, '600 15px "RM Serif", serif', '#23262f', 'left', 4);
      text(ctx, 'slow mornings, all of us at home', P + 90, 800, 'italic 400 24px "RM Serif", serif', '#23262f');
      text(ctx, 'REMEET', P + 910, 940, '600 13px "RM Serif", serif', '#9a958b', 'right', 4);
      gutter(ctx);
    } },
    { key: 'collage', name: 'editorial collage', slots: ['v', 's', 's', 's', 's'], draw: function (ctx, s, t) {
      fill(ctx, '#FBFAF7', 0, 0, W, H);
      lines(ctx, t.title2, 64, 190, 112, '400 124px "RM Serif", serif', '#23262f');
      text(ctx, t.when, 70, 380, 'italic 400 30px "RM Serif", serif', '#23262f');
      cover(ctx, s[0], 480, 330, 440, 600);
      rotated(ctx, 210, 610, -4, function () { lines(ctx, ['little things,', 'big feelings'], 0, 0, 48, '400 38px "RM Hand", cursive', '#23262f', 'center'); });
      var gx = P + 80, gy = 80, cw = 410, gap = 20;
      cover(ctx, s[1], gx, gy, cw, cw); cover(ctx, s[2], gx + cw + gap, gy, cw, cw);
      cover(ctx, s[3], gx, gy + cw + gap, cw, cw); cover(ctx, s[4], gx + cw + gap, gy + cw + gap, cw, cw);
      text(ctx, 'Saturday, the park, and nowhere to be.', gx, 948, 'italic 400 24px "RM Serif", serif', '#23262f');
      gutter(ctx);
    } },
    { key: 'doodly', name: 'sweet, doodly', slots: ['v', 's', 'v', 'h'], draw: function (ctx, s, t) {
      fill(ctx, '#F2E4E0', 0, 0, P, H); fill(ctx, '#F6EEDD', P, 0, P, H);
      ctx.fillStyle = 'rgba(181,82,74,.12)';
      for (var y = 30; y < H; y += 44) for (var x = 30; x < W; x += 44) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
      text(ctx, t.title1, 70, 150, '600 94px "RM Doodle", cursive', '#2c2a4a');
      polaroid(ctx, s[0], 330, 560, 380, 480, -5, 'my favorite face', '600 38px "RM Doodle", cursive', '#2c2a4a');
      polaroid(ctx, s[1], 760, 470, 300, 300, 6, 'giggles', '600 34px "RM Doodle", cursive', '#2c2a4a');
      rotated(ctx, 770, 830, 10, function () {
        ctx.strokeStyle = '#B5524A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 80, 0, 7); ctx.stroke();
        lines(ctx, ['BEST', 'DAYS'], 0, -6, 40, '600 40px "RM Doodle", cursive', '#B5524A', 'center');
      });
      polaroid(ctx, s[2], P + 300, 500, 400, 520, 4, 'sunday', '600 38px "RM Doodle", cursive', '#2c2a4a');
      polaroid(ctx, s[3], P + 730, 360, 360, 260, -6, '', '', '');
      lines(ctx, ['you made us', 'laugh all day'], P + 740, 690, 52, '600 46px "RM Doodle", cursive', '#B5524A', 'center');
      rotated(ctx, P + 780, 870, -12, function () {
        ctx.fillStyle = '#B5524A'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fill();
        lines(ctx, ['LOVE', 'YOU'], 0, -4, 34, '600 34px "RM Doodle", cursive', '#F7EFE6', 'center');
      });
      gutter(ctx);
    } },
    { key: 'journal', name: 'journal, taped', slots: ['h', 'v', 'v', 'h'], draw: function (ctx, s, t) {
      fill(ctx, '#F7F3EA', 0, 0, W, H);
      ctx.strokeStyle = 'rgba(80,100,140,.10)'; ctx.lineWidth = 2;
      for (var y = 90; y < H; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      text(ctx, t.when.toUpperCase(), 80, 110, '400 24px "RM Type", monospace', '#5b4a3a', 'left', 3);
      rotated(ctx, 80, 200, -2, function () { text(ctx, t.title1, 0, 0, '400 64px "RM Hand", cursive', '#23262f'); });
      var p1 = function (im, cx, cy, w, h, d) { rotated(ctx, cx, cy, d, function () { shadow(ctx, 18, 6, 0.16); fill(ctx, '#fff', -w / 2 - 14, -h / 2 - 14, w + 28, h + 28); noShadow(ctx); cover(ctx, im, -w / 2, -h / 2, w, h); }); };
      p1(s[0], 500, 440, 600, 400, -2.5); tape(ctx, 500, 235, 170, 3);
      p1(s[1], 230, 790, 260, 320, 3); tape(ctx, 230, 625, 120, -6);
      rotated(ctx, 700, 830, -3, function () { lines(ctx, ['the light that', 'afternoon...'], 0, 0, 52, '400 38px "RM Hand", cursive', '#23262f'); });
      p1(s[2], P + 290, 420, 400, 540, 2); tape(ctx, P + 290, 140, 150, -4); tape(ctx, P + 290, 700, 150, 5);
      p1(s[3], P + 720, 640, 430, 310, -3); tape(ctx, P + 600, 480, 110, -30); tape(ctx, P + 850, 480, 110, 28);
      rotated(ctx, P + 600, 180, 2, function () { lines(ctx, ['note to self:', 'keep this one'], 0, 0, 52, '400 36px "RM Hand", cursive', '#23262f'); });
      text(ctx, '#ourlittlebook', P + 920, 950, '400 20px "RM Type", monospace', '#5b4a3a', 'right');
      gutter(ctx);
    } },
    { key: 'film', name: 'film, evening', slots: ['h', 'v', 'v', 'v', 'h'], draw: function (ctx, s, t) {
      fill(ctx, '#1d1c1a', 0, 0, W, H);
      text(ctx, t.title1, 70, 170, '400 92px "RM Display", serif', '#F1E9DC');
      text(ctx, t.when, 74, 222, 'italic 400 30px "RM Display", serif', '#bdb3a3');
      cover(ctx, s[0], 70, 300, 860, 560);
      text(ctx, 'NO. 01 · THE GOLDEN HOUR', 70, 912, '500 16px "RM Sans", sans-serif', '#bdb3a3', 'left', 3);
      var x0 = P + 70, w3 = 270, g = 25;
      for (var i = 0; i < 3; i++) cover(ctx, s[1 + i], x0 + i * (w3 + g), 80, w3, 380);
      cover(ctx, s[4], x0, 500, 860, 380);
      text(ctx, 'and then the sun went down', P + 930, 940, 'italic 400 28px "RM Display", serif', '#F1E9DC', 'right');
      gutter(ctx, true);
    } },
    { key: 'minimal', name: 'warm, minimal', slots: ['v', 'h', 'h'], draw: function (ctx, s, t) {
      fill(ctx, '#EFE7DA', 0, 0, W, H);
      text(ctx, t.title1.toUpperCase(), 500, 120, '600 20px "RM Serif", serif', '#5d5144', 'center', 8);
      cover(ctx, s[0], 230, 170, 540, 700);
      text(ctx, 'you, at home', 500, 925, 'italic 400 28px "RM Serif", serif', '#5d5144', 'center');
      cover(ctx, s[1], P + 150, 110, 700, 400);
      cover(ctx, s[2], P + 150, 540, 700, 400);
      text(ctx, t.when.toUpperCase(), P + 850, 975, '600 15px "RM Serif", serif', '#8a7d6c', 'right', 5);
      gutter(ctx);
    } }
  ];

  function texts() { return { title1: 'Our little days', title2: ['Our little', 'days'], when: month() }; }

  // Render one style. Returns a canvas.
  function renderStyle(style, photos, opts) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    style.draw(ctx, assign(photos, style.slots), texts());
    noShadow(ctx);
    if (!opts || opts.watermark !== false) watermark(ctx);
    return c;
  }

  // files: File[] -> Promise<[{key,name,canvas}]>
  function renderAll(files) {
    return loadFonts().then(function () {
      return Promise.all(files.slice(0, 10).map(decode));
    }).then(function (photos) {
      photos = photos.filter(Boolean);
      if (!photos.length) throw new Error('no photos decoded');
      return STYLES.map(function (st) { return { key: st.key, name: st.name, canvas: renderStyle(st, photos) }; });
    });
  }

  root.RemeetRender = { renderAll: renderAll, styles: STYLES, loadFonts: loadFonts };
})(window);
