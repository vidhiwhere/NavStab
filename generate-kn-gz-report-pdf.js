import path from 'path';
import { jsPDF } from 'jspdf';
import { DEFAULT_SHIP, generateOffsetTable } from './src/engine/hullGenerator.js';
import { calculateHydrostatics } from './src/engine/hydrostatics.js';
import { generateGZCurve } from './src/engine/stability.js';

const ship = { ...DEFAULT_SHIP, name: 'Sample Vessel' };
const offsetTable = generateOffsetTable(ship);
const hydro = calculateHydrostatics(offsetTable, ship);
const gzData = generateGZCurve(hydro, Array.from({ length: 21 }, (_, i) => i * 3));

const outputPath = path.resolve('kn-gz-report.pdf');
const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
const margin = 15;
let y = margin;
const pageWidth = 210;
const contentWidth = pageWidth - margin * 2;

doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.text('NavStab Output Report', margin, y);
y += 9;
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.text('KN and GZ Curve Plot Report', margin, y);
y += 8;
doc.setFontSize(9);
doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
y += 10;

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.text('Vessel and Hydrostatic Summary', margin, y);
y += 8;
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);

doc.text(`Name: ${ship.name}`, margin, y);
doc.text(`LBP: ${ship.LBP.toFixed(1)} m`, margin + 90, y);
y += 6;
doc.text(`Beam B: ${ship.B.toFixed(1)} m`, margin, y);
doc.text(`Draft T: ${ship.T.toFixed(2)} m`, margin + 90, y);
y += 6;
doc.text(`KB: ${hydro.KB.toFixed(3)} m`, margin, y);
doc.text(`KM: ${hydro.KM.toFixed(3)} m`, margin + 90, y);
y += 6;
doc.text(`GM: ${hydro.GM.toFixed(3)} m`, margin, y);
doc.text(`TPC: ${hydro.TPC.toFixed(3)} t/cm`, margin + 90, y);
y += 10;

function drawPlot(x, yPos, width, height, values, label, color) {
  const maxAngle = Math.max(...values.map(v => v.angle));
  const maxValue = Math.max(...values.map(v => v.value));
  const minValue = 0;

  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(x, yPos, width, height);

  // X-axis ticks
  doc.setFontSize(7);
  for (let angle = 0; angle <= maxAngle; angle += 15) {
    const px = x + (angle / maxAngle) * width;
    doc.line(px, yPos + height, px, yPos + height + 2);
    doc.text(`${angle}°`, px - 4, yPos + height + 5);
  }

  const yStep = Math.max(0.5, Math.ceil(maxValue / 4 * 10) / 10);
  for (let v = 0; v <= maxValue + 1e-6; v += yStep) {
    const py = yPos + height - ((v - minValue) / (maxValue - minValue || 1)) * height;
    doc.setDrawColor(220);
    doc.line(x, py, x + width, py);
    doc.setDrawColor(0);
    doc.text(`${v.toFixed(1)}`, x - 10, py + 1.5);
  }

  doc.setDrawColor(color);
  doc.setLineWidth(0.8);
  let prevPoint = null;
  values.forEach((point) => {
    const px = x + (point.angle / maxAngle) * width;
    const py = yPos + height - ((point.value - minValue) / (maxValue - minValue || 1)) * height;
    if (prevPoint) doc.line(prevPoint.x, prevPoint.y, px, py);
    prevPoint = { x: px, y: py };
    doc.circle(px, py, 0.7, 'F');
  });

  doc.setFontSize(9);
  doc.text(label, x, yPos - 2);
  doc.text(`Max ${label}: ${maxValue.toFixed(3)}`, x + width - 60, yPos - 2);
}

function pageBreakIfNeeded(nextY) {
  if (nextY > 285) {
    doc.addPage();
    y = margin;
  }
}

const plotWidth = contentWidth;
const plotHeight = 70;

const gzValues = gzData.map(point => ({ angle: point.angle, value: point.GZ }));
const knValues = gzData.map(point => ({ angle: point.angle, value: point.KN }));

drawPlot(margin, y, plotWidth, plotHeight, gzValues, 'GZ Curve (m)', 0x1f77b4);
y += plotHeight + 12;
pageBreakIfNeeded(y + plotHeight + 20);
drawPlot(margin, y, plotWidth, plotHeight, knValues, 'KN Curve (m)', 0xd62728);
y += plotHeight + 12;
pageBreakIfNeeded(y + 70);

const tableTop = y;
doc.setFont('helvetica', 'bold');
doc.text('GZ / KN Data Points', margin, tableTop);
y += 6;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);

doc.text('Angle', margin, y);
doc.text('GZ (m)', margin + 30, y);
doc.text('KN (m)', margin + 55, y);
doc.text('GZ*KN', margin + 85, y);
y += 4;
doc.setLineWidth(0.2);
doc.line(margin, y, margin + contentWidth, y);
y += 4;

gzData.forEach((point) => {
  if (y > 285) {
    doc.addPage();
    y = margin;
  }
  doc.text(`${point.angle}`, margin, y);
  doc.text(`${point.GZ.toFixed(3)}`, margin + 30, y);
  doc.text(`${point.KN.toFixed(3)}`, margin + 55, y);
  doc.text(`${(point.GZ * point.KN).toFixed(3)}`, margin + 85, y);
  y += 5;
});

doc.save(outputPath);
console.log(`Generated PDF: ${outputPath}`);
