const cikkszamInput = document.getElementById("cikkszam");
const termeknevInput = document.getElementById("termeknev");
const tablaBody = document.getElementById("tabla-body");

const norm = (s) => (s || "").toString()
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase();

function renderTalalatok(filterFn, uzenetHaUres) {
  tablaBody.innerHTML = "";
  let talalatok = 0;

  for (const [cikkszam, adat] of Object.entries(adatbazis)) {
    try {
      if (!filterFn(cikkszam, adat)) continue;
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + cikkszam + "</td><td>" + adat.termek + "</td>";
      tablaBody.appendChild(tr);
      talalatok++;
    } catch {}
  }

  if (talalatok === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = uzenetHaUres;
    tr.appendChild(td);
    tablaBody.appendChild(tr);
  }
}

function frissitTiltast() {
  const vanC = cikkszamInput.value.trim().length > 0;
  const vanN = termeknevInput.value.trim().length > 0;
  if (vanC) termeknevInput.value = "";
  if (vanN) cikkszamInput.value = "";
}

function keresCikkszamSzerint() {
  const q = norm(cikkszamInput.value.trim());
  frissitTiltast();
  if (!q) return;
  renderTalalatok(
    (c) => norm(c).includes(q),
    "Nem található termék ezzel a cikkszám-részlettel."
  );
}

function keresNevSzerint() {
  const q = norm(termeknevInput.value.trim());
  frissitTiltast();
  if (!q) return;
  renderTalalatok(
    (_, a) => norm(a.termek).includes(q),
    "Nem található termék ezzel a névrészlettel."
  );
}

cikkszamInput.addEventListener("input", keresCikkszamSzerint);
termeknevInput.addEventListener("input", keresNevSzerint);
frissitTiltast();

const eanInput = document.getElementById("ean");
const openLinkBtn = document.getElementById("open-link-btn");
const eanStatus = document.getElementById("ean-status");
let eanMap = new Map();

function buildEanMap(obj) {
  const m = new Map();
  if (!obj) return m;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (!item) continue;
      if (Array.isArray(item)) {
        const ean = item[0];
        const url = item[1];
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
    if (!u.pathname.endsWith("/") && !u.pathname.includes(".") && !u.search && !u.hash) {
      u.pathname += "/";
    }
    return u.toString();
  } catch {
    return encodeURI(s);
  }
}

