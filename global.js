console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/HitarthSS', title: 'GitHub' },
];

const BASE_PATH = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? '/'
  : '/DSC106-Portfolio/';

const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`,
);

const select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

select.addEventListener('input', function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

const form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
  event.preventDefault();

  const data = new FormData(form);
  const parameters = [];

  for (let [name, value] of data) {
    parameters.push(`${name}=${encodeURIComponent(value)}`);
  }

  location.href = `${form.action}?${parameters.join('&')}`;
});

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  if (a.host !== location.host) {
    a.target = '_blank';
  }
}
