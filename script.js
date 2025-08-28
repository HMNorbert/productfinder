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
  .catch(() => { eanMap = new Map(); });

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
        constraints: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          advanced: [{ focusMode: "continuous" }]
        },
        area: { top: "25%", right: "25%", left: "25%", bottom: "25%" }
      },
      decoder: {
        readers: ["ean_reader"]
      },
      locator: { patchSize: "large", halfSample: true },
      locate: true,
      numOfWorkers: navigator.hardwareConcurrency || 2
    },
    (err) => {
      if (err) {
        alert("Kamera hiba: " + err);
        return;
      }
      scannerEl.style.display = "block";
      Quagga.start();
      scanning = true;

      // ROI doboz kirakása (egyszer)
      if (!scannerEl.querySelector(".scan-roi")) {
        const roi = document.createElement("div");
        roi.className = "scan-roi";
        scannerEl.appendChild(roi);
      }

      setTimeout(() => {
        const video = scannerEl.querySelector("video");
        if (video) {
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          video.muted = true;
          video.autoplay = true;
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";
        }
        const canvas = scannerEl.querySelector("canvas");
        if (canvas) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
        }
      }, 0);
    }
  );
}

function stopScan() {
  if (!scanning) return;
  Quagga.stop();
  scannerEl.style.display = "none";
  scanning = false;
}

const STABLE_HITS = 3;
let recentHits = [];

function isValidEAN13(str) {
  const s = (str || "").replace(/\D/g, "");
  if (s.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = s.charCodeAt(i) - 48;
    sum += (i % 2 === 0) ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === (s.charCodeAt(12) - 48);
}

if (window.Quagga) {
  Quagga.onDetected(({ codeResult }) => {
    const raw = (codeResult && codeResult.code) || "";
    const digits = raw.replace(/\D/g, "");
    if (!isValidEAN13(digits)) return;

    recentHits.push(digits);
    if (recentHits.length > STABLE_HITS) recentHits.shift();
    const stable =
      recentHits.length === STABLE_HITS &&
      recentHits.every((v) => v === digits);

    if (!stable) return;

    if (eanInput) eanInput.value = digits;
    handleEan(digits);
    recentHits = [];
    stopScan();
  });
}


if (scanBtn) {
  scanBtn.addEventListener("click", () => (scanning ? stopScan() : startScan()));
}
