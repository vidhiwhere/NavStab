/**
 * 3D Hull Viewer — Three.js wireframe from offset table
 */
import * as THREE from 'three';
import { getState, subscribe } from '../store.js';

let renderer, scene, camera, animId;

export function renderHullViewer(container) {
  container.innerHTML = `
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
      <h2>3D Hull Wireframe</h2>
    </div>
    <p class="panel-sub">Interactive 3D view of the hull form derived from the offset table. Click + drag to rotate.</p>
    <div id="hull-canvas-wrap" class="hull-canvas-wrap">
      <canvas id="hull-canvas"></canvas>
      <div class="hull-overlay">
        <span class="hull-hint">🖱 Drag to rotate · Scroll to zoom</span>
      </div>
    </div>
  `;

  // Double rAF: first ensures DOM is in document, second ensures layout/paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    initThree();
    buildHull(getState().offsetTable);
  }));
  subscribe('offsetTable', t => buildHull(t));
  subscribe('ship', () => buildHull(getState().offsetTable));
}

function initThree() {
  if (renderer) { renderer.dispose(); cancelAnimationFrame(animId); }

  const canvas = document.getElementById('hull-canvas');
  const wrap = document.getElementById('hull-canvas-wrap');
  if (!canvas || !wrap) return;

  const W = wrap.clientWidth || 800;
  const H = Math.min(420, window.innerHeight * 0.45);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 5000);
  camera.position.set(250, 80, 350);
  camera.lookAt(0, 0, 0);

  // Lights
  scene.add(new THREE.AmbientLight(0x334466, 1.5));
  const dl = new THREE.DirectionalLight(0x00d4ff, 1);
  dl.position.set(1, 2, 3);
  scene.add(dl);

  // Mouse drag rotation
  let drag = false, lastX = 0, lastY = 0;
  let rotX = 0.2, rotY = 0;

  canvas.addEventListener('mousedown', e => { drag = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', () => { drag = false; });
  canvas.addEventListener('mousemove', e => {
    if (!drag) return;
    rotY += (e.clientX - lastX) * 0.005;
    rotX += (e.clientY - lastY) * 0.005;
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    lastX = e.clientX; lastY = e.clientY;
  });

  // Touch support
  canvas.addEventListener('touchstart', e => { drag = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; });
  canvas.addEventListener('touchend', () => { drag = false; });
  canvas.addEventListener('touchmove', e => {
    if (!drag) return;
    rotY += (e.touches[0].clientX - lastX) * 0.006;
    lastX = e.touches[0].clientX;
  });

  // Scroll to zoom
  canvas.addEventListener('wheel', e => {
    camera.position.multiplyScalar(1 + e.deltaY * 0.001);
    e.preventDefault();
  }, { passive: false });

  // Grid
  const grid = new THREE.GridHelper(600, 20, 0x1f2d4a, 0x1f2d4a);
  grid.position.y = -15;
  scene.add(grid);

  function animate() {
    animId = requestAnimationFrame(animate);
    if (scene.userData.hullGroup) {
      scene.userData.hullGroup.rotation.x = rotX;
      scene.userData.hullGroup.rotation.y = rotY;
    }
    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    const nW = wrap.clientWidth || 800;
    renderer.setSize(nW, H);
    camera.aspect = nW / H;
    camera.updateProjectionMatrix();
  });
}

function buildHull(offsetTable) {
  if (!offsetTable || !scene) return;
  const { stations, waterlines, halfBreadths } = offsetTable;

  // Remove old hull
  if (scene.userData.hullGroup) {
    scene.remove(scene.userData.hullGroup);
    scene.userData.hullGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  const group = new THREE.Group();
  const nWL = waterlines.length;
  const nSt = stations.length;
  const LBP = stations[stations.length - 1];
  const cx = LBP / 2;

  const mat = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.75 });
  const wlMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 });
  const keel = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });

  // Draw station curves (frames)
  for (let si = 0; si < nSt; si++) {
    const pts = [];
    const x = stations[si] - cx;
    for (let wi = nWL - 1; wi >= 0; wi--) {
      const y = waterlines[wi];
      const z = halfBreadths[wi][si];
      pts.push(new THREE.Vector3(x, y, -z));
    }
    // Keel point (z=0)
    pts.push(new THREE.Vector3(x, 0, 0));
    for (let wi = 0; wi < nWL; wi++) {
      const y = waterlines[wi];
      const z = halfBreadths[wi][si];
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geom, mat));
  }

  // Draw waterlines
  for (let wi = 0; wi < nWL; wi++) {
    const pts = [];
    for (let si = 0; si < nSt; si++) {
      pts.push(new THREE.Vector3(stations[si] - cx, waterlines[wi], halfBreadths[wi][si]));
    }
    for (let si = nSt - 1; si >= 0; si--) {
      pts.push(new THREE.Vector3(stations[si] - cx, waterlines[wi], -halfBreadths[wi][si]));
    }
    pts.push(pts[0].clone());
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geom, wlMat));
  }

  // Keel line
  const keelPts = stations.map(x => new THREE.Vector3(x - cx, 0, 0));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(keelPts), keel));

  scene.userData.hullGroup = group;
  scene.add(group);
}
