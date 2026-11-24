const carousel = document.querySelector('.social-carousel');
if (carousel) {
  const second = carousel.children[1];
  if (second && window.innerWidth < 900) carousel.scrollLeft = second.offsetLeft - carousel.offsetLeft - 20;
}

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, {threshold: .08});

document.querySelectorAll('.story-step, .spread-feature, .use-case-grid article').forEach(el => {
  el.classList.add('reveal');
  observer.observe(el);
});

// Order form: one block, prices and Stripe links live in /order.js (shared with /first_page)
const form = document.getElementById('bookForm');
const payBtn = document.getElementById('payBtn');
const ORDER = window.REMEET_ORDER;
const picks = document.getElementById('o2picks');
const copiesRow = document.getElementById('o2copies');
const copiesEl = document.getElementById('o2n');
const covers = document.querySelector('.o2-covers');
const currentFormat = () => form?.querySelector('input[name="format"]:checked')?.value || 'small';
const copies = () => ['pdf', 'small'].includes(currentFormat()) ? 1 : Number(copiesEl?.textContent || 1);
const updateTotal = () => {
  if (!form || !ORDER) return;
  const f = currentFormat(), printed = !['pdf', 'small'].includes(f);
  if (copiesRow) copiesRow.style.display = printed ? 'flex' : 'none';
  if (covers) covers.style.display = f === 'hardcover' ? 'grid' : 'none';
  form.querySelectorAll('.o2-opt').forEach(l => l.classList.toggle('sel', l.querySelector('input').checked));
  const total = ORDER.total(f);
  payBtn.innerHTML = 'Pay $' + total + ' &rarr;';
};
form?.addEventListener('change', updateTotal);
form?.querySelectorAll('.o2-step button').forEach(b => b.addEventListener('click', () => {
  copiesEl.textContent = Math.max(1, Math.min(10, Number(copiesEl.textContent) + Number(b.dataset.d)));
  updateTotal();
}));
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.copies = copies(); data.picks = !!picks?.checked;
  payBtn.textContent = 'Redirecting...';
  payBtn.disabled = true;
  try {
    await fetch('https://okad.cc/api/remeet-form/submit', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    });
  } catch {}
  const went = ORDER.checkout({ id: ORDER.newId(), email: data.email || '', format: currentFormat(), picks: data.picks, copies: data.copies, style: '' });
  if (!went) { payBtn.hidden = true; const fb = document.getElementById('payFallback'); if (fb) fb.hidden = false; }
});
window.addEventListener('pageshow', e => { if (e.persisted && payBtn) { payBtn.disabled = false; updateTotal(); } });
updateTotal();

// Footer: sections open on desktop, folded on phones
if (window.innerWidth > 700) document.querySelectorAll('details.footer-col').forEach(d => { d.open = true; });

// Upload right on the homepage: keep the files and continue on /first_page
const upInput = document.getElementById('upFiles');
upInput?.addEventListener('change', () => {
  const files = Array.from(upInput.files || []).filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)).slice(0, 10);
  if (!files.length) return;
  const slots = document.querySelectorAll('#upSlots .up-slot');
  slots.forEach((sl, i) => {
    sl.querySelector('img')?.remove();
    if (files[i]) { const im = document.createElement('img'); im.alt = ''; im.src = URL.createObjectURL(files[i]); sl.appendChild(im); }
  });
  if (window.fbq) fbq('trackCustom', 'UploadStarted', { content_name: 'home' });
  const go = () => { location.href = '/proof/?from=home#s2'; };
  const note = document.getElementById('upNote'); if (note) note.textContent = 'Opening your preview…';
  try {
    const req = indexedDB.open('remeet', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handoff');
    req.onsuccess = () => {
      const tx = req.result.transaction('handoff', 'readwrite');
      tx.objectStore('handoff').put(files.map(f => ({ name: f.name, type: f.type, blob: f })), 'files');
      tx.oncomplete = () => setTimeout(go, 700);
      tx.onerror = go;
    };
    req.onerror = go;
  } catch (e) { go(); }
});

const sticky = document.querySelector('.sticky-cta');
const heroEl = document.querySelector('.hero');
const formEl = document.getElementById('pricing');
if (sticky && heroEl && formEl) {
  let pastHero = false, atForm = false;
  const update = () => sticky.classList.toggle('show', pastHero && !atForm);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); }).observe(heroEl);
  new IntersectionObserver(([e]) => { atForm = e.isIntersecting; update(); }).observe(formEl);
}

// Pricing table buttons and gift block: preselect the form
document.querySelectorAll('[data-pick-format]').forEach(btn => {
  btn.addEventListener('click', () => {
    const opt = document.querySelector('.page-option input[value="' + btn.getAttribute('data-pick-format') + '"]');
    if (opt) opt.closest('.page-option').click();
  });
});
document.querySelectorAll('[data-pick-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    const sel = document.querySelector('#bookForm select[name="type"]');
    if (sel) sel.value = btn.getAttribute('data-pick-type');
  });
});

// Review cards: tap to show the quote on the photo
document.querySelectorAll('.rv-card.rv-has').forEach(c => {
  const pill = c.querySelector('.rv-pill'), hit = c.querySelector('.rv-hit');
  hit?.addEventListener('click', () => {
    const open = c.classList.toggle('open');
    if (pill) pill.textContent = open ? '✕' : 'Review';
    hit.setAttribute('aria-label', open ? 'Hide review' : 'Show review');
  });
});
