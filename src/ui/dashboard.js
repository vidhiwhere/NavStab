/**
 * Dashboard KPI Cards
 */
import { getState, subscribe } from '../store.js';

export function renderDashboard(container) {
  _render(container, getState().hydro, getState().ship);
  subscribe('hydro', h => _render(container, h, getState().ship));
}

function _render(container, hydro, ship) {
  if (!hydro) {
    container.innerHTML = `<div class="no-data">No data — configure ship parameters first.</div>`;
    return;
  }

  const {
    displacement, volume, Aw, KB, KM, GM, BM, BML,
    TPC, MCTC, LCB_AP, LCF_AP, LBP, CW, CB, GML
  } = hydro;

  const gmClass = GM >= 0.15 ? 'kpi-good' : GM >= 0 ? 'kpi-warn' : 'kpi-bad';

  container.innerHTML = `
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
      <h2>Hydrostatic Summary</h2>
    </div>
    <p class="panel-sub">
      <strong>${ship.name}</strong> &nbsp;|&nbsp; LBP ${fmt(LBP, 1)} m &nbsp;|&nbsp;
      B ${fmt(ship.B, 1)} m &nbsp;|&nbsp; T ${fmt(ship.T, 2)} m &nbsp;|&nbsp; ρ = ${ship.rho} kg/m³
    </p>

    <div class="kpi-grid">
      ${kpi('Displacement', fmt(displacement, 0), 't', '🚢', 'kpi-neutral')}
      ${kpi('Volume ∇', fmt(volume, 0), 'm³', '📦', 'kpi-neutral')}
      ${kpi('Waterplane Aw', fmt(Aw, 0), 'm²', '〰️', 'kpi-neutral')}
      ${kpi('GM (transverse)', fmt(GM, 3), 'm', '⚖️', gmClass)}
      ${kpi('GML (longit.)', fmt(GML, 3), 'm', '📐', 'kpi-neutral')}
      ${kpi('KB', fmt(KB, 3), 'm', '⬆️', 'kpi-neutral')}
      ${kpi('KM', fmt(KM, 3), 'm', '🎯', 'kpi-neutral')}
      ${kpi('BM', fmt(BM, 3), 'm', '📏', 'kpi-neutral')}
      ${kpi('TPC', fmt(TPC, 3), 't/cm', '⚓', 'kpi-neutral')}
      ${kpi('MCTC', fmt(MCTC, 3), 't·m/cm', '🔄', 'kpi-neutral')}
      ${kpi('LCB (from AP)', fmt(LCB_AP, 2), 'm', '🔵', 'kpi-neutral')}
      ${kpi('LCF (from AP)', fmt(LCF_AP, 2), 'm', '⬤', 'kpi-neutral')}
      ${kpi('C\u1d2e (Block)', fmt(CB, 3), '', '📊', 'kpi-neutral')}
      ${kpi('C\u1d42 (WP)', fmt(CW, 3), '', '〽️', 'kpi-neutral')}
    </div>

    <div class="summary-table-wrap">
      <h3 class="section-label">Full Hydrostatic Table</h3>
      <table class="hydro-table">
        <thead><tr>
          <th>Parameter</th><th>Symbol</th><th>Value</th><th>Unit</th>
        </tr></thead>
        <tbody>
          ${row('Displacement', 'Δ', fmt(displacement,2), 't')}
          ${row('Displaced Volume', '∇', fmt(volume,3), 'm³')}
          ${row('Waterplane Area', 'Aw', fmt(Aw,2), 'm²')}
          ${row('Keel to Centre of Buoyancy', 'KB', fmt(KB,3), 'm')}
          ${row('Metacentric Radius (transv.)', 'BM', fmt(BM,3), 'm')}
          ${row('Metacentric Radius (longit.)', 'BML', fmt(BML,3), 'm')}
          ${row('Keel to Metacentre', 'KM', fmt(KM,3), 'm')}
          ${row('Metacentric Height', 'GM', fmt(GM,3), 'm')}
          ${row('Longit. Metacentric Height', 'GML', fmt(GML,3), 'm')}
          ${row('Tonnes Per Centimetre', 'TPC', fmt(TPC,4), 't/cm')}
          ${row('Moment to Change Trim 1cm', 'MCTC', fmt(MCTC,4), 't·m/cm')}
          ${row('LCB from AP', 'LCB', fmt(LCB_AP,3), 'm')}
          ${row('LCF from AP', 'LCF', fmt(LCF_AP,3), 'm')}
          ${row('Block Coefficient', 'CB', fmt(CB,4), '—')}
          ${row('Waterplane Coefficient', 'CW', fmt(CW,4), '—')}
          ${row('KG (input)', 'KG', fmt(ship.KG,3), 'm')}
        </tbody>
      </table>
    </div>
  `;
}

function kpi(label, value, unit, icon, cls) {
  return `
    <div class="kpi-card ${cls}">
      <div class="kpi-top">
        <span class="kpi-icon">${icon}</span>
      </div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-unit">${unit}</div>
      <div class="kpi-label">${label}</div>
    </div>`;
}

function row(name, sym, val, unit) {
  return `<tr><td>${name}</td><td class="sym"><em>${sym}</em></td><td class="val">${val}</td><td class="unit-cell">${unit}</td></tr>`;
}

function fmt(v, d) { return v != null ? (+v).toFixed(d) : '—'; }
