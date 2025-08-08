const cikkszamInput = document.getElementById("cikkszam");
const tablaBody = document.getElementById("tabla-body");

cikkszamInput.addEventListener("input", () => {
  const keresett = cikkszamInput.value.trim().toLowerCase();
  tablaBody.innerHTML = "";

  if (!keresett) return;

  let talalatok = 0;

  for (const [cikkszam, adat] of Object.entries(adatbazis)) {
    if (cikkszam.toLowerCase().includes(keresett)) {
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
    uzenet.textContent = "Nem található termék ezzel a cikkszám részlettel.";
    sor.appendChild(uzenet);
    tablaBody.appendChild(sor);
  }
});
