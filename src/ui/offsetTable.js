/**
 * Offset Table Editor — editable grid + paste support
 */
import { getState, setOffsetTable, subscribe } from '../store.js';

export function renderOffsetTable(container) {
  _render(container);
  subscribe('ship', () => _render(container));
}

function _render(container) {
  const { offsetTable, ship } = getState();
  if (!offsetTable) return;

  const { stations, waterlines, halfBreadths, waterlineDefs } = offsetTable;
  const nWL = waterlines.length;
  const nSt = stations.length;

  // Build table header (stations)
  const stHeaders = stations.map((s, i) => `<th title="Stn ${i}">${i}</th>`).join('');

  // Build rows (waterlines × stations)
  const rows = waterlines.map((wl, wi) => {
    const wlId = waterlineDefs?.[wi]?.id ?? wi;
    const cells = halfBreadths[wi].map((hb, si) =>
      `<td><input class="ot-cell" data-wi="${wi}" data-si="${si}" type="number" step="any" value="${hb.toFixed(3)}" /></td>`
    ).join('');
    return `<tr><td class="ot-wl-label">WL ${wlId}<br/><span class="ot-wl-h">${wl.toFixed(2)}m</span></td>${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
      </svg>
      <h2>Offset Table <span class="badge">${nWL} WL × ${nSt} Stn</span></h2>
    </div>
    <p class="panel-sub">
      Half-breadths (y, metres) at each station × waterline. Edit cells directly or paste a CSV/tab-separated table below.
    </p>

    <div class="ot-scroll-wrap">
      <table class="offset-table" id="ot-grid">
        <thead>
          <tr>
            <th class="ot-corner">WL \\ Stn</th>
            ${stHeaders}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="ot-paste-section">
      <label class="paste-label" for="ot-paste">📋 Paste External Table (rows=waterlines, cols=stations, tab/comma/space separated):</label>
      <textarea id="ot-paste" class="paste-area" rows="6" placeholder="Paste tab/comma-separated data here…"></textarea>
      <div class="form-actions" style="margin-top:0.75rem">
        <button id="ot-paste-btn" class="btn btn-primary">Import Pasted Data</button>
        <button id="ot-apply-btn" class="btn btn-secondary">Apply Grid Changes</button>
        <button id="ot-reset-btn" class="btn btn-ghost">Reset to Generated</button>
      </div>
    </div>
  `;

  // Apply grid edits
  container.querySelector('#ot-apply-btn').addEventListener('click', () => {
    applyGridChanges(container, offsetTable);
  });

  // Paste import
  container.querySelector('#ot-paste-btn').addEventListener('click', () => {
    const text = container.querySelector('#ot-paste').value.trim();
    if (!text) return;
    import('../engine/hullGenerator.js').then(({ parseOffsetTable }) => {
      const parsed = parseOffsetTable(text, ship);
      if (parsed) { setOffsetTable(parsed); _render(container); showToast('Table imported ✓'); }
      else showToast('Parse failed — check format', true);
    });
  });

  // Reset
  container.querySelector('#ot-reset-btn').addEventListener('click', () => {
    import('../engine/hullGenerator.js').then(({ generateOffsetTable }) => {
      setOffsetTable(generateOffsetTable(ship));
      _render(container);
      showToast('Reset to generated table');
    });
  });
}

function applyGridChanges(container, offsetTable) {
  const cells = container.querySelectorAll('.ot-cell');
  const newHB = offsetTable.halfBreadths.map(row => [...row]);
  cells.forEach(cell => {
    const wi = +cell.dataset.wi;
    const si = +cell.dataset.si;
    const v = parseFloat(cell.value);
    if (!isNaN(v)) newHB[wi][si] = v;
  });
  setOffsetTable({ ...offsetTable, halfBreadths: newHB });
  showToast('Grid applied & recalculated ✓');
}

function showToast(msg, isErr = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' toast-err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}
