/**
 * Ship Parameters Input Panel
 */
import { getState, updateShip } from '../store.js';

export function renderShipParams(container) {
  const s = getState().ship;

  container.innerHTML = `
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 17l9-13 9 13H3z"/><path d="M3 17h18"/>
      </svg>
      <h2>Principal Dimensions</h2>
    </div>
    <p class="panel-sub">Edit the ship's principal dimensions. All hydrostatic results update automatically.</p>
    <form id="ship-params-form" class="params-form">
      <div class="params-grid">
        ${field('name','Vessel Name','text', s.name,'', '')}
        ${field('LOA','LOA','number', s.LOA,'m','Length Overall')}
        ${field('LBP','LBP','number', s.LBP,'m','Length Between Perpendiculars')}
        ${field('B','Breadth (B)','number', s.B,'m','Moulded Breadth')}
        ${field('T','Draft (T)','number', s.T,'m','Design Draft')}
        ${field('D','Depth (D)','number', s.D,'m','Moulded Depth')}
        ${field('KG','KG','number', s.KG,'m','Height of Centre of Gravity')}
        ${field('CB','C\u1d2e (Block)','number', s.CB,'','Block Coefficient')}
        ${field('CM','C\u1d39 (Midship)','number', s.CM,'','Midship Section Coefficient')}
        ${field('CW','C\u1d42 (WP)','number', s.CW,'','Waterplane Coefficient')}
        ${field('rho','Sea Water ρ','number', s.rho,'kg/m³','Water density')}
        ${field('numStations','Stations','number', s.numStations,'','Number of stations (5–41)')}
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="apply-ship-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Apply & Recalculate
        </button>
        <button type="button" class="btn btn-ghost" id="reset-ship-btn">Reset to Default</button>
      </div>
    </form>
  `;

  container.querySelector('#ship-params-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const params = {};
    for (const [k, v] of fd.entries()) {
      params[k] = isNaN(v) || k === 'name' ? v : parseFloat(v);
    }
    updateShip(params);
    showToast('Recalculated ✓');
  });

  container.querySelector('#reset-ship-btn').addEventListener('click', () => {
    import('../engine/hullGenerator.js').then(({ DEFAULT_SHIP }) => {
      updateShip({ ...DEFAULT_SHIP });
      renderShipParams(container);
      showToast('Reset to defaults');
    });
  });
}

function field(id, label, type, val, unit, hint) {
  return `
    <div class="param-field">
      <label for="param-${id}">${label}${unit ? ` <span class="unit">${unit}</span>` : ''}</label>
      <input id="param-${id}" name="${id}" type="${type}" value="${val}"
        step="${type === 'number' ? 'any' : undefined}"
        class="param-input" autocomplete="off"/>
      ${hint ? `<span class="field-hint">${hint}</span>` : ''}
    </div>`;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
}
