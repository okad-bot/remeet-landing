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

// Order form: prices and Stripe links live in /order.js (shared with /proof)
const form = document.getElementById('bookForm');
const payBtn = document.getElementById('payBtn');
const pageOptions = document.querySelectorAll('.page-option');
const picksAddon = document.getElementById('picksAddon');
const ORDER = window.REMEET_ORDER;

const currentFormat = () => form?.querySelector('input[name="format"]:checked')?.value || 'hardcover';
const updateTotal = () => {
  if (!payBtn || !ORDER) return;
  payBtn.innerHTML = 'Pay $' + ORDER.total(currentFormat(), !!picksAddon?.checked) + ' &rarr;';
};

pageOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    pageOptions.forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input').checked = true;
    updateTotal();
  });
});
picksAddon?.addEventListener('change', updateTotal);

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  payBtn.textContent = 'Redirecting...';
  payBtn.disabled = true;
  try {
    await fetch('https://okad.cc/api/remeet-form/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
  } catch {}
  const went = ORDER.checkout({ id: ORDER.newId(), email: data.email || '', format: currentFormat(), picks: !!picksAddon?.checked, style: '' });
  if (!went) { payBtn.hidden = true; const fb = document.getElementById('payFallback'); if (fb) fb.hidden = false; }
});
window.addEventListener('pageshow', e => { if (e.persisted && payBtn) { payBtn.disabled = false; updateTotal(); } });
updateTotal();

const sticky = document.querySelector('.sticky-cta');
const heroEl = document.querySelector('.hero');
const formEl = document.getElementById('start');
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
