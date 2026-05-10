/**
 * GZ Curve Panel — Plotly chart + IMO criteria overlay + data table
 */
import { getState, subscribe } from '../store.js';
import { gzArea, findMaxGZAngle, findVanishingAngle } from '../engine/stability.js';

// IMO A.749(18) intact stability criteria
const IMO_CRITERIA = [
  { label: 'Area 0–30° ≥ 0.055 m·rad', key: 'area_0_30', limit: 0.055, unit: 'm·rad' },
  { label: 'Area 0–40° ≥ 0.090 m·rad', key: 'area_0_40', limit: 0.090, unit: 'm·rad' },
  { label: 'Area 30–40° ≥ 0.030 m·rad', key: 'area_30_40', limit: 0.030, unit: 'm·rad' },
  { label: 'Max GZ ≥ 0.200 m at θ ≥ 30°', key: 'max_gz', limit: 0.200, unit: 'm' },
  { label: 'Angle of max GZ ≥ 25°', key: 'max_angle', limit: 25, unit: '°' },
  { label: 'GM₀ ≥ 0.150 m', key: 'gm', limit: 0.150, unit: 'm' },
];

export function renderGZCurve(container) {
  container.innerHTML = buildShell();
  subscribe('gzCurve', gz => _plot(gz));
  subscribe('hydro', h => _updateCriteria(h, getState().gzCurve));
  _plot(getState().gzCurve);
}

function buildShell() {
  return `
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 20 Q7 4 12 10 Q17 16 22 4"/>
      </svg>
      <h2>GZ Righting Lever Curve</h2>
    </div>
    <p class="panel-sub">Wall-sided formula GZ curve from 0° to 90°. IMO A.749(18) intact stability criteria checked below.</p>
    <div id="gz-plot" class="gz-plot-div"></div>
    <div class="gz-bottom">
      <div id="gz-stats" class="gz-stats"></div>
      <div id="imo-table" class="imo-table-wrap"></div>
    </div>
  `;
}

