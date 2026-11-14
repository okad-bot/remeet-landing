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
  '100': 'https://buy.stripe.com/cNi28rfzE0057T1grR8k80L',
  // TODO: create Stripe payment links for the video add-on bundles and paste them here
  '30v': '',   // $79 = 30 pages + video frames
  '100v': ''   // $129 = 100 pages + video frames
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
  // If the bundle link isn't set yet, charge the base price; the add-on is invoiced separately (data.video_frames = 'yes')
  const stripeUrl = (withVideo && STRIPE_LINKS[pages + 'v']) || STRIPE_LINKS[pages];

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
