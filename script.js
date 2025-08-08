// Egyszerű, mobilbarát kereső régi Safarira is
var input = document.getElementById("cikkszam");
var clearBtn = document.getElementById("clearBtn");
var tbody = document.getElementById("tabla-body");

// localStorage olvasás biztonságosan
try {
  input.value = window.localStorage ? (localStorage.getItem("q") || "") : "";
} catch (e) {
  input.value = "";
}

// Fókusz (ha támogatott)
setTimeout(function(){ try { if (input && input.focus) input.focus(); } catch(e){} }, 150);

// Debounce ES5
function debounce(fn, ms){
  var t;
  return function(){
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function(){ fn.apply(null, args); }, ms);
  };
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#039;'}[m];
  });
}

function highlight(text, query){
  if (!query) return escapeHtml(text);
  var lower = String(text).toLowerCase();
  var q = String(query).toLowerCase();
  var idx = lower.indexOf(q);
  if (idx === -1) return escapeHtml(text);
  var before = escapeHtml(text.slice(0, idx));
  var match  = escapeHtml(text.slice(idx, idx + query.length));
  var after  = escapeHtml(text.slice(idx + query.length));
  return before + "<mark>" + match + "</mark>" + after;
}

function renderRows(rows, q){
  tbody.innerHTML = "";
  var frag = document.createDocumentFragment();

  for (var i=0; i<rows.length; i++){
    var r = rows[i];
    var tr = document.createElement("tr");
    tr.className = "fade-in-up";

    var tdCode = document.createElement("td");
    tdCode.innerHTML = highlight(r.cikkszam, q);

    var tdName = document.createElement("td");
    tdName.textContent = r.termek;

    tr.appendChild(tdCode);
    tr.appendChild(tdName);
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
}

function doSearch(){
  var q = (input.value || "").trim();

  // localStorage írás biztonságosan
  try { if (window.localStorage) localStorage.setItem("q", q); } catch(e){}

  tbody.innerHTML = "";

  // Üres bevitelnél ne mutassunk semmit
  if (!q) return;

  // adatbazis globálé ellenőrzése
  if (typeof window.adatbazis !== "object" || !window.adatbazis){
    // Ha ide ér, valószínű rossz betöltési sorrend vagy 404 az adatbazis.js
    return;
  }

  var rows = [];
  var code, adat, name;
  for (code in window.adatbazis){
    if (!window.adatbazis.hasOwnProperty(code)) continue;
    if (String(code).toLowerCase().indexOf(q.toLowerCase()) !== -1){
      adat = window.adatbazis[code] || {};
      name = (typeof adat.termek === "string") ? adat.termek : String(adat.termek || "");
      rows.push({ cikkszam: code, termek: name });
    }
  }

  if (rows.length > 0){
    renderRows(rows, q);
  } // külön üres állapot nincs, ahogy kérted
}

var onInput = debounce(doSearch, 120);
input.addEventListener("input", onInput, false);
clearBtn.addEventListener("click", function(){
  input.value = "";
  try { if (window.localStorage) localStorage.setItem("q", ""); } catch(e){}
  if (input && input.focus) input.focus();
  doSearch();
}, false);

// Induló keresés az előző értékkel
doSearch();
