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
    try {
      if (!filterFn(cikkszam, adat)) continue;

      const sor = document.createElement("tr");
      const cellaCikkszam = document.createElement("td");
      const cellaNev = document.createElement("td");

      cellaCikkszam.textContent = cikkszam;
      cellaNev.textContent = adat.termek;

      sor.appendChild(cellaCikkszam);
      sor.appendChild(cellaNev);
      tablaBody.appendChild(sor);
      talalatok++;
    } catch { }
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
  const vanTermekNev = termeknevInput.value.trim().length > 0;
  if (vanCikkszam) termeknevInput.value = "";
  if (vanTermekNev) cikkszamInput.value = "";
}

cikkszamInput.addEventListener("input", keresCikkszamSzerint);
termeknevInput.addEventListener("input", keresNevSzerint);
frissitTiltast();

const eanInput = document.getElementById("ean");
const scanBtn = document.getElementById("scan-btn");
const openLinkBtn = document.getElementById("open-link-btn");
const eanStatus = document.getElementById("ean-status");
const scannerEl = document.getElementById("scanner");

const camControls = document.getElementById("cam-controls");
const zoomSlider = document.getElementById("zoom-slider");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const refocusBtn = document.getElementById("refocus-btn");
const torchBtn = document.getElementById("torch-btn");
const exposureSlider = document.getElementById("exposure-slider");

let eanMap = new Map();
let scanning = false;
let activeTrack = null;
let videoElRef = null;

let zoomSupported = false;
let torchSupported = false;
let focusModes = [];
let exposureKind = null;
let torchOn = false;
let uiBound = false;

function buildEanMap(obj) {
  const m = new Map();
  if (!obj) return m;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (!item) continue;
      if (Array.isArray(item)) {
        const [ean, url] = item;
        if (ean && url) m.set(String(ean), String(url));
      } else if (typeof item === "object") {
        const e = item.ean || item.EAN || item.kod || item.code;
        const u = item.url || item.link || item.href;
        if (e && u) m.set(String(e), String(u));
      }
    }
    return m;
  }

  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === "object") {
        const u = v.url || v.link || v.href;
        if (u) m.set(String(k), String(u));
      } else if (typeof v === "string") {
        m.set(String(k), v);
      }
    }
  }
  return m;
}

function normalizeProductUrl(raw) {
  if (!raw) return "";
  let s = String(raw).trim();

  if (!/^https?:\/\//i.test(s)) {
    if (s.startsWith("/")) s = "https://www.meleget.hu" + s;
    else s = "https://www.meleget.hu/" + s;
  }

  try {
    const u = new URL(s);
    if (
      !u.pathname.endsWith("/") &&
      !u.pathname.includes(".") &&
      !u.search &&
      !u.hash
    ) {
      u.pathname += "/";
    }
    return u.toString();
  } catch {
    return encodeURI(s);
  }
}

