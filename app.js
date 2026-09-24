const carousel = document.querySelector('.social-carousel');
if (carousel) {
  const second = carousel.children[1];
  if (second) carousel.scrollLeft = second.offsetLeft - carousel.offsetLeft - 20;
}

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const topbar = document.querySelector('.topbar');

if (topbar && window.matchMedia('(max-width:900px)').matches) {
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 80) topbar.classList.add('scrolled');
    else { topbar.classList.remove('scrolled'); nav?.classList.remove('open'); }
    lastY = y;
  }, {passive: true});
}

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

const form = document.getElementById('bookForm');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  const origText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;

  try {
    const resp = await fetch('https://okad.cc/api/remeet-form/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    if (resp.ok) {
      form.hidden = true;
      document.querySelector('.success').hidden = false;
      document.querySelector('.form-section').scrollIntoView({behavior:'smooth'});
    } else { throw new Error(); }
  } catch {
    submitBtn.textContent = origText;
    submitBtn.disabled = false;
    alert('Something went wrong. Please try again or email hello@remeet.cc');
  }
});
