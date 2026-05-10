/**
 * Hydrostatic Curves — Plotly charts: Aw, KB, BM, GM, TPC, MCTC vs Draft
 */
import { getState, subscribe } from '../store.js';

export function renderHydroCurves(container) {
  container.innerHTML = buildShell();
  subscribe('hydroCurves', curves => plotAll(curves));
  plotAll(getState().hydroCurves);
}

function buildShell() {
  return `
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <h2>Hydrostatic Curves of Form</h2>
    </div>
    <p class="panel-sub">All parameters plotted against draft (T). Scroll right to see all charts.</p>
    <div class="hydro-charts-grid" id="hc-grid">
      <div class="chart-card"><div class="chart-title">Waterplane Area A<sub>w</sub> vs Draft</div><div id="hc-aw" class="chart-div"></div></div>
      <div class="chart-card"><div class="chart-title">KB vs Draft</div><div id="hc-kb" class="chart-div"></div></div>
      <div class="chart-card"><div class="chart-title">BM vs Draft</div><div id="hc-bm" class="chart-div"></div></div>
      <div class="chart-card"><div class="chart-title">KM vs Draft</div><div id="hc-km" class="chart-div"></div></div>
      <div class="chart-card"><div class="chart-title">GM vs Draft</div><div id="hc-gm" class="chart-div"></div></div>
      <div class="chart-card"><div class="chart-title">TPC vs Draft</div><div id="hc-tpc" class="chart-div"></div></div>
    </div>`;
}

const LAYOUT_BASE = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(17,24,39,0.6)',
  font: { color: '#94a3b8', family: 'Inter, sans-serif', size: 11 },
  margin: { l: 50, r: 12, t: 10, b: 40 },
  xaxis: { gridcolor: '#1f2d4a', zerolinecolor: '#1f2d4a', title: { text: 'Draft (m)' } },
  yaxis: { gridcolor: '#1f2d4a', zerolinecolor: '#1f2d4a' },
};

function plotAll(curves) {
  if (!curves || curves.length < 2) return;
  const drafts = curves.map(c => c.draft);

  chart('hc-aw', drafts, curves.map(c => c.Aw), 'Aw (m²)', '#00d4ff');
  chart('hc-kb', drafts, curves.map(c => c.KB), 'KB (m)', '#3b82f6');
  chart('hc-bm', drafts, curves.map(c => c.BM), 'BM (m)', '#8b5cf6');
  chart('hc-km', drafts, curves.map(c => c.KM), 'KM (m)', '#06b6d4');
  chart('hc-gm', drafts, curves.map(c => c.GM), 'GM (m)', '#10b981');
  chart('hc-tpc', drafts, curves.map(c => c.TPC), 'TPC (t/cm)', '#f59e0b');
}

function chart(id, x, y, yLabel, color) {
  const el = document.getElementById(id);
  if (!el) return;
  const trace = {
    x, y,
    mode: 'lines+markers',
    type: 'scatter',
    line: { color, width: 2.5, shape: 'spline' },
    marker: { color, size: 5 },
    name: yLabel,
  };
  const layout = {
    ...LAYOUT_BASE,
    yaxis: { ...LAYOUT_BASE.yaxis, title: { text: yLabel } },
  };
  if (window.Plotly) {
    window.Plotly.newPlot(el, [trace], layout, { responsive: true, displayModeBar: false });
  }
}