function _plot(gzCurve) {
  if (!gzCurve || !gzCurve.length) return;
  const el = document.getElementById('gz-plot');
  if (!el || !window.Plotly) return;

  const angles = gzCurve.map(p => p.angle);
  const GZvals = gzCurve.map(p => p.GZ);
  const KNvals = gzCurve.map(p => p.KN);

  const { maxGZ, maxAngle } = findMaxGZAngle(gzCurve);
  const vanishing = findVanishingAngle(gzCurve);

  const traces = [
    {
      x: angles, y: GZvals, name: 'GZ (m)',
      type: 'scatter', mode: 'lines+markers',
      line: { color: '#00d4ff', width: 3, shape: 'spline' },
      marker: { color: '#00d4ff', size: 5 },
      fill: 'tozeroy', fillcolor: 'rgba(0,212,255,0.08)',
    },
    {
      x: angles, y: KNvals, name: 'KN (m)',
      type: 'scatter', mode: 'lines',
      line: { color: '#8b5cf6', width: 1.5, dash: 'dot' },
    },
    // IMO minimum GZ line at 0.2 m
    {
      x: [30, 90], y: [0.2, 0.2], name: 'IMO min GZ = 0.2m',
      type: 'scatter', mode: 'lines',
      line: { color: '#ef4444', width: 1.5, dash: 'dash' },
    },
    // Zero line
    {
      x: [0, 90], y: [0, 0], name: 'GZ = 0',
      type: 'scatter', mode: 'lines',
      line: { color: '#475569', width: 1 },
      showlegend: false,
    },
  ];

  const layout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(17,24,39,0.6)',
    font: { color: '#94a3b8', family: 'Inter, sans-serif', size: 11 },
    margin: { l: 55, r: 20, t: 20, b: 50 },
    xaxis: { title: 'Heel Angle θ (°)', range: [0, 90], gridcolor: '#1f2d4a', zerolinecolor: '#1f2d4a', dtick: 10 },
    yaxis: { title: 'GZ (m)', gridcolor: '#1f2d4a', zerolinecolor: '#334155' },
    legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', bgcolor: 'transparent' },
    shapes: [
      // Vertical line at max GZ angle
      { type: 'line', x0: maxAngle, x1: maxAngle, y0: 0, y1: maxGZ,
        line: { color: '#fbbf24', width: 1.5, dash: 'dot' } },
      // Vertical line at vanishing angle
      { type: 'line', x0: vanishing, x1: vanishing, y0: -0.05, y1: maxGZ * 0.5,
        line: { color: '#ef4444', width: 1.5, dash: 'dashdot' } },
    ],
    annotations: [
      { x: maxAngle, y: maxGZ, text: `Max GZ ${maxGZ.toFixed(3)}m @ ${maxAngle}°`,
        showarrow: true, arrowhead: 2, arrowcolor: '#fbbf24',
        font: { color: '#fbbf24', size: 10 }, bgcolor: 'rgba(0,0,0,0.5)', borderpad: 3 },
      { x: vanishing, y: 0, text: `Vanishing ${vanishing.toFixed(1)}°`,
        showarrow: true, arrowhead: 2, arrowcolor: '#ef4444', ay: 30,
        font: { color: '#ef4444', size: 10 }, bgcolor: 'rgba(0,0,0,0.5)', borderpad: 3 },
    ],
  };

  window.Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false });

  // Stats
  const statsEl = document.getElementById('gz-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="gz-stat"><span>Max GZ</span><strong>${maxGZ.toFixed(3)} m</strong></div>
      <div class="gz-stat"><span>Angle of Max GZ</span><strong>${maxAngle}°</strong></div>
      <div class="gz-stat"><span>Vanishing Angle</span><strong>${vanishing.toFixed(1)}°</strong></div>
      <div class="gz-stat"><span>Area 0–30°</span><strong>${gzArea(gzCurve,0,30).toFixed(4)} m·rad</strong></div>
      <div class="gz-stat"><span>Area 0–40°</span><strong>${gzArea(gzCurve,0,40).toFixed(4)} m·rad</strong></div>
      <div class="gz-stat"><span>Area 30–40°</span><strong>${gzArea(gzCurve,30,40).toFixed(4)} m·rad</strong></div>
    `;
  }

  _updateCriteria(getState().hydro, gzCurve);
}

function _updateCriteria(hydro, gzCurve) {
  if (!hydro || !gzCurve) return;
  const el = document.getElementById('imo-table');
  if (!el) return;

  const { maxGZ, maxAngle } = findMaxGZAngle(gzCurve);

  const values = {
    area_0_30: gzArea(gzCurve, 0, 30),
    area_0_40: gzArea(gzCurve, 0, 40),
    area_30_40: gzArea(gzCurve, 30, 40),
    max_gz: maxGZ,
    max_angle: maxAngle,
    gm: hydro.GM,
  };

  const rows = IMO_CRITERIA.map(c => {
    const val = values[c.key];
    const pass = val >= c.limit;
    return `
      <tr class="${pass ? 'imo-pass' : 'imo-fail'}">
        <td>${c.label}</td>
        <td class="imo-val">${val?.toFixed(3)} ${c.unit}</td>
        <td class="imo-req">≥ ${c.limit} ${c.unit}</td>
        <td class="imo-status">${pass ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>`;
  }).join('');

  const allPass = IMO_CRITERIA.every(c => values[c.key] >= c.limit);

  el.innerHTML = `
    <h3 class="section-label">IMO A.749(18) Intact Stability Criteria</h3>
    <div class="imo-badge ${allPass ? 'imo-all-pass' : 'imo-has-fail'}">
      ${allPass ? '✅ All criteria satisfied' : '❌ One or more criteria NOT satisfied'}
    </div>
    <table class="imo-table">
      <thead><tr><th>Criterion</th><th>Computed</th><th>Required</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
