import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const $ = (id) => document.getElementById(id);
const state = {
  image: null,
  objectUrl: null,
  texture: null,
  renderer: null,
  scene: null,
  camera: null,
  sphere: null,
  yaw: 0,
  pitch: 0,
  fov: 90,
  faces: [],
  faceSize: 512,
  output: "png",
  mode: "panorama",
  dragging: false,
  lastX: 0,
  lastY: 0,
  generated: false,
  autoRotate: false,
  autoRotateSpeed: 0.012
};

const viewer = $("viewer");
const viewerCanvas = $("viewerCanvas");

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rad(v) { return v * Math.PI / 180; }

function initStormPlaceholder() {
  const rainLayer = $("rainLayer");
  const lightningLayer = $("lightningLayer");
  const stormPlaceholder = $("stormPlaceholder");
  if (!rainLayer || !lightningLayer || !stormPlaceholder) return;
  const reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile =
    window.matchMedia &&
    window.matchMedia("(max-width: 680px)").matches;
  let count;
  if (isMobile) {
    count = reducedMotion ? 25 : 45;
  } else {
    count = reducedMotion ? 40 : 70;
  }
  rainLayer.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const drop = document.createElement("span");
    drop.className = "rain-drop";
    drop.style.left = `${Math.random() * 105}%`;
    drop.style.top =
      `${-20 - Math.random() * 80}%`;
    drop.style.height =
      `${isMobile
        ? 18 + Math.random() * 24
        : 18 + Math.random() * 34}px`;
    drop.style.opacity =
      `${isMobile
        ? 0.35 + Math.random() * 0.55
        : 0.2 + Math.random() * 0.6}`;
    drop.style.animationDuration =
      `${isMobile
        ? 0.55 + Math.random() * 0.65
        : 0.65 + Math.random() * 0.9}s`;
    drop.style.animationDelay =
      `${-Math.random() * 1.8}s`;
    fragment.appendChild(drop);
  }
  rainLayer.appendChild(fragment);
  const scheduleLightning = () => {
    const delay =
      4000 + Math.random() * 7000;
    window.setTimeout(() => {
      if (!stormPlaceholder.classList.contains("hidden")) {
        lightningLayer.classList.remove("flash");
        void lightningLayer.offsetWidth;
        lightningLayer.classList.add("flash");
      }
      scheduleLightning();
    }, delay);
  };
  scheduleLightning();
}
function initViewer() {
  state.scene = new THREE.Scene();
  state.camera = new THREE.PerspectiveCamera(90, 1, 0.1, 1100);
  state.camera.position.set(0, 0, 0.01);

  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  state.renderer.setClearColor(0x050914, 1);
  viewerCanvas.appendChild(state.renderer.domElement);

  const geometry = new THREE.SphereGeometry(500, 96, 64);
  geometry.scale(-1, 1, 1);

  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  state.sphere = new THREE.Mesh(geometry, material);
  state.scene.add(state.sphere);

  resizeViewer();
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (!state.renderer) return;

  // Auto Rotate: berputar perlahan secara horizontal.
  // Saat user sedang drag, rotasi otomatis berhenti sementara.
  if (state.autoRotate && !state.dragging) {
    state.yaw += state.autoRotateSpeed;
  }

  state.camera.rotation.order = "YXZ";
  state.camera.rotation.y = rad(state.yaw);
  state.camera.rotation.x = rad(state.pitch);
  state.camera.fov = state.fov;
  state.camera.updateProjectionMatrix();
  state.renderer.render(state.scene, state.camera);
}

function resizeViewer() {
  if (!state.renderer) return;
  const w = Math.max(1, viewer.clientWidth);
  const h = Math.max(1, viewer.clientHeight);
  state.renderer.setSize(w, h, false);
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
}

function updateLabels() {
  $("fovOutput").textContent = `${Math.round(state.fov)}°`;
  $("pitchOutput").textContent = `${Math.round(state.pitch)}°`;
  $("yawOutput").textContent = `${Math.round(state.yaw)}°`;
  $("fov").value = state.fov;
  $("pitch").value = state.pitch;
  $("yaw").value = state.yaw;
  $("compass").style.transform = `rotate(${-state.yaw}deg)`;
}

function resetView() {
  state.yaw = 0;
  state.pitch = 0;
  state.fov = 90;
  updateLabels();
}

