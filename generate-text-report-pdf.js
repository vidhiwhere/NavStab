import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

const reportPath = path.resolve('NavStab_Project_Report.md');
const outputPath = path.resolve('NavStab_Project_Report.pdf');

const markdown = fs.readFileSync(reportPath, 'utf8');
const lines = markdown.split(/\r?\n/);

const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
const margin = 15;
const lineHeight = 6;
const maxWidth = 190;
let y = margin;
let page = 1;

doc.setFont('helvetica', 'normal');
doc.setFontSize(10);

function addLine(text) {
  const wrappedLines = doc.splitTextToSize(text, maxWidth);
  wrappedLines.forEach((wrappedLine) => {
    if (y + lineHeight > 287) {
      doc.addPage();
      page += 1;
      y = margin;
    }
    doc.text(wrappedLine, margin, y);
    y += lineHeight;
  });
}

lines.forEach((line) => {
  if (line.startsWith('# ')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    addLine(line.replace(/^#\s*/, ''));
    y += 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
  } else if (line.startsWith('## ')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    addLine(line.replace(/^##\s*/, ''));
    y += 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
  } else if (line.startsWith('### ')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    addLine(line.replace(/^###\s*/, ''));
    y += 1;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
  } else if (line.startsWith('---')) {
    addLine('');
  } else if (line.trim().startsWith('* **')) {
      doc.setFont('helvetica', 'bold');
      const parts = line.split('**:');
      if (parts.length > 1) {
          addLine(line);
      } else {
          addLine(line);
      }
      doc.setFont('helvetica', 'normal');
  } else {
    addLine(line);
  }
});

doc.save(outputPath);
console.log(`✅ Generated Project Report PDF: ${outputPath}`);
