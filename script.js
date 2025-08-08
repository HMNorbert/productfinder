const themeBtn = document.getElementById('themeBtn');
const saved = localStorage.getItem('theme');
if (saved === 'dark' || (saved == null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.body.classList.add('dark');
  themeBtn.setAttribute('aria-pressed', 'true');
}
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeBtn.setAttribute('aria-pressed', String(isDark));
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

const cikkszamInput = document.getElementById('cikkszam');
const tablaBody = document.getElementById('tabla-body');
const clearBtn = document.getElementById('clearBtn');
const counter = document.getElementById('counter');

function debounce(fn, delay = 120) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), delay); };
}

function highlight(text, query) {
  if (!query) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(esc, 'gi'), (m) => `<mark>${m}</mark>`);
}

function setEmpty(message) {
  tablaBody.innerHTML = `<tr class="empty"><td colspan="2">${message}</td></tr>`;
}

function updateCounter(n) {
  counter.textContent = `${n} találat`;
}

const runSearch = debounce(() => {
  const q = cikkszamInput.value.trim();
  tablaBody.innerHTML = '';
  if (q.length < 2) { setEmpty('Kezdésként írj be legalább 2 karaktert ⌨️'); updateCounter(0); return; }

  const qLower = q.toLowerCase();
  let count = 0;

  for (const [cikkszam, adat] of Object.entries(window.adatbazis || {})) {
    if (String(cikkszam).toLowerCase().includes(qLower)) {
      const tr = document.createElement('tr');
      const tdC = document.createElement('td');
      const tdN = document.createElement('td');
      tdC.innerHTML = highlight(cikkszam, q);
      tdN.innerHTML = highlight(adat.termek || '', q);
      tr.appendChild(tdC); tr.appendChild(tdN);
      tablaBody.appendChild(tr);
      count++;
    }
  }

  if (count === 0) { setEmpty('Nincs találat erre a részletre 🤷'); }
  updateCounter(count);
}, 120);

cikkszamInput.addEventListener('input', runSearch);

clearBtn.addEventListener('click', () => {
  cikkszamInput.value = '';
  cikkszamInput.focus();
  setEmpty('Kezdésként írj be legalább 2 karaktert ⌨️');
  updateCounter(0);
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => cikkszamInput.focus({ preventScroll: true }), 100);
});
