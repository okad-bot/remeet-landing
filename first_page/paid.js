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

  // No phone uploads here: an album link, a zip by email, or "later by email" (I send a welcome email, they reply with the link)
  if (order.picks) { var pl = $('pdPicksLine'); if (pl) pl.hidden = false; }
  var f = $('pdForm'), err = $('pdErr');
  function send(later) {
    var album = f.album.value.trim(), found = f.querySelector('[name=found]:checked'), who = f.querySelector('[name=who]:checked');
    if (!later && !/^https?:\/\/\S+\.\S+/i.test(album)) { err.textContent = album ? 'That link doesn\'t look right. Copy it again, or tap "I\'ll send my photos later by email".' : 'Paste your album link, or tap "I\'ll send my photos later by email".'; err.hidden = false; f.album.focus(); return; }
    if (!found) { err.textContent = 'One more thing: how did you find me?'; err.hidden = false; $('pdFound').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    err.hidden = true;
    var btn = later ? $('pdLater') : $('pdDone'); btn.disabled = true; btn.textContent = 'Sending…';
    O.post({ action: 'done', id: id, email: email, who: who ? who.value : '', title: f.title.value, notes: f.notes.value, photos_link: later ? '' : album, photos_later: later ? 1 : 0, found: found.value, photos_count: 0 })
      .catch(function () {})
      .then(function () {
        if (window.ym) ym(114414250, 'reachGoal', later ? 'photos_later' : 'photos_sent'); try { if (window.clarity) clarity('event', later ? 'photos_later' : 'photos_sent'); } catch (x) {}
        if (later) {
          $('pdThanksH').textContent = 'Perfect, no rush.';
          $('pdThanksP').innerHTML = 'Check your inbox, there\'s an email from me. Just reply to it with a link to your album, or attach a zip. Your first draft comes within 48&nbsp;hours or&nbsp;less after that.';
        }
        $('pdMain').hidden = true; $('pdThanks').hidden = false; window.scrollTo(0, 0);
      });
  }
  f.addEventListener('submit', function (e) { e.preventDefault(); send(false); });
  $('pdLater').addEventListener('click', function () { send(true); });
})();
