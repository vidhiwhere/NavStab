import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

const sourceFile = path.resolve('example-usage.js');
const outputFile = path.resolve('example-usage.pdf');

const code = fs.readFileSync(sourceFile, 'utf8');
const lines = code.split(/\r?\n/);

const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
const margin = 15;
const lineHeight = 5.5;
const maxWidth = 180;
let y = margin;

doc.setFont('courier', 'normal');
doc.setFontSize(9);

doc.text(`Code File: ${path.basename(sourceFile)}`, margin, y);
y += 10;

doc.setFontSize(8);

for (const line of lines) {
  const wrapped = doc.splitTextToSize(line || ' ', maxWidth);
  for (const textLine of wrapped) {
    if (y + lineHeight > 287) {
      doc.addPage();
      y = margin;
    }
    doc.text(textLine, margin, y);
    y += lineHeight;
  }
}

doc.save(outputFile);
console.log(`Generated PDF: ${outputFile}`);
