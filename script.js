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

const eanInput = document.getElementById("ean");
const scanBtn = document.getElementById("scan-btn");
const openLinkBtn = document.getElementById("open-link-btn");
const eanStatus = document.getElementById("ean-status");
const scannerEl = document.getElementById("scanner");

let eanMap = new Map();
let scanning = false;

fetch("ean_adatbazis.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : {}))
  .then((obj) => {
    if (Array.isArray(obj)) {
      const tmp = {};
      for (const item of obj) {
        if (item && item.ean && item.cikkszam) {
          tmp[item.ean] = { cikkszam: item.cikkszam, url: item.url || "" };
        }
      }
      obj = tmp;
    }
    eanMap = new Map(Object.entries(obj || {}));
  })
  .catch(() => {
    eanMap = new Map();
  });

function handleEan(eanCode) {
  const code = (eanCode || "").replace(/\D/g, "");
  if (!code) {
    eanStatus.textContent = "";
    openLinkBtn.disabled = true;
    openLinkBtn.dataset.href = "";
    return;
  }

  const found = eanMap.get(code);
  if (!found) {
    eanStatus.textContent = "Érvénytelen vagy ismeretlen EAN.";
    openLinkBtn.disabled = true;
    openLinkBtn.dataset.href = "";
    return;
  }

  const { cikkszam, url } = found;
  const nev =
    adatbazis[cikkszam] && adatbazis[cikkszam].termek
      ? " – " + adatbazis[cikkszam].termek
      : "";
  eanStatus.textContent = `Találat: ${cikkszam}${nev}`;

  cikkszamInput.value = cikkszam;
  termeknevInput.value = "";
  keresCikkszamSzerint();

  if (url) {
    openLinkBtn.disabled = false;
    openLinkBtn.dataset.href = url;
  } else {
    openLinkBtn.disabled = true;
    openLinkBtn.dataset.href = "";
  }
}

if (eanInput) {
  eanInput.addEventListener("input", () => handleEan(eanInput.value));
}

if (openLinkBtn) {
  openLinkBtn.addEventListener("click", () => {
    const href = openLinkBtn.dataset.href;
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  });
}

function startScan() {
  if (scanning) return;
  if (!window.Quagga) {
    alert("A vonalkód olvasó könyvtár nem töltődött be.");
    return;
  }
  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerEl,
        constraints: { facingMode: "environment" }
      },
      decoder: { readers: ["ean_reader", "code_128_reader"] },
      locate: true
    },
    (err) => {
      if (err) {
        alert("Kamera hiba: " + err);
        return;
      }
      scannerEl.style.display = "block";
      Quagga.start();
      scanning = true;
    }
  );
}

function stopScan() {
  if (!scanning) return;
  Quagga.stop();
  scannerEl.style.display = "none";
  scanning = false;
}

if (window.Quagga) {
  Quagga.onDetected(({ codeResult }) => {
    const code = (codeResult && codeResult.code) || "";
    if (!code) return;
    if (eanInput) eanInput.value = code;
    handleEan(code);
    stopScan();
  });
}

if (scanBtn) {
  scanBtn.addEventListener("click", () => (scanning ? stopScan() : startScan()));
}
