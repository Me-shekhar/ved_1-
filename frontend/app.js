// frontend/app.js
const dom = {
  screens: {
    upload: document.getElementById('screenUpload'),
    results: document.getElementById('screenResults'),
  },
  inputs: {
    gallery: document.getElementById('imageInput'),
    camera: document.getElementById('cameraInput'),
  },
  buttons: {
    analyze: document.getElementById('analyzeBtn'),
    camera: document.getElementById('cameraBtn'),
    newScan: document.getElementById('newScanBtn'),
  },
  status: document.getElementById('status'),
  summary: {
    label: document.getElementById('label'),
    risk: document.getElementById('risk'),
    explanation: document.getElementById('explanation'),
    confidence: document.getElementById('confidence'),
    dot: document.getElementById('statusDot'),
  },
  indicatorList: document.getElementById('indicatorList'),
  jsonView: document.getElementById('rawjson'),
  historyList: document.getElementById('historyList'),
  cameraOverlay: document.getElementById('cameraOverlay'),
  cameraStream: document.getElementById('cameraStream'),
  captureBtn: document.getElementById('captureBtn'),
  closeCameraBtn: document.getElementById('closeCameraBtn'),
  consent: {
    hindi: document.getElementById('consentHindi'),
    english: document.getElementById('consentEnglish'),
  },
  context: {
    insertion: document.getElementById('insertionInput'),
    factorInputs: document.querySelectorAll('[data-factor]'),
    tractionMinus: document.getElementById('tractionMinus'),
    tractionPlus: document.getElementById('tractionPlus'),
    tractionCount: document.getElementById('tractionCount'),
    tractionStatus: document.getElementById('tractionStatus'),
    captureRadios: document.querySelectorAll('input[name="captureType"]'),
    eventMarker: document.getElementById('eventMarker'),
    nightMode: document.getElementById('nightModeToggle'),
  },
  risk: {
    clisaScore: document.getElementById('clisaScore'),
    clisaAction: document.getElementById('clisaAction'),
    riskWindow: document.getElementById('riskWindow'),
    riskTier: document.getElementById('riskTier'),
    meterFill: document.getElementById('riskMeterFill'),
  },
  alertsList: document.getElementById('alertsList'),
  charts: {
    trend: document.getElementById('trendChart'),
  },
  analytics: {
    rate: document.getElementById('metricRate'),
    days: document.getElementById('metricDays'),
    dressing: document.getElementById('metricDressings'),
    catheter: document.getElementById('metricCatheters'),
    traction: document.getElementById('metricTraction'),
  },
  clisaGuideBtn: document.getElementById('clisaGuideBtn'),
  clisaTable: document.getElementById('clisaTable'),
};

const CONSENT_SCRIPTS = {
  hindi: 'Aapki suraksha ke liye hum IV lagne wale jagah ki ek tasveer lenge. Yeh tasveer sirf suraksha aur record ke liye rahegi, aur bilkul private rahegi. Hum yeh chhota safety device bhi laga rahe hain jo drip ki pipe ko protect karta hai. Agar kabhi awaz aaye ya light jale toh ghabraiye mat – iss se sirf humko pata chalta hai ki line check karni hai, aapne koi galat kaam nahi kiya. Humara maksad sirf aapki nas ko safe rakhna hai.',
  english: 'For your safety, we will take a picture of the IV site. The photo will be used only for safety documentation and will remain completely private. We are also placing a small safety device to protect your IV line. If the device beeps or the light turns on, please do not worry – it only reminds us to check the line. You are not doing anything wrong; our only aim is to keep your vein safe.',
};

const defaultPatientState = {
  insertionDate: null,
  patientFactors: {
    agitation: false,
    age_extremes: false,
    comorbidities: false,
    immune_nutrition: false,
  },
  captureType: 'catheter_site',
  eventMarker: '',
  tractionAlerts: 0,
  tractionStatus: 'green',
  tractionYellowEvents: 0,
  nightMode: false,
};

let patientState = loadPatientState();
let mediaStream;
let cachedHistory = [];

const featureLabels = {
  redness: 'Redness',
  swelling: 'Swelling',
  dressing_lift: 'Dressing lift',
  discharge: 'Discharge',
  exposed_catheter: 'Exposed catheter',
  open_wound: 'Open wound',
  bruising: 'Bruising',
  crusting: 'Crusting',
  erythema_border_sharp: 'Sharp erythema border',
  fluctuance: 'Fluctuance',
};

