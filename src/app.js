/**
 * app.js - robust startup & UX wrapper for MindAR + A-Frame
 * - controls permission/start flow (important for iOS)
 * - waits for AR engine + model to be ready before hiding UI
 * - handles errors and shows helpful troubleshooting hints
 */

const startBtn = document.getElementById('startBtn');
const previewBtn = document.getElementById('previewBtn');
const overlay = document.getElementById('overlay');
const statusEl = document.getElementById('status');
const guideEl = document.getElementById('guide');

const scene = document.querySelector('a-scene');
const targetEntity = document.getElementById('targetEntity');
const gltfModel = document.getElementById('gltfModel');

let arReady = false;
let modelReady = false;
let arStarted = false;

function logStatus(txt) {
  statusEl.textContent = txt;
  console.log('[EnterpriseAR]', txt);
}

// Warm camera permission proactively (helps some Android browsers)
async function warmCameraPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    s.getTracks().forEach(t => t.stop());
    console.log('Camera permission warmed');
  } catch (e) {
    console.warn('warmCameraPermission failed:', e);
    // Not fatal — MindAR will prompt later
  }
}

// Start AR engine (called after user gesture)
async function startAR() {
  if (arStarted) return;
  arStarted = true;
  logStatus('Starting AR engine — initializing camera...');
  // get the MindAR system and call start()
  const arSystem = scene.systems['mindar-image-system'];
  if (!arSystem) {
    logStatus('Error: AR system not available.');
    return;
  }

  try {
    await arSystem.start(); // boots camera & engine
    // MindAR will emit 'arReady' when boot is complete
  } catch (err) {
    console.error('arSystem.start() failed', err);
    logStatus('AR start failed. Is camera permission granted?');
  }
}

// Listen for MindAR lifecycle events
scene.addEventListener('arReady', () => {
  arReady = true;
  logStatus('AR engine ready.');
  checkHideOverlay();
});

scene.addEventListener('arError', (ev) => {
  console.error('MindAR arError', ev);
  logStatus('AR engine error — camera unavailable or permission denied.');
  alert('AR failed to start. Ensure camera permission is allowed and this page is served over HTTPS (or use local server).');
});

// model-loaded event from a-gltf-model
gltfModel.addEventListener('model-loaded', () => {
  modelReady = true;
  console.log('Model loaded');
  checkHideOverlay();
});

// Visibility control when target found/lost
targetEntity.addEventListener('targetFound', () => {
  gltfModel.setAttribute('visible', 'true');
  guideEl.style.display = 'none';
});

targetEntity.addEventListener('targetLost', () => {
  gltfModel.setAttribute('visible', 'false');
  guideEl.style.display = 'block';
});

// When both AR and model are ready, hide the overlay
function checkHideOverlay() {
  if (arReady && modelReady) {
    overlay.style.display = 'none';
    guideEl.style.display = 'block';
    logStatus('AR ready — point camera at the image target.');
  }
}

// Start button flow: warm permissions then start AR
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  logStatus('Requesting camera access (user gesture) ...');
  await warmCameraPermission();
  await startAR();
});

// Preview button (opens preview.html in new tab)
previewBtn.addEventListener('click', () => {
  window.open('preview.html', '_blank');
});

// Helpful fallback: if scene never becomes ready after 8s, show tips
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!arReady) {
      logStatus('Waiting for camera — if nothing happens, enable camera permission and reload.');
    }
  }, 8000);
});