fetch("ean_adatbazis.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : {}))
  .then((obj) => { eanMap = buildEanMap(obj); })
  .catch(() => { });

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

function setEanStatus(cls, text) {
  eanStatus.className = cls;
  eanStatus.textContent = text || "";
}

function handleEan(raw) {
  const ean = (raw || "").replace(/\D/g, "");
  if (ean.length !== 13) {
    setEanStatus("err", "Az EAN-13 pontosan 13 számjegy.");
    openLinkBtn.disabled = true;
    openLinkBtn.dataset.href = "";
    return;
  }
  if (!isValidEAN13(ean)) {
    setEanStatus("err", "Érvénytelen EAN-13 (ellenőrzőszám hibás).");
    openLinkBtn.disabled = true;
    openLinkBtn.dataset.href = "";
    return;
  }

  const rawUrl = eanMap.get(ean);
  const href = normalizeProductUrl(rawUrl || "");

  if (rawUrl && /^https?:\/\//i.test(href)) {
    setEanStatus("ok", "Találat! A link megnyitható.");
    openLinkBtn.disabled = false;
    openLinkBtn.dataset.href = href;
  } else if (rawUrl) {
    setEanStatus("warn", "Link formátum hibás az adatbázisban ehhez az EAN-hoz.");
    openLinkBtn.disabled = true;
    openLinkBtn.dataset.href = "";
  } else {
    setEanStatus("warn", "Nincs hivatkozás ehhez az EAN-hoz az adatbázisban.");
    openLinkBtn.disabled = true;
    openLinkBtn.dataset.href = "";
  }
}

if (eanInput) eanInput.addEventListener("input", (e) => handleEan(e.target.value));

if (openLinkBtn) {
  openLinkBtn.addEventListener("click", () => {
    const href = openLinkBtn.dataset.href;
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  });
}

function setCamControlsActive(active) {
  if (!camControls) return;
  camControls.classList.toggle("active", !!active);
}

function applyZoom(val) {
  if (!activeTrack) return;
  activeTrack.applyConstraints({ advanced: [{ zoom: val }] }).catch(() => { });
}

function applyExposure(val) {
  if (!activeTrack) {
    if (exposureKind === "css" && videoElRef) videoElRef.style.filter = `brightness(${val})`;
    return;
  }
  if (exposureKind === "exposureCompensation") {
    activeTrack.applyConstraints({ advanced: [{ exposureCompensation: val }] }).catch(() => { });
  } else if (exposureKind === "brightness") {
    activeTrack.applyConstraints({ advanced: [{ brightness: val }] }).catch(() => { });
  } else if (exposureKind === "css" && videoElRef) {
    videoElRef.style.filter = `brightness(${val})`;
  }
}

function refocusNow() {
  if (!activeTrack) return;
  try {
    const caps = activeTrack.getCapabilities ? activeTrack.getCapabilities() : {};
    const fm = Array.isArray(caps.focusMode) ? caps.focusMode : (caps.focusMode ? [caps.focusMode] : []);
    const prefer = fm.includes("continuous") ? "continuous" : (fm.includes("auto") ? "auto" : null);
    if (prefer) activeTrack.applyConstraints({ advanced: [{ focusMode: prefer }] }).catch(() => { });
  } catch { }
}

function toggleTorch() {
  if (!activeTrack || !torchSupported) return;
  torchOn = !torchOn;
  activeTrack.applyConstraints({ advanced: [{ torch: torchOn }] }).catch(() => { });
  if (torchBtn) torchBtn.textContent = torchOn ? "Fény KI" : "Fény";
}

function ensureUIBound() {
  if (uiBound) return;

  if (zoomSlider) zoomSlider.addEventListener("input", () => applyZoom(Number(zoomSlider.value)));
  if (zoomInBtn) zoomInBtn.addEventListener("click", () => {
    const v = Math.min(Number(zoomSlider.value) + Number(zoomSlider.step || 0.1), Number(zoomSlider.max || 1));
    zoomSlider.value = String(v); applyZoom(v);
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => {
    const v = Math.max(Number(zoomSlider.value) - Number(zoomSlider.step || 0.1), Number(zoomSlider.min || 1));
    zoomSlider.value = String(v); applyZoom(v);
  });
  if (refocusBtn) refocusBtn.addEventListener("click", refocusNow);
  if (torchBtn) torchBtn.addEventListener("click", toggleTorch);
  if (exposureSlider) exposureSlider.addEventListener("input", () => applyExposure(Number(exposureSlider.value)));

  let startDist = 0, startZoom = 1;
  const dist = (t0, t1) => Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
  scannerEl.addEventListener("touchstart", (e) => {
    if (zoomSupported && e.touches.length === 2) {
      startDist = dist(e.touches[0], e.touches[1]);
      startZoom = Number(zoomSlider.value || 1);
    }
  }, { passive: true });
  scannerEl.addEventListener("touchmove", (e) => {
    if (zoomSupported && e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      const delta = (d - startDist) / 200;
      const v = Math.max(Number(zoomSlider.min || 1), Math.min(Number(zoomSlider.max || 1), startZoom + delta));
      zoomSlider.value = String(v); applyZoom(v);
    }
  }, { passive: true });

  scannerEl.addEventListener("click", refocusNow);

  uiBound = true;
}

function startScan() {
  if (scanning) return;
  if (!window.Quagga) { alert("A vonalkód olvasó könyvtár nem töltődött be."); return; }

  Quagga.init(
    {
      inputStream: {
        name: "Live", type: "LiveStream", target: scannerEl,
        constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: "continuous" }] },
        area: { top: "25%", right: "25%", left: "25%", bottom: "25%" }
      },
      decoder: { readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader", "upc_e_reader"] },
      locator: { patchSize: "large", halfSample: true }, locate: true,
      numOfWorkers: navigator.hardwareConcurrency || 2
    },
    (err) => {
      if (err) { alert("Kamera hiba: " + err); return; }
      scannerEl.style.display = "block";
      Quagga.start();
      scanning = true;
      setCamControlsActive(true);
      ensureUIBound();

      if (!scannerEl.querySelector(".scan-roi")) {
        const roi = document.createElement("div");
        roi.className = "scan-roi";
        scannerEl.appendChild(roi);
      }

      setTimeout(() => {
        const video = scannerEl.querySelector("video");
        videoElRef = video || null;
        if (video) {
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          video.muted = true; video.autoplay = true;
          video.style.width = "100%"; video.style.height = "100%"; video.style.objectFit = "cover";
          video.style.filter = "";
        }
        const canvas = scannerEl.querySelector("canvas");
        if (canvas) { canvas.style.width = "100%"; canvas.style.height = "100%"; }

        try {
          const track = video && video.srcObject && video.srcObject.getVideoTracks()[0];
          if (!track) throw new Error("Nincs aktív videó track.");
          activeTrack = track;

          const caps = track.getCapabilities ? track.getCapabilities() : {};
          const settings = track.getSettings ? track.getSettings() : {};

          zoomSupported = !!(caps && caps.zoom !== undefined);
          if (zoomSupported) {
            const min = (caps.zoom?.min ?? 1), max = (caps.zoom?.max ?? 1), step = (caps.zoom?.step || 0.1);
            const cur = (settings.zoom != null ? settings.zoom : min);
            Object.assign(zoomSlider, { min: String(min), max: String(max), step: String(step), value: String(cur), disabled: false });
            zoomInBtn.disabled = false; zoomOutBtn.disabled = false;
          } else { zoomSlider.disabled = zoomInBtn.disabled = zoomOutBtn.disabled = true; }

          focusModes = Array.isArray(caps.focusMode) ? caps.focusMode : (caps.focusMode ? [caps.focusMode] : []);
          refocusBtn.disabled = !focusModes.length;

          torchSupported = !!caps.torch;
          torchOn = false;
          torchBtn.textContent = "Fény";
          torchBtn.disabled = !torchSupported;

          exposureKind = null;
          if (caps.exposureCompensation !== undefined) {
            exposureKind = "exposureCompensation";
            const { min = -2, max = 2, step = 0.1 } = caps.exposureCompensation || {};
            const cur = (settings.exposureCompensation != null ? settings.exposureCompensation : 0);
            Object.assign(exposureSlider, { min: String(min), max: String(max), step: String(step), value: String(cur), disabled: false });
          } else if (caps.brightness !== undefined) {
            exposureKind = "brightness";
            const { min = 0, max = 1, step = 0.05 } = caps.brightness || {};
            const cur = (settings.brightness != null ? settings.brightness : Math.max(min, Math.min(1, (min + max) / 2)));
            Object.assign(exposureSlider, { min: String(min), max: String(max), step: String(step), value: String(cur), disabled: false });
          } else {
            exposureKind = "css";
            Object.assign(exposureSlider, { min: "0.6", max: "1.6", step: "0.05", value: "1.0", disabled: false });
          }
        } catch {
          zoomSlider.disabled = zoomInBtn.disabled = zoomOutBtn.disabled = true;
          refocusBtn.disabled = true; torchBtn.disabled = true; exposureSlider.disabled = true;
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

  setCamControlsActive(false);
  [zoomSlider, zoomInBtn, zoomOutBtn, refocusBtn, torchBtn, exposureSlider].forEach(el => { if (el) el.disabled = true; });
  torchOn = false; torchBtn.textContent = "Fény";
  if (videoElRef) videoElRef.style.filter = "";

  activeTrack = null; videoElRef = null;
  zoomSupported = false; torchSupported = false; focusModes = []; exposureKind = null;
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
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits || digits.length < 8) return;

    recentHits.push(digits);
    if (recentHits.length > STABLE_HITS) recentHits.shift();

    const stable = recentHits.length === STABLE_HITS && recentHits.every((v) => v === digits);
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
