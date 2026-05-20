import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

const sourceFile = path.resolve('all_project_code.txt');
const outputFile = path.resolve('all_project_code.pdf');

console.log('Reading text file and generating PDF (this may take a few seconds due to size)...');

const code = fs.readFileSync(sourceFile, 'utf8');
const lines = code.split(/\r?\n/);

// Create a new PDF document
const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
const margin = 12;
const lineHeight = 4; // Smaller line height to fit more code per page
const maxWidth = 186; // A4 width is 210mm
let y = margin;
let pageNum = 1;

doc.setFont('courier', 'normal');
doc.setFontSize(8);

// Initial Header
doc.text(`NavStab Project - Complete Code Appendix`, margin, y);
doc.text(`Page ${pageNum}`, 210 - margin, y, { align: 'right' });
y += 8;

for (const line of lines) {
  // Handle some basic sanitization (tabs to spaces)
  const sanitizedLine = line.replace(/\t/g, '    ');
  
  // Split long lines so they don't go off the page
  const wrapped = doc.splitTextToSize(sanitizedLine || ' ', maxWidth);
  
  for (const textLine of wrapped) {
    if (y + lineHeight > 287) { // 297mm is A4 height, leave 10mm margin at bottom
      doc.addPage();
      pageNum++;
      y = margin;
      // Header for new page
      doc.text(`NavStab Project - Complete Code Appendix`, margin, y);
      doc.text(`Page ${pageNum}`, 210 - margin, y, { align: 'right' });
      y += 8;
    }
    doc.text(textLine, margin, y);
    y += lineHeight;
  }
}

doc.save(outputFile);
console.log(`✅ Generated PDF successfully: ${outputFile}`);
