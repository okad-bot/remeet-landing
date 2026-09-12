const btn = document.querySelector('.menu-btn');
const menu = document.querySelector('.menu');
btn?.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? '×' : '☰';
});
menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  menu.classList.remove('open');
  btn?.setAttribute('aria-expanded','false');
  if(btn) btn.textContent = '☰';
}));

const form = document.getElementById('bookForm');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  const origText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;

  try {
    const resp = await fetch('https://formsubmit.co/ajax/hello@remeet.cc', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
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
