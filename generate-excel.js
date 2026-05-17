import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { DEFAULT_SHIP, generateOffsetTable } from './src/engine/hullGenerator.js';
import { calculateHydrostatics } from './src/engine/hydrostatics.js';
import { generateGZCurve } from './src/engine/stability.js';

// Run calculation
const ship = { ...DEFAULT_SHIP, name: 'Sample Vessel' };
const offsetTable = generateOffsetTable(ship);
const hydro = calculateHydrostatics(offsetTable, ship);
const gzData = generateGZCurve(hydro);

// Prepare data for Excel/CSV
const hydroData = [
  { Parameter: 'Displacement (Δ)', Value: hydro.displacement, Unit: 'tonnes' },
  { Parameter: 'Volume (∇)', Value: hydro.volume, Unit: 'm³' },
  { Parameter: 'Waterplane Area (Aw)', Value: hydro.Aw, Unit: 'm²' },
  { Parameter: 'LCB from AP', Value: hydro.LCB_AP, Unit: 'm' },
  { Parameter: 'LCF from AP', Value: hydro.LCF_AP, Unit: 'm' },
  { Parameter: 'KB', Value: hydro.KB, Unit: 'm' },
  { Parameter: 'KM', Value: hydro.KM, Unit: 'm' },
  { Parameter: 'GM', Value: hydro.GM, Unit: 'm' },
  { Parameter: 'TPC', Value: hydro.TPC, Unit: 't/cm' },
  { Parameter: 'MCTC', Value: hydro.MCTC, Unit: 't·m/cm' }
];

const stabilityData = gzData.map(point => ({
  'Angle (degrees)': point.angle,
  'GZ (m)': point.GZ,
  'KN (m)': point.KN
}));

// Create a new workbook
const wb = xlsx.utils.book_new();

// Add Hydrostatics sheet
const wsHydro = xlsx.utils.json_to_sheet(hydroData);
xlsx.utils.book_append_sheet(wb, wsHydro, 'Hydrostatics');

// Add GZ Curve sheet
const wsGZ = xlsx.utils.json_to_sheet(stabilityData);
xlsx.utils.book_append_sheet(wb, wsGZ, 'Stability Curve');

// Export to XLSX
const xlsxPath = path.resolve('hydrostatics-output.xlsx');
xlsx.writeFile(wb, xlsxPath);
console.log(`✅ Generated Excel file: ${xlsxPath}`);

// Export Hydrostatics to CSV
const csvPath = path.resolve('hydrostatics-output.csv');
const csvContent = xlsx.utils.sheet_to_csv(wsHydro);
fs.writeFileSync(csvPath, csvContent);
console.log(`✅ Generated CSV file: ${csvPath}`);
