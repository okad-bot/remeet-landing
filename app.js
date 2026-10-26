const carousel = document.querySelector('.social-carousel');
if (carousel) {
  const second = carousel.children[1];
  if (second) carousel.scrollLeft = second.offsetLeft - carousel.offsetLeft - 20;
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
  '30': 'https://buy.stripe.com/14A4gzcns28d3CL3F58k80H',
  '60': 'https://buy.stripe.com/5kQ7sLevA8wB6OXejJ8k80I',
  '90': 'https://buy.stripe.com/4gMbJ1bjodQV2yH8Zp8k80J'
};
const PRICES = {'30': 29, '60': 59, '90': 89};

const form = document.getElementById('bookForm');
const payBtn = document.getElementById('payBtn');
const pageOptions = document.querySelectorAll('.page-option');

pageOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    pageOptions.forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    const val = opt.querySelector('input').value;
    if (payBtn) payBtn.innerHTML = 'Pay $' + PRICES[val] + ' &rarr;';
  });
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const pages = data.pages || '30';
  const stripeUrl = STRIPE_LINKS[pages];

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