function loadPatientState() {
  try {
    const saved = JSON.parse(localStorage.getItem('patientContext') || 'null');
    if (saved && typeof saved === 'object') {
      return {
        ...defaultPatientState,
        ...saved,
        patientFactors: {
          ...defaultPatientState.patientFactors,
          ...(saved.patientFactors || {}),
        },
      };
    }
  } catch (error) {
    console.warn('Failed to parse saved patient context', error);
  }
  return { ...defaultPatientState };
}

function savePatientState() {
  localStorage.setItem('patientContext', JSON.stringify(patientState));
}

function toLocalInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function parseInputDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hydratePatientControls() {
  if (dom.context.insertion) {
    dom.context.insertion.value = toLocalInputValue(patientState.insertionDate);
  }
  dom.context.factorInputs?.forEach((input) => {
    const key = input.dataset.factor;
    input.checked = !!patientState.patientFactors[key];
  });
  dom.context.captureRadios?.forEach((radio) => {
    radio.checked = radio.value === patientState.captureType;
  });
  if (dom.context.eventMarker) {
    dom.context.eventMarker.value = patientState.eventMarker || '';
  }
  if (dom.context.tractionCount) {
    dom.context.tractionCount.textContent = patientState.tractionAlerts;
  }
  if (dom.context.tractionStatus) {
    dom.context.tractionStatus.value = patientState.tractionStatus || 'green';
  }
  if (dom.context.nightMode) {
    dom.context.nightMode.checked = !!patientState.nightMode;
  }
  applyNightModeClass();
}

function applyNightModeClass() {
  if (!dom.cameraOverlay) return;
  dom.cameraOverlay.classList.toggle('night-mode', !!patientState.nightMode);
}

function buildContextPayload() {
  let dwellHours = 0;
  if (patientState.insertionDate) {
    const inserted = new Date(patientState.insertionDate);
    if (!Number.isNaN(inserted.getTime())) {
      dwellHours = Math.max(0, (Date.now() - inserted.getTime()) / 3600000);
    }
  }
  const dwellDays = dwellHours ? Number((dwellHours / 24).toFixed(2)) : 0;
  const lineDayIndex = dwellHours ? Math.max(1, Math.ceil(dwellHours / 24)) : null;
  const slotLabel = lineDayIndex ? `Day ${lineDayIndex} • ${new Date().getHours() < 12 ? 'AM' : 'PM'}` : '';

  return {
    capture_type: patientState.captureType,
    capture_slot_label: slotLabel,
    event_marker: patientState.eventMarker || null,
    dwell_time_hours: Number(dwellHours.toFixed(2)),
    dwell_time_days: dwellDays,
    line_day_index: lineDayIndex,
    patient_factors: patientState.patientFactors,
    traction_alerts: patientState.tractionAlerts,
    traction_yellow_events: patientState.tractionYellowEvents || patientState.tractionAlerts,
    traction_status: patientState.tractionStatus,
    night_mode: patientState.nightMode,
  };
}

const confidenceClass = (value) => {
  if (value >= 0.75) return 'chip success';
  if (value >= 0.45) return 'chip warn';
  if (value > 0) return 'chip muted';
  return 'chip muted';
};

function setScreen(name) {
  Object.entries(dom.screens).forEach(([key, el]) => {
    const active = key === name;
    el.classList.toggle('active', active);
    el.setAttribute('aria-hidden', (!active).toString());
  });
  if (name === 'results') {
    requestAnimationFrame(() => renderTrend(cachedHistory));
  }
}

function setStatus(message, type = '') {
  dom.status.textContent = message;
  dom.status.className = ['status', type].filter(Boolean).join(' ');
}

function toggleLoading(isLoading) {
  dom.buttons.analyze.disabled = isLoading;
  dom.buttons.camera.disabled = isLoading;
  dom.buttons.analyze.textContent = isLoading ? 'Analyzing…' : 'Analyze photo';
}

function setStatusDot(label = '') {
  const normalized = label.toLowerCase();
  const color = {
    red: 'red',
    yellow: 'yellow',
    green: 'green',
    uncertain: 'uncertain',
  }[normalized] || 'neutral';
  dom.summary.dot.className = `status-dot ${color}`;
  dom.summary.dot.title = `${label} indicator`;
}

