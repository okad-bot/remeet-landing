/* ReMeet /proof: form submit, UTM, countdown */
(function () {
  var PROOF_ENDPOINT = 'APPS_SCRIPT_URL';

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
  var errBox = document.getElementById('pfError');
  var btn = document.getElementById('pfSubmit');

  function fail(msg) { errBox.textContent = msg; errBox.hidden = false; errBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;
    var fd = new FormData(form);
    if (!String(fd.get('first_name') || '').trim()) return fail('Please add your first name.');
    if (!/^\S+@\S+\.\S+$/.test(String(fd.get('email') || ''))) return fail('Please check your email.');
    if (!fd.get('who')) return fail("Please pick who the book is for.");
    if (!fd.get('when')) return fail('Please pick when you need it.');
    var link = String(fd.get('photos_link') || '').trim();
    if (!link) return fail('Please paste a link to your photos.');
    if (!/^https?:\/\/.+/.test(link)) return fail('The link should start with https://');
    if (!fd.get('agree')) return fail('Please tick the box about your photos.');
    if (!PROOF_ENDPOINT || PROOF_ENDPOINT === 'APPS_SCRIPT_URL') return fail("Form isn't connected yet. Email olga@okad.agency with your photo link and I'll send your spread.");

    var data = {
      first_name: fd.get('first_name'),
      email: fd.get('email'),
      who: fd.get('who'),
      when: fd.get('when'),
      photos_link: link,
      notes: fd.get('notes') || '',
      page: location.href,
      utm_source: fd.get('utm_source') || '',
      utm_medium: fd.get('utm_medium') || '',
      utm_campaign: fd.get('utm_campaign') || '',
      utm_content: fd.get('utm_content') || ''
    };

    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch(PROOF_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function () {
      if (window.fbq) fbq('track', 'Lead', { content_name: 'proof_spread' });
      if (window.gtag) gtag('event', 'generate_lead', { event_category: 'proof', event_label: data.who });
      try { sessionStorage.setItem('remeet_proof_sent', '1'); } catch (e) {}
      location.href = '/proof/thanks/';
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Send my photos';
      fail('Something went wrong. Please try again, or email olga@okad.agency.');
    });
  });
})();
