/* ReMeet prices and Stripe Payment Links, shared by the homepage and /proof.
   Each Payment Link: after payment, redirect to https://remeet.cc/first_page/paid/
   An empty link falls back to "I'll email you a payment link". */
(function (w) {
  var O = w.REMEET_ORDER = {
    endpoint: 'https://script.google.com/macros/s/AKfycbzwVGoW_BcdCjok1d3Ga2LIdTELb9i5lslE5Jqrtly3qp2Uxz47ff85Q77xC9XhAtKBBg/exec',
    prices: { small: 29, pdf: 79, picks: 0 },
    formats: {
      small: { name: 'Small book', sub: 'Up to 30 pages, PDF.' },
      pdf: { name: 'Big book', sub: 'Up to 100 pages, PDF.' }
    },
    links: {
      small: 'https://buy.stripe.com/28E5kDcnseUZc9h5Nd8k80Y',
      pdf: 'https://buy.stripe.com/00waEX9bgdQV8X50sT8k80Z'
    },
    total: function (format) { return O.prices[format] || O.prices.pdf; },
    post: function (obj) {
      try { var src = JSON.parse(localStorage.getItem('remeet_src') || 'null'); if (src) { obj.referrer = obj.referrer || src.ref; obj.landing = obj.landing || src.landing; } } catch (e) {}
      var body = JSON.stringify(obj);
      return fetch(O.endpoint, { method: 'POST', keepalive: body.length < 60000, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j || j.status !== 'ok') throw new Error('bad'); return j; });
    },
    newId: function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    // Go to Stripe. Returns false if there is no link yet (caller shows the fallback).
    // "Something special in mind?" box: the checkbox shows a text field, its text goes with the order.
    customText: function () {
      var box = document.querySelector('input[data-custom]'), t = document.querySelector('[data-custom-text]');
      return box && box.checked && t ? t.value.trim().slice(0, 1000) : '';
    },
    checkout: function (o) {
      var key = O.prices[o.format] ? o.format : 'pdf';
      var link = O.links[key];
      var total = O.total(key);
      try {
        localStorage.setItem('remeet_order_total', String(total));
        localStorage.setItem('remeet_order', JSON.stringify({ id: o.id, email: o.email || '', format: key, picks: false, copies: 1, style: o.style || '', total: total }));
      } catch (e) {}
      if (w.fbq) fbq('track', 'InitiateCheckout', { value: total, currency: 'USD', content_name: key });
      if (w.ym) ym(114414250, 'reachGoal', 'checkout');
      var custom = o.custom || O.customText();
      O.post(Object.assign({}, o.extra || {}, { action: 'order', custom: custom, id: o.id, email: o.email || '', format: key, total: total, style: o.style || '', page: location.href, link: link ? 'stripe' : 'manual' })).catch(function () {});
      if (!link) return false;
      var q = '?client_reference_id=' + encodeURIComponent(o.id) + (o.email ? '&prefilled_email=' + encodeURIComponent(o.email) : '');
      w.location.href = link + q;
      return true;
    }
  };
  document.addEventListener('change', function (e) {
    if (!e.target.matches || !e.target.matches('input[data-custom]')) return;
    var t = document.querySelector('[data-custom-text]'); if (!t) return;
    t.hidden = !e.target.checked; if (e.target.checked) t.focus();
  });
})(window);