function speakConsent(key) {
  const text = CONSENT_SCRIPTS[key];
  if (!text) return;
  if (!('speechSynthesis' in window)) {
    setStatus('Speech synthesis unavailable on this device.', 'error');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = key === 'hindi' ? 'hi-IN' : 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function renderSummary(classification = {}, riskProfile = {}) {
  dom.summary.label.textContent = classification.label || 'Awaiting scan';
  const scoreText = riskProfile.clisa_score ?? classification.risk_score ?? '—';
  dom.summary.risk.textContent = `CLISA score: ${scoreText}`;
  dom.summary.explanation.textContent = classification.explanation || 'Run an analysis to view triage guidance.';
  const confidence = classification.overall_confidence ?? 0;
  dom.summary.confidence.textContent = `Confidence ${(confidence * 100).toFixed(0)}%`;
  dom.summary.confidence.className = confidenceClass(confidence);
  setStatusDot(riskProfile.risk_label || classification.label || '');
  renderRiskWidgets(riskProfile);
}

function renderRiskWidgets(riskProfile = {}) {
  if (dom.risk.clisaScore) {
    dom.risk.clisaScore.textContent = riskProfile.clisa_score ?? '—';
  }
  if (dom.risk.clisaAction) {
    dom.risk.clisaAction.textContent = riskProfile.clisa_action || 'CLISA action will appear here.';
  }
  if (dom.risk.riskWindow) {
    dom.risk.riskWindow.textContent = riskProfile.risk_window ? `${riskProfile.risk_window} window` : '—';
  }
  if (dom.risk.riskTier) {
    dom.risk.riskTier.textContent = `Risk tier: ${riskProfile.risk_label || '—'}`;
  }
  if (dom.risk.meterFill) {
    const value = Math.min(100, Math.max(0, riskProfile.risk_meter || 0));
    dom.risk.meterFill.style.width = `${value}%`;
    dom.risk.meterFill.dataset.level = (riskProfile.risk_label || '').toLowerCase();
  }
  renderAlerts(riskProfile);
}

function renderAlerts(riskProfile = {}) {
  if (!dom.alertsList) return;
  const alerts = Array.isArray(riskProfile.alerts) ? riskProfile.alerts : [];
  if (!alerts.length) {
    dom.alertsList.innerHTML = '<p class="note">No active alerts.</p>';
    return;
  }
  dom.alertsList.innerHTML = alerts.map((alert) => `
    <div class="alert-row ${alert.severity || ''}">
      <div>
        <strong>${alert.reason}</strong>
        <p>${alert.action}</p>
      </div>
      <span>${new Date(alert.timestamp || Date.now()).toLocaleTimeString()}</span>
    </div>
  `).join('');
}

const describeFeature = (name, value) => {
  if (!value) return 'Not detected';
  if (name === 'discharge' && value.present) {
    return `${value.type || 'discharge'} present${value.amount ? ` (${value.amount})` : ''}`;
  }
  if (['redness', 'swelling'].includes(name) && value.present) {
    return `Extent ${value.extent_percent ?? 0}%`;
  }
  if (name === 'erythema_border_sharp') {
    return value.yes ? 'Defined border' : 'Diffuse border';
  }
  return value.present ? 'Present' : 'Not detected';
};

const indicatorClass = (name, value) => {
  if (!value) return 'indicator neutral';
  if (name === 'dressing_lift' && value.present) return 'indicator alert';
  if (['discharge', 'open_wound'].includes(name) && value.present) return 'indicator danger';
  if (value.present || value.yes) return 'indicator alert';
  return 'indicator neutral';
};

function renderIndicators(features = {}) {
  const entries = Object.entries(featureLabels);
  if (!entries.length) {
    dom.indicatorList.innerHTML = '<p class="note">No indicators returned.</p>';
    return;
  }
  dom.indicatorList.innerHTML = entries.map(([key, label]) => {
    const value = features[key];
    const present = value?.present || value?.yes || false;
    return `
      <div class="${indicatorClass(key, value)}">
        <strong>${label}</strong>
        <span>${describeFeature(key, value)}</span>
        <span>${present ? '⚠︎' : '✔︎'}</span>
      </div>
    `;
  }).join('');
}

function renderDocument(payload) {
  dom.jsonView.textContent = JSON.stringify(payload, null, 2);
}

function formatTimestamp(iso) {
  if (!iso) return 'Unknown time';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function renderHistory(entries = []) {
  cachedHistory = entries;
  if (!entries.length) {
    dom.historyList.innerHTML = '<p class="note">No assessments stored yet.</p>';
    return;
  }
  dom.historyList.innerHTML = entries.map((entry) => {
    const label = entry.classification?.label || 'Unknown';
    const captureLabel = entry.context?.capture_type === 'traction_module' ? 'Traction' : 'Catheter';
    const marker = entry.event_marker === 'dressing_change' ? '⚪' : entry.event_marker === 'catheter_change' ? '⚫' : '';
    return `
      <div class="history-item">
        <img src="${entry.image_url}" alt="Assessment image" loading="lazy" />
        <div class="history-meta">
          <strong>${label} ${marker}</strong>
          <span>${captureLabel} • ${formatTimestamp(entry.timestamp)}</span>
        </div>
        <button type="button" data-history-id="${entry.id}">View</button>
      </div>
    `;
  }).join('');
}

function renderTrend(entries = []) {
  const canvas = dom.charts.trend;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const parentWidth = canvas.parentElement?.clientWidth || 360;
  canvas.width = parentWidth;
  canvas.height = 220;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const usable = [...entries].reverse().slice(-12);
  if (!usable.length) {
    ctx.fillStyle = '#9aa3b3';
    ctx.fillText('Trend will appear after the first assessment', 10, 30);
    return;
  }

  const padding = 28;
  const plotWidth = canvas.width - padding * 2;
  const plotHeight = canvas.height - padding * 2;

  ctx.strokeStyle = '#e0e6f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding + (plotHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  const colors = { green: '#00c48c', yellow: '#f4a259', red: '#ff5a5a' };
  const stepX = usable.length > 1 ? plotWidth / (usable.length - 1) : 0;

  ctx.strokeStyle = '#0d7adf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  usable.forEach((entry, index) => {
    const riskValue = entry.risk_profile?.risk_meter ?? entry.classification?.risk_score ?? 0;
    const x = padding + index * stepX;
    const y = padding + plotHeight - (Math.min(100, riskValue) / 100) * plotHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  usable.forEach((entry, index) => {
    const riskValue = entry.risk_profile?.risk_meter ?? entry.classification?.risk_score ?? 0;
    const x = padding + index * stepX;
    const y = padding + plotHeight - (Math.min(100, riskValue) / 100) * plotHeight;
    const riskLabel = (entry.risk_profile?.risk_label || '').toLowerCase();
    const marker = entry.event_marker;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    if (marker === 'dressing_change') {
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#abb5c7';
      ctx.stroke();
    } else if (marker === 'catheter_change') {
      ctx.fillStyle = '#1f2a37';
      ctx.fill();
    } else {
      ctx.fillStyle = colors[riskLabel] || '#cfd8e3';
      ctx.fill();
    }
  });
}

function renderAnalytics(metrics = {}) {
  dom.analytics.rate.textContent = (metrics.clabsi_rate ?? 0).toFixed(2);
  dom.analytics.days.textContent = metrics.line_days ?? 0;
  dom.analytics.dressing.textContent = metrics.dressing_events ?? 0;
  dom.analytics.catheter.textContent = metrics.catheter_events ?? 0;
  dom.analytics.traction.textContent = metrics.traction_alerts_total ?? 0;
}

async function fetchHistory() {
  try {
    const res = await fetch('/history');
    if (!res.ok) throw new Error('Unable to load history');
    const payload = await res.json();
    const entries = Array.isArray(payload) ? payload : payload.entries || [];
    renderHistory(entries);
    renderTrend(entries);
    if (payload.analytics) {
      renderAnalytics(payload.analytics);
    }
  } catch (error) {
    console.warn(error);
  }
}

function displayHistoryEntry(id) {
  const entry = cachedHistory.find((item) => item.id === id);
  if (!entry) return;
  renderSummary(entry.classification, entry.risk_profile);
  renderIndicators(entry.gemini?.features);
  renderAlerts(entry.risk_profile);
  renderDocument(entry);
  setScreen('results');
  setStatus('Displaying saved assessment', 'success');
}

function closeCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  dom.cameraOverlay.classList.remove('open');
  dom.cameraOverlay.setAttribute('aria-hidden', 'true');
}

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    dom.inputs.camera.click();
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    dom.cameraStream.srcObject = mediaStream;
    dom.cameraOverlay.classList.add('open');
    dom.cameraOverlay.classList.toggle('night-mode', !!patientState.nightMode);
    dom.cameraOverlay.setAttribute('aria-hidden', 'false');
  } catch (error) {
    console.error(error);
    setStatus('Camera access blocked. Please allow camera or upload from gallery.', 'error');
    dom.inputs.camera.click();
  }
}

