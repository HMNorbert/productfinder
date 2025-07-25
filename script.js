const cikkszamInput = document.getElementById("cikkszam");
const eredmenyDiv = document.getElementById("eredmeny");

cikkszamInput.addEventListener("input", () => {
  const keresett = cikkszamInput.value.trim().toLowerCase();
  eredmenyDiv.innerHTML = "";

  if (!keresett) return;

  const talalatok = [];

  for (const [cikkszam, adat] of Object.entries(adatbazis)) {
    if (cikkszam.toLowerCase().includes(keresett)) {
      talalatok.push(`<li><strong>${cikkszam}</strong>: ${adat.termek}</li>`);
    }
  }

  if (talalatok.length > 0) {
    eredmenyDiv.innerHTML = `<ul>${talalatok.join("")}</ul>`;
  } else {
    eredmenyDiv.innerText = "Nem található termék ezzel a cikkszám részlettel.";
  }
});
