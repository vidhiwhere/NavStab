/**
 * NavStab — Main App Shell
 * Sidebar navigation + section router wired to all UI panels
 */
import './style.css';
import { setActiveSection, subscribe, getState } from './store.js';
import { renderDashboard }   from './ui/dashboard.js';
import { renderShipParams }  from './ui/shipParams.js';
import { renderOffsetTable } from './ui/offsetTable.js';
import { renderHydroCurves } from './ui/hydroCurves.js';
import { renderGZCurve }     from './ui/gzCurve.js';
import { renderHullViewer }  from './ui/hullViewer.js';
import { renderExport }      from './ui/exportReport.js';

// ── Nav structure ─────────────────────────────────────────────────────────────
const NAV = [
  {
    section: 'Input',
    items: [
      { id: 'ship',    label: 'Ship Parameters', icon: shipIcon() },
      { id: 'offsets', label: 'Offset Table',    icon: tableIcon() },
    ],
  },
  {
    section: 'Results',
    items: [
      { id: 'dashboard', label: 'Hydrostatics',    icon: dashIcon() },
      { id: 'hydrocurves', label: 'Curves of Form', icon: curveIcon() },
      { id: 'gz',          label: 'GZ Curve & IMO', icon: gzIcon() },
    ],
  },
  {
    section: 'Visualisation',
    items: [
      { id: 'hull3d', label: '3D Hull Viewer', icon: cubeIcon() },
    ],
  },
  {
    section: 'Export',
    items: [
      { id: 'export', label: 'Export Report', icon: exportIcon() },
    ],
  },
];

// Section renderers map
const RENDERERS: Record<string, (el: HTMLElement) => void> = {
  ship:       renderShipParams,
  offsets:    renderOffsetTable,
  dashboard:  renderDashboard,
  hydrocurves: renderHydroCurves,
  gz:         renderGZCurve,
  hull3d:     renderHullViewer,
  export:     renderExport,
};

// Section titles for topbar
const TITLES: Record<string, string> = {
  ship:        'Ship Principal Dimensions',
  offsets:     'Offset Table Editor',
  dashboard:   'Hydrostatic Summary',
  hydrocurves: 'Hydrostatic Curves of Form',
  gz:          'GZ Righting Lever Curve & IMO Criteria',
  hull3d:      '3D Hull Wireframe Viewer',
  export:      'Export Report',
};

// ── Build app ─────────────────────────────────────────────────────────────────
const app = document.getElementById('app')!;

app.innerHTML = `
  <!-- Sidebar -->
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-mark">⚓</div>
      <div>
        <div class="logo-text">NavStab</div>
        <span class="logo-sub">Naval Architecture Suite</span>
      </div>
    </div>
    <div class="sidebar-nav" id="sidebar-nav">
      ${NAV.map(group => `
        <div class="sidebar-section-label">${group.section}</div>
        ${group.items.map(item => `
          <div class="nav-item" data-section="${item.id}" id="nav-${item.id}">
            ${item.icon}
            ${item.label}
          </div>
        `).join('')}
      `).join('')}
    </div>
    <div class="sidebar-footer">v1.0 &nbsp;·&nbsp; IMO A.749(18)</div>
  </nav>

  <!-- Main -->
  <div class="main-area">
    <header class="topbar">
      <div class="topbar-title" id="topbar-title">Hydrostatic Summary</div>
      <div class="topbar-ship" id="topbar-ship">Loading…</div>
      <div class="status-dot" title="Engine active"></div>
    </header>
    <main class="content-area" id="content-area">
      <!-- Section content renders here -->
    </main>
  </div>
`;

// ── Navigation ────────────────────────────────────────────────────────────────
const contentArea = document.getElementById('content-area')!;
const topbarTitle = document.getElementById('topbar-title')!;
const topbarShip  = document.getElementById('topbar-ship')!;
let currentSection = '';
const sectionCache: Record<string, HTMLElement> = {};

function navigateTo(sectionId: string) {
  if (currentSection === sectionId) return;
  currentSection = sectionId;

  // Update nav highlight
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${sectionId}`)?.classList.add('active');

  // Update topbar
  topbarTitle.textContent = TITLES[sectionId] || sectionId;

  // Render section (lazily, once)
  contentArea.innerHTML = '';
  if (!sectionCache[sectionId]) {
    const el = document.createElement('div');
    el.id = `section-${sectionId}`;
    RENDERERS[sectionId]?.(el);
    sectionCache[sectionId] = el;
  }
  contentArea.appendChild(sectionCache[sectionId]);
  setActiveSection(sectionId);
}

// Attach nav click handlers
document.getElementById('sidebar-nav')!.addEventListener('click', e => {
  const item = (e.target as HTMLElement).closest('.nav-item') as HTMLElement | null;
  if (item?.dataset.section) navigateTo(item.dataset.section);
});

// Update topbar ship info reactively
function updateTopbar() {
  const { ship } = getState();
  topbarShip.textContent = `${ship.name}  ·  LBP ${ship.LBP}m  ·  T ${ship.T}m`;
}
subscribe('ship', updateTopbar);
updateTopbar();

// Subscribe to navigation events
subscribe('navigate', (id: string) => navigateTo(id));

// Boot to dashboard
navigateTo('dashboard');

// ── SVG Icon Helpers ──────────────────────────────────────────────────────────
function shipIcon()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l9-13 9 13H3z"/><path d="M3 17h18"/></svg>`; }
function tableIcon()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`; }
function dashIcon()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`; }
function curveIcon()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`; }
function gzIcon()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20 Q7 4 12 10 Q17 16 22 4"/></svg>`; }
function cubeIcon()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`; }
function exportIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`; }