fetch("ean_adatbazis.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : {}))
  .then((obj) => {
    eanMap = buildEanMap(obj);
  })
  .catch(() => {});

function setEanStatus(cls, text) {
  eanStatus.className = cls || "";
  eanStatus.textContent = text || "";
}

function isValidEAN13(str) {
  const s = (str || "").replace(/\D/g, "");
  if (s.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = s.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === s.charCodeAt(12) - 48;
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

if (eanInput) {
  eanInput.addEventListener("input", (e) => handleEan(e.target.value));
}
if (openLinkBtn) {
  openLinkBtn.addEventListener("click", () => {
    const href = openLinkBtn.dataset.href;
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  });
}

const scannerEl = document.getElementById("scanner");
const scanBtn = document.getElementById("scan-btn");
const camControls = document.getElementById("cam-controls");
const zoomSlider = document.getElementById("zoom-slider");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const torchBtn = document.getElementById("torch-btn");
const exposureSlider = document.getElementById("exposure-slider");
const cameraCard = document.getElementById("camera-card");

function setCameraVisible(v) {
  if (!cameraCard) return;
  cameraCard.classList.toggle("active", !!v);
}

let scanning = false;
let activeTrack = null;
let videoElRef = null;
let zoomSupported = false;
let torchSupported = false;
let exposureKind = null;
let torchOn = false;
let uiBound = false;

function setCamControlsActive(active) {
  if (!camControls) return;
  camControls.classList.toggle("active", !!active);
}

function applyZoom(val) {
  if (!activeTrack) return;
  activeTrack.applyConstraints({ advanced: [{ zoom: val }] }).catch(() => {});
}

function applyExposure(val) {
  if (!activeTrack) {
    if (exposureKind === "css" && videoElRef) {
      videoElRef.style.filter = "brightness(" + val + ")";
    }
    return;
  }
  if (exposureKind === "exposureCompensation") {
    activeTrack.applyConstraints({ advanced: [{ exposureCompensation: val }] }).catch(() => {});
  } else if (exposureKind === "brightness") {
    activeTrack.applyConstraints({ advanced: [{ brightness: val }] }).catch(() => {});
  } else if (exposureKind === "css" && videoElRef) {
    videoElRef.style.filter = "brightness(" + val + ")";
  }
}

function toggleTorch() {
  if (!activeTrack || !torchSupported) return;
  torchOn = !torchOn;
  activeTrack.applyConstraints({ advanced: [{ torch: torchOn }] }).catch(() => {});
  if (torchBtn) {
    torchBtn.textContent = torchOn ? "Vaku KI" : "Vaku";
  }
}

function ensureUIBound() {
  if (uiBound) return;
  if (zoomSlider) {
    zoomSlider.addEventListener("input", () => {
      applyZoom(Number(zoomSlider.value));
    });
  }
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => {
      const step = Number(zoomSlider && zoomSlider.step ? zoomSlider.step : 0.1);
      const max = Number(zoomSlider && zoomSlider.max ? zoomSlider.max : 1);
      const current = Number(zoomSlider && zoomSlider.value ? zoomSlider.value : 1);
      const v = Math.min(current + step, max);
      if (zoomSlider) zoomSlider.value = String(v);
      applyZoom(v);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => {
      const step = Number(zoomSlider && zoomSlider.step ? zoomSlider.step : 0.1);
      const min = Number(zoomSlider && zoomSlider.min ? zoomSlider.min : 1);
      const current = Number(zoomSlider && zoomSlider.value ? zoomSlider.value : 1);
      const v = Math.max(current - step, min);
      if (zoomSlider) zoomSlider.value = String(v);
      applyZoom(v);
    });
  }
  if (torchBtn) {
    torchBtn.addEventListener("click", toggleTorch);
  }
  if (exposureSlider) {
    exposureSlider.addEventListener("input", () => {
      applyExposure(Number(exposureSlider.value));
    });
  }

  let startDist = 0;
  let startZoom = 1;
  const dist = (t0, t1) => Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
  if (scannerEl) {
    scannerEl.addEventListener(
      "touchstart",
      (e) => {
        if (zoomSupported && e.touches.length === 2) {
          startDist = dist(e.touches[0], e.touches[1]);
          startZoom = Number(zoomSlider && zoomSlider.value ? zoomSlider.value : 1);
        }
      },
      { passive: true }
    );
    scannerEl.addEventListener(
      "touchmove",
      (e) => {
        if (zoomSupported && e.touches.length === 2) {
          const d = dist(e.touches[0], e.touches[1]);
          const delta = (d - startDist) / 200;
          const min = Number(zoomSlider && zoomSlider.min ? zoomSlider.min : 1);
          const max = Number(zoomSlider && zoomSlider.max ? zoomSlider.max : 1);
          const v = Math.max(min, Math.min(max, startZoom + delta));
          if (zoomSlider) zoomSlider.value = String(v);
          applyZoom(v);
        }
      },
      { passive: true }
    );
  }
  uiBound = true;
}

function startScan() {
  if (scanning) return;
  if (!window.Quagga || !scannerEl) {
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
          advanced: [{ focusMode: "continuous" }],
        },
        area: { top: "25%", right: "25%", left: "25%", bottom: "25%" },
      },
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "code_128_reader",
          "upc_reader",
          "upc_e_reader",
        ],
      },
      locator: { patchSize: "large", halfSample: true },
      locate: true,
      numOfWorkers: navigator.hardwareConcurrency || 2,
    },
    (err) => {
      if (err) {
        alert("Kamera hiba: " + err);
        return;
      }
      setCameraVisible(true);
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
          video.muted = true;
          video.autoplay = true;
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";
          video.style.filter = "";
        }
        const canvas = scannerEl.querySelector("canvas");
        if (canvas) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
        }
        try {
          const track =
            video &&
            video.srcObject &&
            video.srcObject.getVideoTracks &&
            video.srcObject.getVideoTracks()[0];
          if (!track) throw new Error("Nincs aktív videó track.");
          activeTrack = track;
          const caps = track.getCapabilities ? track.getCapabilities() : {};
          const settings = track.getSettings ? track.getSettings() : {};
          zoomSupported = !!(caps && caps.zoom !== undefined);
          if (zoomSupported && zoomSlider && zoomInBtn && zoomOutBtn) {
            const min = caps.zoom && caps.zoom.min != null ? caps.zoom.min : 1;
            const max = caps.zoom && caps.zoom.max != null ? caps.zoom.max : 1;
            const step = caps.zoom && caps.zoom.step != null ? caps.zoom.step : 0.1;
            const cur =
              settings.zoom != null
                ? settings.zoom
                : caps.zoom && caps.zoom.min != null
                ? caps.zoom.min
                : 1;
            zoomSlider.min = String(min);
            zoomSlider.max = String(max);
            zoomSlider.step = String(step);
            zoomSlider.value = String(cur);
            zoomSlider.disabled = false;
            zoomInBtn.disabled = false;
            zoomOutBtn.disabled = false;
          } else if (zoomSlider && zoomInBtn && zoomOutBtn) {
            zoomSlider.disabled = true;
            zoomInBtn.disabled = true;
            zoomOutBtn.disabled = true;
          }
          torchSupported = !!(caps && caps.torch);
          torchOn = false;
          if (torchBtn) {
            torchBtn.textContent = "Vaku";
            torchBtn.disabled = !torchSupported;
          }
          exposureKind = null;
          if (caps && caps.exposureCompensation !== undefined) {
            exposureKind = "exposureCompensation";
            const ec = caps.exposureCompensation || {};
            const minEC = ec.min != null ? ec.min : -2;
            const maxEC = ec.max != null ? ec.max : 2;
            const stepEC = ec.step != null ? ec.step : 0.1;
            const curEC =
              settings.exposureCompensation != null
                ? settings.exposureCompensation
                : 0;
            if (exposureSlider) {
              exposureSlider.min = String(minEC);
              exposureSlider.max = String(maxEC);
              exposureSlider.step = String(stepEC);
              exposureSlider.value = String(curEC);
              exposureSlider.disabled = false;
            }
          } else if (caps && caps.brightness !== undefined) {
            exposureKind = "brightness";
            const br = caps.brightness || {};
            const minB = br.min != null ? br.min : 0.5;
            const maxB = br.max != null ? br.max : 2;
            const stepB = br.step != null ? br.step : 0.05;
            const curB = settings.brightness != null ? settings.brightness : 1;
            if (exposureSlider) {
              exposureSlider.min = String(minB);
              exposureSlider.max = String(maxB);
              exposureSlider.step = String(stepB);
              exposureSlider.value = String(curB);
              exposureSlider.disabled = false;
            }
          } else {
            exposureKind = "css";
            if (exposureSlider) {
              exposureSlider.min = "0.6";
              exposureSlider.max = "1.6";
              exposureSlider.step = "0.05";
              exposureSlider.value = "1.0";
              exposureSlider.disabled = false;
            }
          }
        } catch {
          if (zoomSlider) zoomSlider.disabled = true;
          if (zoomInBtn) zoomInBtn.disabled = true;
          if (zoomOutBtn) zoomOutBtn.disabled = true;
          if (torchBtn) {
            torchBtn.disabled = true;
            torchBtn.textContent = "Vaku";
          }
          if (exposureSlider) {
            exposureSlider.disabled = true;
            exposureSlider.value = "1.0";
          }
        }
      }, 0);
    }
  );
}

