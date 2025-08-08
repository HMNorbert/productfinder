const input = document.getElementById("cikkszam");
const clearBtn = document.getElementById("clearBtn");
const tbody = document.getElementById("tabla-body");

input.value = localStorage.getItem("q") || "";
setTimeout(() => input?.focus?.({ preventScroll: true }), 150);

const debounce = (fn, ms=120) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

function highlight(text, query){
  if (!query) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const match  = escapeHtml(text.slice(idx, idx + query.length));
  const after  = escapeHtml(text.slice(idx + query.length));
  return `${before}<mark>${match}</mark>${after}`;
}
function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#039;'}[m]));
}

function renderRows(rows, q){
  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();

  rows.forEach(({ cikkszam, termek }) => {
    const tr = document.createElement("tr");
    tr.className = "fade-in-up";

    const tdCode = document.createElement("td");
    tdCode.innerHTML = highlight(cikkszam, q);

    const tdName = document.createElement("td");
    tdName.textContent = termek;

    tr.append(tdCode, tdName);
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

function doSearch(){
  const q = input.value.trim();
  localStorage.setItem("q", q);
  tbody.innerHTML = "";

  if (!q || typeof adatbazis !== "object") return;

  const rows = [];
  for (const [code, adat] of Object.entries(adatbazis)){
    if (code.toLowerCase().includes(q.toLowerCase())){
      rows.push({ cikkszam: code, termek: String(adat.termek ?? "") });
    }
  }

  if (rows.length > 0) renderRows(rows, q);
}

const onInput = debounce(doSearch, 80);
input.addEventListener("input", onInput);
clearBtn.addEventListener("click", () => { input.value = ""; input.focus(); doSearch(); });

doSearch();
