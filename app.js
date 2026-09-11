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
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  form.hidden = true;
  document.querySelector('.success').hidden = false;
  document.querySelector('.form-section').scrollIntoView({behavior:'smooth'});
});
