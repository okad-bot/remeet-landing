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
  '30': 'https://buy.stripe.com/28EeVdbjo8wB8X5dfF8k80K',
  '100': 'https://buy.stripe.com/cNi28rfzE0057T1grR8k80L'
};
const PRICES = {'30': 29, '100': 79};

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