function stopScan() {
  if (!scanning) return;
  try {
    Quagga.stop();
  } catch {}
  setCameraVisible(false);
  scanning = false;
  setCamControlsActive(false);
  if (zoomSlider) zoomSlider.disabled = true;
  if (zoomInBtn) zoomInBtn.disabled = true;
  if (zoomOutBtn) zoomOutBtn.disabled = true;
  if (torchBtn) {
    torchBtn.disabled = true;
    torchBtn.textContent = "Vaku";
  }
  if (exposureSlider) {
    exposureSlider.disabled = true;
    exposureSlider.value = "1.0";
  }
  if (videoElRef) videoElRef.style.filter = "";
  activeTrack = null;
  videoElRef = null;
  zoomSupported = false;
  torchSupported = false;
  exposureKind = null;
  torchOn = false;
}

const STABLE_HITS = 3;
let recentHits = [];

if (window.Quagga) {
  Quagga.onDetected((result) => {
    const codeResult = result && result.codeResult;
    const raw = codeResult && codeResult.code ? codeResult.code : "";
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits || digits.length < 8) return;
    recentHits.push(digits);
    if (recentHits.length > STABLE_HITS) recentHits.shift();
    const stable =
      recentHits.length === STABLE_HITS &&
      recentHits.every((v) => v === digits);
    if (!stable) return;
    if (eanInput) {
      eanInput.value = digits;
      handleEan(digits);
    }
    recentHits = [];
    stopScan();
  });
}

