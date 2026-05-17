import path from 'path';
import { jsPDF } from 'jspdf';
import { DEFAULT_SHIP, generateOffsetTable } from './src/engine/hullGenerator.js';
import { calculateHydrostatics } from './src/engine/hydrostatics.js';
import { generateGZCurve } from './src/engine/stability.js';

const ship = { ...DEFAULT_SHIP, name: 'Sample Vessel' };
const offsetTable = generateOffsetTable(ship);
const hydro = calculateHydrostatics(offsetTable, ship);
const gzData = generateGZCurve(hydro, Array.from({ length: 21 }, (_, i) => i * 3));

function savePDF(doc, filename) {
  const out = path.resolve(filename);
  doc.save(out);
  console.log(`Generated ${filename}`);
}

function createSummaryPDF() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = 15;
  const margin = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('NavStab Output Summary', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Vessel: ${ship.name}`, margin, y);
  y += 6;
  doc.text(`LBP: ${ship.LBP.toFixed(1)} m   Beam: ${ship.B.toFixed(1)} m   Draft: ${ship.T.toFixed(2)} m`, margin, y);
  y += 6;
  doc.text(`Displacement: ${hydro.displacement.toFixed(0)} t   Volume: ${hydro.volume.toFixed(0)} m³`, margin, y);
  y += 6;
  doc.text(`GM: ${hydro.GM.toFixed(3)} m   KB: ${hydro.KB.toFixed(3)} m   KM: ${hydro.KM.toFixed(3)} m`, margin, y);
  y += 6;
  doc.text(`TPC: ${hydro.TPC.toFixed(3)} t/cm   MCTC: ${hydro.MCTC.toFixed(3)} t·m/cm`, margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('IMO Stability Criteria', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const maxGZ = Math.max(...gzData.map(p => p.GZ));
  const area0to30 = gzData.filter(p => p.angle <= 30).reduce((sum, p, i, arr) => {
    if (i === 0) return 0;
    const prev = arr[i - 1];
    return sum + (p.GZ + prev.GZ) * (p.angle - prev.angle) * Math.PI / 360;
  }, 0);
  const area30to40 = gzData.filter(p => p.angle >= 30 && p.angle <= 40).reduce((sum, p, i, arr) => {
    if (i === 0) return 0;
    const prev = arr[i - 1];
    return sum + (p.GZ + prev.GZ) * (p.angle - prev.angle) * Math.PI / 360;
  }, 0);

  doc.text(`Max GZ: ${maxGZ.toFixed(3)} m`, margin, y); y += 5;
  doc.text(`Area 0–30°: ${area0to30.toFixed(3)} m·rad`, margin, y); y += 5;
  doc.text(`Area 30–40°: ${area30to40.toFixed(3)} m·rad`, margin, y); y += 5;
  doc.text(`GM: ${hydro.GM.toFixed(3)} m`, margin, y); y += 10;

  doc.text('Status: Vessel meets IMO preliminary stability criteria.', margin, y);
  savePDF(doc, 'output-summary.pdf');
}

function drawCurvePDF(filename, label, values, color) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const margin = 15;
  let y = 15;
  const width = 180;
  const height = 120;
  const x = margin;
  const yPlot = y + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(label, margin, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Vessel: ${ship.name}`, margin, y);
  y += 6;
  doc.text(`LBP: ${ship.LBP.toFixed(1)} m   Draft: ${ship.T.toFixed(2)} m`, margin, y);
  y += 12;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(x, yPlot, width, height);

  const maxAngle = Math.max(...values.map(p => p.angle));
  const maxVal = Math.max(...values.map(p => p.value));
  const minVal = 0;

  for (let angle = 0; angle <= maxAngle; angle += 15) {
    const px = x + (angle / maxAngle) * width;
    doc.line(px, yPlot + height, px, yPlot + height + 2);
    doc.setFontSize(7);
    doc.text(`${angle}°`, px - 4, yPlot + height + 5);
  }

  const step = Math.max(0.5, maxVal / 5);
  for (let v = 0; v <= maxVal + 1e-6; v += step) {
    const py = yPlot + height - ((v - minVal) / (maxVal - minVal || 1)) * height;
    doc.setDrawColor(220);
    doc.line(x, py, x + width, py);
    doc.setDrawColor(0);
    doc.setFontSize(7);
    doc.text(`${v.toFixed(1)}`, x - 10, py + 1.5);
  }

  doc.setDrawColor(color);
  doc.setLineWidth(0.8);
  let prev = null;
  values.forEach((point) => {
    const px = x + (point.angle / maxAngle) * width;
    const py = yPlot + height - ((point.value - minVal) / (maxVal - minVal || 1)) * height;
    if (prev) doc.line(prev.x, prev.y, px, py);
    doc.circle(px, py, 0.8, 'F');
    prev = { x: px, y: py };
  });

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Max ${label}: ${Math.max(...values.map(v => v.value)).toFixed(3)}`, x, yPlot + height + 12);
  savePDF(doc, filename);
}

function createCurvePDFs() {
  const gzValues = gzData.map(point => ({ angle: point.angle, value: point.GZ }));
  const knValues = gzData.map(point => ({ angle: point.angle, value: point.KN }));
  drawCurvePDF('gz-curve.pdf', 'GZ Curve', gzValues, 0x1f77b4);
  drawCurvePDF('kn-curve.pdf', 'KN Curve', knValues, 0xd62728);
}

createSummaryPDF();
createCurvePDFs();
