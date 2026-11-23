/* ReMeet prices and Stripe Payment Links, shared by the homepage and /proof.
   Each Payment Link: after payment, redirect to https://remeet.cc/first_page/paid/
   An empty link falls back to "I'll email you a payment link". */
(function (w) {
  var O = w.REMEET_ORDER = {
    endpoint: 'https://script.google.com/macros/s/AKfycbzwVGoW_BcdCjok1d3Ga2LIdTELb9i5lslE5Jqrtly3qp2Uxz47ff85Q77xC9XhAtKBBg/exec',
    prices: { pdf: 89, hardcover: 149, layflat: 199, picks: 25, copy: 69, upgrade: 60 },
    formats: {
      pdf: { name: 'Digital PDF', sub: 'Print-ready file. Want it printed later? +$60.' },
      hardcover: { name: 'Hardcover book + PDF', sub: 'Up to 100 pages. US shipping included.', tag: 'Most gifted' },
      layflat: { name: 'Premium layflat + PDF', sub: 'Thick pages that open flat. US shipping included.' }
    },
    links: {
      pdf: '', hardcover: '', layflat: '',
      pdf_picks: '', hardcover_picks: '', layflat_picks: '',
      copy: '', upgrade: ''
    },
    total: function (format, picks) { return O.prices[format] + (picks ? O.prices.picks : 0); },
    post: function (obj) {
      return fetch(O.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(obj) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j || j.status !== 'ok') throw new Error('bad'); return j; });
    },
    newId: function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    // Go to Stripe. Returns false if there is no link yet (caller shows the fallback).
    checkout: function (o) {
      var key = o.format + (o.picks ? '_picks' : '');
      var link = O.links[key];
      var total = O.total(o.format, o.picks);
      try {
        localStorage.setItem('remeet_order_total', String(total));
        localStorage.setItem('remeet_order', JSON.stringify({ id: o.id, email: o.email || '', format: o.format, picks: !!o.picks, style: o.style || '', total: total }));
      } catch (e) {}
      if (w.fbq) fbq('track', 'InitiateCheckout', { value: total, currency: 'USD', content_name: key });
      if (w.ym) ym(114414250, 'reachGoal', 'checkout');
      O.post({ action: 'order', id: o.id, email: o.email || '', format: key, total: total, style: o.style || '', page: location.href, link: link ? 'stripe' : 'manual' }).catch(function () {});
      if (!link) return false;
      var q = '?client_reference_id=' + encodeURIComponent(o.id) + (o.email ? '&prefilled_email=' + encodeURIComponent(o.email) : '');
      w.location.href = link + q;
      return true;
    }
  };
})(window);
