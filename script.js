const cikkszamInput = document.getElementById("cikkszam");
const termeknevInput = document.getElementById("termeknev");
const tablaBody = document.getElementById("tabla-body");

const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function renderTalalatok(filterFn, uzenetHaUres) {
  tablaBody.innerHTML = "";
  let talalatok = 0;

  for (const [cikkszam, adat] of Object.entries(adatbazis)) {
    if (filterFn(cikkszam, adat)) {
      const sor = document.createElement("tr");
      const cellaCikkszam = document.createElement("td");
      const cellaNev = document.createElement("td");

      cellaCikkszam.textContent = cikkszam;
      cellaNev.textContent = adat.termek;

      sor.appendChild(cellaCikkszam);
      sor.appendChild(cellaNev);
      tablaBody.appendChild(sor);
      talalatok++;
    }
  }

  if (talalatok === 0) {
    const sor = document.createElement("tr");
    const uzenet = document.createElement("td");
    uzenet.colSpan = 2;
    uzenet.textContent = uzenetHaUres;
    sor.appendChild(uzenet);
    tablaBody.appendChild(sor);
  }
}

function frissitTiltast() {
  const vanCikkszam = cikkszamInput.value.trim().length > 0;
  const vanNev = termeknevInput.value.trim().length > 0;

  if (vanCikkszam) {
    termeknevInput.value = "";
    termeknevInput.disabled = true;
  } else {
    termeknevInput.disabled = false;
  }

  if (vanNev) {
    cikkszamInput.value = "";
    cikkszamInput.disabled = true;
  } else {
    cikkszamInput.disabled = false;
  }

  if (!vanCikkszam && !vanNev) {
    tablaBody.innerHTML = "";
  }
}

function keresCikkszamSzerint() {
  const q = norm(cikkszamInput.value.trim());
  frissitTiltast();
  if (!q) return;
  renderTalalatok(
    (cikkszam) => norm(cikkszam).includes(q),
    "Nem található termék ezzel a cikkszám-részlettel."
  );
}

function keresNevSzerint() {
  const q = norm(termeknevInput.value.trim());
  frissitTiltast();
  if (!q) return;
  renderTalalatok(
    (_, adat) => norm(adat.termek).includes(q),
    "Nem található termék ezzel a névrészlettel."
  );
}

cikkszamInput.addEventListener("input", keresCikkszamSzerint);
termeknevInput.addEventListener("input", keresNevSzerint);

frissitTiltast();
