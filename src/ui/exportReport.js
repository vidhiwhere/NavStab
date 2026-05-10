/**
 * Export Report — PDF via jsPDF + Excel via XLSX
 */
import { getState } from '../store.js';

export function renderExport(container) {
  container.innerHTML = `
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <h2>Export Report</h2>
    </div>
    <p class="panel-sub">Export the full hydrostatic report as PDF or Excel.</p>

    <div class="export-cards">
      <div class="export-card">
        <div class="export-icon">📄</div>
        <h3>PDF Report</h3>
        <p>Comprehensive hydrostatic summary with all computed parameters, GZ data, and IMO criteria check.</p>
        <button id="export-pdf-btn" class="btn btn-primary">Download PDF</button>
      </div>
      <div class="export-card">
        <div class="export-icon">📊</div>
        <h3>Excel Workbook</h3>
        <p>Multi-sheet workbook: Ship Parameters, Offset Table, Hydrostatic Table, GZ Curve data.</p>
        <button id="export-xlsx-btn" class="btn btn-secondary">Download Excel</button>
      </div>
    </div>

    <div id="export-preview" class="export-preview"></div>
  `;

  container.querySelector('#export-pdf-btn').addEventListener('click', exportPDF);
  container.querySelector('#export-xlsx-btn').addEventListener('click', exportExcel);
}

async function exportPDF() {
  const { hydro, gzCurve, ship } = getState();
  if (!hydro) { alert('No data to export.'); return; }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NavStab — Hydrostatic Report', 14, 14);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  doc.text(`Vessel: ${ship.name}`, W - 14, 22, { align: 'right' });

  y = 38;

  // Ship params
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Principal Dimensions', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const dims = [
    ['LOA', `${ship.LOA} m`], ['LBP', `${ship.LBP} m`], ['B', `${ship.B} m`],
    ['T', `${ship.T} m`], ['D', `${ship.D} m`], ['KG', `${ship.KG} m`],
    ['CB', ship.CB.toFixed(3)], ['ρ', `${ship.rho} kg/m³`],
  ];
  dims.forEach(([k, v], i) => {
    const col = i % 2 === 0 ? 14 : 110;
    if (i % 2 === 0 && i > 0) y += 5;
    doc.text(`${k}: ${v}`, col, y);
  });
  y += 12;

  // Hydrostatic table
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Hydrostatic Parameters', 14, y); y += 7;

  const params = [
    ['Displacement (Δ)', `${hydro.displacement.toFixed(2)} t`],
    ['Volume (∇)', `${hydro.volume.toFixed(2)} m³`],
    ['Waterplane Area (Aw)', `${hydro.Aw.toFixed(2)} m²`],
    ['KB', `${hydro.KB.toFixed(3)} m`],
    ['BM', `${hydro.BM.toFixed(3)} m`],
    ['KM', `${hydro.KM.toFixed(3)} m`],
    ['GM', `${hydro.GM.toFixed(3)} m`],
    ['GML', `${hydro.GML.toFixed(3)} m`],
    ['TPC', `${hydro.TPC.toFixed(4)} t/cm`],
    ['MCTC', `${hydro.MCTC.toFixed(4)} t·m/cm`],
    ['LCB (from AP)', `${hydro.LCB_AP.toFixed(3)} m`],
    ['LCF (from AP)', `${hydro.LCF_AP.toFixed(3)} m`],
    ['CB', hydro.CB.toFixed(4)],
    ['CW', hydro.CW.toFixed(4)],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  params.forEach(([k, v], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(13, y - 3.5, W - 26, 5.5, 'F');
    }
    doc.text(`${k}`, 15, y);
    doc.text(`${v}`, W - 15, y, { align: 'right' });
    y += 6;
    if (y > 260) { doc.addPage(); y = 20; }
  });

  // GZ data table
  if (gzCurve && gzCurve.length) {
    doc.addPage();
    y = 20;
    doc.setTextColor(0, 212, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('GZ Curve Data', 14, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text('Angle (°)', 14, y); doc.text('GZ (m)', 60, y); doc.text('KN (m)', 110, y);
    y += 5;
    gzCurve.forEach(p => {
      doc.text(`${p.angle}°`, 14, y);
      doc.text(`${p.GZ.toFixed(4)}`, 60, y);
      doc.text(`${p.KN.toFixed(4)}`, 110, y);
      y += 5;
    });
  }

  doc.save(`NavStab_${ship.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

async function exportExcel() {
  const { hydro, gzCurve, offsetTable, ship } = getState();
  if (!hydro) { alert('No data to export.'); return; }

  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // Sheet 1: Ship Parameters
  const shipRows = [
    ['Parameter', 'Value', 'Unit'],
    ['Vessel Name', ship.name, ''],
    ['LOA', ship.LOA, 'm'],
    ['LBP', ship.LBP, 'm'],
    ['Breadth (B)', ship.B, 'm'],
    ['Draft (T)', ship.T, 'm'],
    ['Depth (D)', ship.D, 'm'],
    ['KG', ship.KG, 'm'],
    ['CB', ship.CB, ''],
    ['CM', ship.CM, ''],
    ['CW', ship.CW, ''],
    ['Sea Water Density', ship.rho, 'kg/m³'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(shipRows), 'Ship Parameters');

  // Sheet 2: Hydrostatics
  const hydroRows = [
    ['Parameter', 'Symbol', 'Value', 'Unit'],
    ['Displacement', 'Δ', hydro.displacement.toFixed(2), 't'],
    ['Volume', '∇', hydro.volume.toFixed(3), 'm³'],
    ['Waterplane Area', 'Aw', hydro.Aw.toFixed(2), 'm²'],
    ['KB', 'KB', hydro.KB.toFixed(4), 'm'],
    ['BM', 'BM', hydro.BM.toFixed(4), 'm'],
    ['BML', 'BML', hydro.BML.toFixed(4), 'm'],
    ['KM', 'KM', hydro.KM.toFixed(4), 'm'],
    ['GM', 'GM', hydro.GM.toFixed(4), 'm'],
    ['GML', 'GML', hydro.GML.toFixed(4), 'm'],
    ['TPC', 'TPC', hydro.TPC.toFixed(5), 't/cm'],
    ['MCTC', 'MCTC', hydro.MCTC.toFixed(5), 't·m/cm'],
    ['LCB from AP', 'LCB', hydro.LCB_AP.toFixed(4), 'm'],
    ['LCF from AP', 'LCF', hydro.LCF_AP.toFixed(4), 'm'],
    ['Block Coefficient', 'CB', hydro.CB.toFixed(5), ''],
    ['Waterplane Coefficient', 'CW', hydro.CW.toFixed(5), ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hydroRows), 'Hydrostatics');

  // Sheet 3: GZ Curve
  if (gzCurve) {
    const gzRows = [['Angle (°)', 'GZ (m)', 'KN (m)', 'GZ check (m)'],
      ...gzCurve.map(p => [p.angle, p.GZ, p.KN, p.GZcheck])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gzRows), 'GZ Curve');
  }

  // Sheet 4: Offset Table
  if (offsetTable) {
    const header = ['WL \\ Stn', ...offsetTable.stations.map((s, i) => `Stn ${i}`)];
    const otRows = [header, ...offsetTable.halfBreadths.map((row, wi) => [
      `WL ${offsetTable.waterlineDefs?.[wi]?.id ?? wi} (${offsetTable.waterlines[wi].toFixed(2)}m)`,
      ...row.map(v => +v.toFixed(4))
    ])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(otRows), 'Offset Table');
  }

  XLSX.writeFile(wb, `NavStab_${ship.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
}
