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

const STRIPE_LINKS = {
  '30': 'https://buy.stripe.com/28EeVdbjo8wB8X5dfF8k80K',
  '100': 'https://buy.stripe.com/cNi28rfzE0057T1grR8k80L',
  '30v': 'https://buy.stripe.com/3cIbJ11IOeUZb5dcbB8k80N',
  '100v': 'https://buy.stripe.com/cNi6oH5Z4005b5da3t8k80O'
};
const PRICES = {'30': 29, '100': 79};
const VIDEO_ADDON = 50;

const form = document.getElementById('bookForm');
const payBtn = document.getElementById('payBtn');
const pageOptions = document.querySelectorAll('.page-option');
const videoAddon = document.getElementById('videoAddon');

const currentPages = () => form?.querySelector('input[name="pages"]:checked')?.value || '100';
const updateTotal = () => {
  if (!payBtn) return;
  const total = PRICES[currentPages()] + (videoAddon?.checked ? VIDEO_ADDON : 0);
  payBtn.innerHTML = 'Pay $' + total + ' &rarr;';
};

pageOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    pageOptions.forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input').checked = true;
    updateTotal();
  });
});
videoAddon?.addEventListener('change', updateTotal);

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const pages = data.pages || '100';
  const withVideo = !!videoAddon?.checked;
  const stripeUrl = withVideo ? STRIPE_LINKS[pages + 'v'] : STRIPE_LINKS[pages];

  const total = PRICES[pages] + (withVideo ? VIDEO_ADDON : 0);
  try { localStorage.setItem('remeet_order_total', String(total)); } catch (e) {}
  if (window.fbq) fbq('track', 'InitiateCheckout', {value: total, currency: 'USD'});

  payBtn.textContent = 'Redirecting...';
  payBtn.disabled = true;

  try {
    await fetch('https://okad.cc/api/remeet-form/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
  } catch {}

  window.location.href = stripeUrl;
});

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
document.querySelectorAll('[data-pick-pages]').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.getAttribute('data-pick-pages');
    const opt = document.querySelector('.page-option input[value="' + v + '"]');
    if (opt) opt.closest('.page-option').click();
  });
});
document.querySelectorAll('[data-pick-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    const sel = document.querySelector('#bookForm select[name="type"]');
    if (sel) sel.value = btn.getAttribute('data-pick-type');
  });
});

// Send photos now / later
const linkField = document.querySelector('.photos-link-field');
document.querySelectorAll('input[name="photos_when"]').forEach(r => r.addEventListener('change', () => {
  const now = document.querySelector('input[name="photos_when"]:checked')?.value === 'now';
  if (linkField) { linkField.hidden = !now; if (now) linkField.querySelector('input')?.focus(); }
  const hint = document.querySelector('.pay-now-hint');
  if (hint) hint.hidden = now;
}));