function captureFrame() {
  const video = dom.cameraStream;
  if (!mediaStream || !video.videoWidth) {
    setStatus('Unable to access camera stream', 'error');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Image capture failed – retry', 'error');
      return;
    }
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    closeCamera();
    runAnalysis(file);
  }, 'image/jpeg', 0.9);
}

async function runAnalysis(file) {
  const form = new FormData();
  form.append('image', file, file.name || 'capture.jpg');
  form.append('context', JSON.stringify(buildContextPayload()));

  setStatus('Analyzing image…', 'loading');
  toggleLoading(true);

  try {
    const res = await fetch('/analyze', { method: 'POST', body: form });
    if (!res.ok) {
      const payload = await res.json().catch(async () => ({ error: await res.text() }));
      throw new Error(payload.error || 'Unexpected server error');
    }
    const data = await res.json();
    renderSummary(data.classification, data.risk_profile);
    renderIndicators(data.gemini?.features);
    renderDocument(data);
    setScreen('results');
    setStatus('Analysis complete', 'success');
    patientState.eventMarker = '';
    if (dom.context.eventMarker) dom.context.eventMarker.value = '';
    savePatientState();
    fetchHistory();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Failed to analyze image', 'error');
  } finally {
    toggleLoading(false);
  }
}

function registerContextListeners() {
  dom.context.insertion?.addEventListener('change', (event) => {
    patientState.insertionDate = parseInputDate(event.target.value);
    savePatientState();
  });

  dom.context.factorInputs?.forEach((input) => {
    input.addEventListener('change', () => {
      patientState.patientFactors[input.dataset.factor] = input.checked;
      savePatientState();
    });
  });

  dom.context.captureRadios?.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        patientState.captureType = radio.value;
        savePatientState();
      }
    });
  });

  dom.context.eventMarker?.addEventListener('change', (event) => {
    patientState.eventMarker = event.target.value;
    savePatientState();
  });

  dom.context.tractionMinus?.addEventListener('click', () => {
    patientState.tractionAlerts = Math.max(0, patientState.tractionAlerts - 1);
    dom.context.tractionCount.textContent = patientState.tractionAlerts;
    savePatientState();
  });

  dom.context.tractionPlus?.addEventListener('click', () => {
    patientState.tractionAlerts += 1;
    dom.context.tractionCount.textContent = patientState.tractionAlerts;
    savePatientState();
  });

  dom.context.tractionStatus?.addEventListener('change', (event) => {
    patientState.tractionStatus = event.target.value;
    savePatientState();
  });

  dom.context.nightMode?.addEventListener('change', (event) => {
    patientState.nightMode = event.target.checked;
    applyNightModeClass();
    savePatientState();
  });

  dom.consent.hindi?.addEventListener('click', () => speakConsent('hindi'));
  dom.consent.english?.addEventListener('click', () => speakConsent('english'));

  dom.clisaGuideBtn?.addEventListener('click', () => {
    dom.clisaTable?.setAttribute('open', 'open');
    dom.clisaTable?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function registerCoreListeners() {
  dom.buttons.analyze.addEventListener('click', () => {
    const files = dom.inputs.gallery.files;
    if (!files || files.length === 0) {
      setStatus('Please choose an image first', 'error');
      return;
    }
    runAnalysis(files[0]);
  });

  dom.buttons.camera.addEventListener('click', openCamera);

  dom.inputs.camera.addEventListener('change', () => {
    const files = dom.inputs.camera.files;
    if (files && files[0]) {
      runAnalysis(files[0]);
    }
  });

  dom.buttons.newScan.addEventListener('click', () => {
    dom.inputs.gallery.value = '';
    dom.inputs.camera.value = '';
    setScreen('upload');
    setStatus('Ready for another capture');
  });

  dom.historyList.addEventListener('click', (event) => {
    if (event.target.matches('[data-history-id]')) {
      displayHistoryEntry(event.target.getAttribute('data-history-id'));
    }
  });

  dom.captureBtn.addEventListener('click', captureFrame);
  dom.closeCameraBtn.addEventListener('click', closeCamera);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCamera();
    }
  });
}

function init() {
  hydratePatientControls();
  registerContextListeners();
  registerCoreListeners();
  fetchHistory();
}

window.addEventListener('load', init);