if (scanBtn) {
  scanBtn.addEventListener("click", () => {
    if (scanning) stopScan();
    else startScan();
  });
}

const scanTextBtn = document.getElementById("scan-text-btn");
const cikkszamImageInput = document.getElementById("cikkszam-image-input");
const ocrStatus = document.getElementById("ocr-status");
let ocrWorker = null;
let ocrBusy = false;

function setOcrStatus(text) {
  if (!ocrStatus) return;
  ocrStatus.textContent = text || "";
}

async function ensureOcrWorker() {
  if (ocrWorker) return ocrWorker;
  if (!window.Tesseract || !Tesseract.createWorker) {
    throw new Error("Az OCR könyvtár nem elérhető.");
  }
  const worker = await Tesseract.createWorker("eng");
  ocrWorker = worker;
  return worker;
}

function findCikkszamFromText(text) {
  const raw = (text || "").toUpperCase();
  const tokens = raw.split(/[^A-Z0-9\/\.\-]+/).filter((t) => t.length >= 3);
  for (const token of tokens) {
    if (Object.prototype.hasOwnProperty.call(adatbazis, token)) return token;
    const upper = token.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(adatbazis, upper)) return upper;
    const lower = token.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(adatbazis, lower)) return lower;
  }
  return null;
}

async function handleCikkszamImage(file) {
  if (!file || ocrBusy) return;
  ocrBusy = true;
  setOcrStatus("Felismerés folyamatban...");
  const url = URL.createObjectURL(file);
  try {
    const worker = await ensureOcrWorker();
    const result = await worker.recognize(url);
    const text = result && result.data && result.data.text ? result.data.text : "";
    const cikkszam = findCikkszamFromText(text);
    if (cikkszam) {
      cikkszamInput.value = cikkszam;
      keresCikkszamSzerint();
      setOcrStatus("Felismert cikkszám: " + cikkszam);
    } else {
      setOcrStatus("Nem találtam adatbázisban szereplő cikkszámot a képen.");
    }
  } catch (e) {
    setOcrStatus("Hiba történt a cikkszám felismerésekor.");
  } finally {
    URL.revokeObjectURL(url);
    if (cikkszamImageInput) cikkszamImageInput.value = "";
    ocrBusy = false;
  }
}

if (scanTextBtn && cikkszamImageInput) {
  scanTextBtn.addEventListener("click", () => {
    cikkszamImageInput.click();
  });
  cikkszamImageInput.addEventListener("change", (e) => {
    const input = e.target;
    const file = input && input.files && input.files[0];
    handleCikkszamImage(file);
  });
}