function setTexture(img) {
  if (state.texture) state.texture.dispose();
  state.texture = new THREE.Texture(img);
  state.texture.colorSpace = THREE.SRGBColorSpace;
  state.texture.needsUpdate = true;
  state.sphere.material.map = state.texture;
  state.sphere.material.needsUpdate = true;
  state.sphere.material.color.set(0xffffff);
  $("emptyViewer").classList.add("hidden");
  $("stormPlaceholder")?.classList.add("hidden");
  $("sourceStatus").textContent = "Ready";
  $("sourceStatus").classList.add("ready");
}

function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) return;

  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = URL.createObjectURL(file);

  const img = new Image();
  img.onload = () => {
    state.image = img;
    $("fileName").textContent = file.name;
    $("fileDimensions").textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${formatBytes(file.size)}`;

    const ratio = img.naturalWidth / img.naturalHeight;
    $("sourceStatus").textContent = Math.abs(ratio - 2) < 0.05 ? "2:1 Panorama" : "Loaded";
    $("sourceStatus").classList.add("ready");

    setTexture(img);
    $("generateBtn").disabled = false;
    $("downloadZipBtn").disabled = true;
    $("downloadIndividualBtn").disabled = true;
    $("previewAllBtn").disabled = true;
    state.faces = [];
    state.generated = false;
    renderFacePlaceholder(ratio);
    resetView();
  };
  img.onerror = () => {
    alert("Gambar tidak dapat dibaca.");
  };
  img.src = state.objectUrl;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFacePlaceholder(ratio = 2) {
  const grid = $("faceGrid");
  grid.innerHTML = `<div class="face-placeholder">${Math.abs(ratio - 2) < 0.05 ? "Panorama siap. Klik “Generate 6 Faces” untuk memotong otomatis." : "Gambar dimuat. Untuk hasil skybox paling akurat gunakan rasio 2:1."}</div>`;
}

function createSourceCanvas() {
  const c = document.createElement("canvas");
  c.width = state.image.naturalWidth;
  c.height = state.image.naturalHeight;
  const cctx = c.getContext("2d", { willReadFrequently: true });
  cctx.drawImage(state.image, 0, 0);
  return { canvas: c, ctx: cctx, data: cctx.getImageData(0, 0, c.width, c.height).data };
}

function sampleEquirect(src, x, y) {
  const { width, height } = src.canvas;
  let lon = Math.atan2(x, y);
  let lat = Math.asin(clamp(-0 + 0, -1, 1));
  lat = Math.asin(clamp(src._Y, -1, 1));

  let u = lon / (2 * Math.PI) + 0.5;
  let v = 0.5 - lat / Math.PI;

  u = ((u % 1) + 1) % 1;
  v = clamp(v, 0, 1);

  const sx = clamp(Math.floor(u * width), 0, width - 1);
  const sy = clamp(Math.floor(v * height), 0, height - 1);
  const p = (sy * width + sx) * 4;
  return [src.data[p], src.data[p + 1], src.data[p + 2], 255];
}

function makeFace(name, N, src) {
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d");
  const out = ctx.createImageData(N, N);
  const d = out.data;

  for (let py = 0; py < N; py++) {
    const b = 1 - 2 * ((py + 0.5) / N);
    for (let px = 0; px < N; px++) {
      const a = 2 * ((px + 0.5) / N) - 1;

      let X, Y, Z;
      switch (name) {
        case "front":  X = a;  Y = b;  Z = 1;  break;
        case "back":   X = -a; Y = b;  Z = -1; break;
        case "right":  X = 1;  Y = b;  Z = -a; break;
        case "left":   X = -1; Y = b;  Z = a;  break;
        case "top":    X = a;  Y = 1;  Z = -b; break;
        case "bottom": X = a;  Y = -1; Z = b;  break;
      }

      const len = Math.hypot(X, Y, Z);
      X /= len; Y /= len; Z /= len;

      const lon = Math.atan2(X, Z);
      const lat = Math.asin(clamp(Y, -1, 1));
      let u = lon / (2 * Math.PI) + 0.5;
      let v = 0.5 - lat / Math.PI;
      u = ((u % 1) + 1) % 1;
      v = clamp(v, 0, 1);

      const sx = clamp(Math.floor(u * src.canvas.width), 0, src.canvas.width - 1);
      const sy = clamp(Math.floor(v * src.canvas.height), 0, src.canvas.height - 1);
      const p = (sy * src.canvas.width + sx) * 4;
      const q = (py * N + px) * 4;

      d[q] = src.data[p];
      d[q + 1] = src.data[p + 1];
      d[q + 2] = src.data[p + 2];
      d[q + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

function generateFaces() {
  if (!state.image) return;

  const N = parseInt($("resolutionSelect").value, 10);
  state.faceSize = N;
  state.faces = [];

  const src = createSourceCanvas();
  const names = ["front", "back", "left", "right", "top", "bottom"];

  $("generateBtn").disabled = true;
  $("generateBtn").textContent = "⏳ Generating…";

  setTimeout(() => {
    for (const name of names) {
      state.faces.push({ name, canvas: makeFace(name, N, src) });
    }

    state.generated = true;
    renderFaces();
    $("generateBtn").disabled = false;
    $("generateBtn").textContent = "✓ Generate 6 Faces";
    $("downloadZipBtn").disabled = false;
    $("downloadIndividualBtn").disabled = false;
    $("previewAllBtn").disabled = false;
  }, 20);
}

function renderFaces() {
  const grid = $("faceGrid");
  grid.innerHTML = "";

  for (const face of state.faces) {
    const card = document.createElement("article");
    card.className = "face-card";

    const img = document.createElement("img");
    img.src = face.canvas.toDataURL("image/png");
    img.alt = `${face.name} cube face`;

    const info = document.createElement("div");
    info.className = "face-info";
    info.innerHTML = `<strong>${capitalize(face.name)}</strong><span>${state.faceSize} × ${state.faceSize}</span>`;

    const download = document.createElement("button");
    download.className = "face-download";
    download.type = "button";
    download.textContent = "⇩ Download";
    download.addEventListener("click", () => downloadCanvas(face.canvas, `skybox_${face.name}`));

    card.append(img, info, download);
    grid.appendChild(card);
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function downloadCanvas(canvas, filename) {
  const mime = state.output === "jpeg" ? "image/jpeg" : "image/png";
  const ext = state.output === "jpeg" ? "jpg" : "png";

  canvas.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1200);
  }, mime, state.output === "jpeg" ? 0.92 : undefined);
}

async function downloadAll() {
  if (!state.faces.length) return;

  const JSZip = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  const zip = new JSZip.default();
  const mime = state.output === "jpeg" ? "image/jpeg" : "image/png";
  const ext = state.output === "jpeg" ? "jpg" : "png";

  for (const face of state.faces) {
    const blob = await new Promise(resolve => face.canvas.toBlob(resolve, mime, state.output === "jpeg" ? 0.92 : undefined));
    zip.file(`skybox_${face.name}.${ext}`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = "skybox_6_faces.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1200);
}

function setupViewerControls() {
  viewerCanvas.addEventListener("pointerdown", e => {
    if (!state.image) return;
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    viewerCanvas.setPointerCapture(e.pointerId);
  });

  viewerCanvas.addEventListener("pointermove", e => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.yaw += dx * 0.25;
    state.pitch = clamp(state.pitch + dy * 0.25, -82, 82);
    updateLabels();
  });

  const stop = () => state.dragging = false;
  viewerCanvas.addEventListener("pointerup", stop);
  viewerCanvas.addEventListener("pointercancel", stop);

  viewerCanvas.addEventListener("wheel", e => {
    if (!state.image) return;
    e.preventDefault();
    state.fov = clamp(state.fov + e.deltaY * 0.04, 45, 120);
    updateLabels();
  }, { passive: false });

  let pinchStart = null;
  viewerCanvas.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      pinchStart = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  viewerCanvas.addEventListener("touchmove", e => {
    if (e.touches.length !== 2 || pinchStart === null) return;
    const current = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    state.fov = clamp(state.fov - (current - pinchStart) * 0.08, 45, 120);
    pinchStart = current;
    updateLabels();
  }, { passive: true });

  viewerCanvas.addEventListener("touchend", () => pinchStart = null);
}

function setupUI() {
  $("fileInput").addEventListener("change", e => loadImage(e.target.files[0]));
  $("emptyUploadBtn").addEventListener("click", () => $("fileInput").click());

  $("generateBtn").addEventListener("click", generateFaces);
  $("downloadIndividualBtn").addEventListener("click", () => state.faces.forEach((f, i) => setTimeout(() => downloadCanvas(f.canvas, `skybox_${f.name}`), i * 120)));
  $("downloadZipBtn").addEventListener("click", downloadAll);
  $("exportTopBtn").addEventListener("click", downloadAll);

  $("resetViewBtn").addEventListener("click", resetView);
  $("fitViewBtn").addEventListener("click", resetView);

  const autoRotateBtn = $("autoRotateBtn");
  autoRotateBtn.addEventListener("click", () => {
    state.autoRotate = !state.autoRotate;
    autoRotateBtn.classList.toggle("active", state.autoRotate);
    autoRotateBtn.textContent = state.autoRotate ? "⏸ Stop Auto Rotate" : "▶ Auto Rotate";
  });

  const rotateSpeed = $("rotateSpeed");
  const rotateSpeedOutput = $("rotateSpeedOutput");
  rotateSpeed.addEventListener("input", e => {
    const percent = clamp(Number(e.target.value), 1, 100);
    // 1% ≈ 0.001 deg/frame, 100% = 0.050 deg/frame.
    state.autoRotateSpeed = 0.001 + ((percent - 1) / 99) * 0.049;
    rotateSpeedOutput.textContent = `${percent}%`;
  });
  $("resetControlsBtn").addEventListener("click", resetView);
  $("fitControlsBtn").addEventListener("click", resetView);

  $("zoomIn").addEventListener("click", () => { state.fov = clamp(state.fov - 10, 45, 120); updateLabels(); });
  $("zoomOut").addEventListener("click", () => { state.fov = clamp(state.fov + 10, 45, 120); updateLabels(); });
  $("zoomReset").addEventListener("click", resetView);

  $("fov").addEventListener("input", e => { state.fov = +e.target.value; updateLabels(); });
  $("pitch").addEventListener("input", e => { state.pitch = +e.target.value; updateLabels(); });
  $("yaw").addEventListener("input", e => {
    state.yaw = +e.target.value;
    updateLabels();
  });

  $("brightness").addEventListener("input", e => {
    if (state.sphere) state.sphere.material.color.setScalar(+e.target.value / 100);
  });
  $("saturation").addEventListener("input", e => {
    if (state.sphere) state.sphere.material.color.setHSL(0, 1, +e.target.value / 200);
  });

  $("resolutionSelect").addEventListener("change", e => {
    state.faceSize = +e.target.value;
    if (state.generated) generateFaces();
  });

  document.querySelectorAll('input[name="format"]').forEach(r => {
    r.addEventListener("change", e => state.output = e.target.value);
  });

  document.querySelectorAll(".collapse-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.collapse);
      target.classList.toggle("collapsed");
      btn.textContent = target.classList.contains("collapsed") ? "▼" : "▲";
    });
  });

  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.mode;

      if (state.mode === "panorama") {
        viewer.style.display = "block";
        $("faces-card").style.display = "";
      } else if (state.mode === "cube") {
        viewer.style.display = "block";
        if (state.faces.length) showAllFaces();
      } else {
        viewer.style.display = "block";
        $("faceGrid").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  $("previewAllBtn").addEventListener("click", showAllFaces);
  $("helpBtn").addEventListener("click", () => $("helpModal").classList.remove("hidden"));
  $("helpClose").addEventListener("click", () => $("helpModal").classList.add("hidden"));
  $("allFacesClose").addEventListener("click", () => $("allFacesModal").classList.add("hidden"));

  $("themeBtn").addEventListener("click", () => document.body.classList.toggle("light"));

  document.querySelectorAll(".nav-item,.mobile-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section || btn.dataset.mobile;
      document.querySelectorAll(".nav-item,.mobile-nav-item").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(`[data-section="${target}"],[data-mobile="${target}"]`).forEach(x => x.classList.add("active"));

      if (target === "faces") $("faceGrid").scrollIntoView({ behavior: "smooth", block: "center" });
      if (target === "settings") $("viewSettings").scrollIntoView({ behavior: "smooth", block: "center" });
      if (target === "export") $("quickActions").scrollIntoView({ behavior: "smooth", block: "center" });
      if (target === "panorama") viewer.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target === "dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  $("brandBtn").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function showAllFaces() {
  if (!state.faces.length) return;
  const grid = $("allFacesGrid");
  grid.innerHTML = "";
  for (const face of state.faces) {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = face.canvas.toDataURL("image/png");
    img.alt = capitalize(face.name);
    const cap = document.createElement("figcaption");
    cap.textContent = `${capitalize(face.name)} · ${state.faceSize} × ${state.faceSize}`;
    figure.append(img, cap);
    grid.appendChild(figure);
  }
  $("allFacesModal").classList.remove("hidden");
}

window.addEventListener("resize", resizeViewer);
window.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    $("helpModal").classList.add("hidden");
    $("allFacesModal").classList.add("hidden");
  }
});

initStormPlaceholder();
initViewer();
setupViewerControls();
setupUI();
updateLabels();
