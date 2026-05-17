/**
 * NavStab Hydrostatic Calculator — Usage Example
 * Demonstrates how to use the NavStab calculation engine programmatically
 */

import { DEFAULT_SHIP, generateOffsetTable } from './engine/hullGenerator.js';
import { calculateHydrostatics } from './engine/hydrostatics.js';
import { generateGZCurve } from './engine/stability.js';

// Example: Calculate hydrostatics for a sample vessel
function calculateSampleVessel() {
  console.log('🛳️  NavStab Hydrostatic Calculator Example');
  console.log('=' .repeat(50));

  // 1. Define ship parameters
  const ship = {
    name: 'Container Ship Example',
    LBP: 350.0,    // Length between perpendiculars (m)
    B: 48.2,       // Breadth (m)
    T: 14.5,       // Draft (m)
    D: 24.0,       // Depth (m)
    CB: 0.65,      // Block coefficient
    CM: 0.98,      // Midship coefficient
    CW: 0.85,      // Waterplane coefficient
    rho: 1025,     // Seawater density (kg/m³)
    KG: 16.0,      // Height of center of gravity (m)
    numStations: 21 // Number of longitudinal stations
  };

  console.log(`Vessel: ${ship.name}`);
  console.log(`Principal Dimensions: ${ship.LBP}m × ${ship.B}m × ${ship.T}m`);
  console.log(`Coefficients: CB=${ship.CB}, CM=${ship.CM}, CW=${ship.CW}`);
  console.log('');

  // 2. Generate hull form (offset table)
  console.log('🔧 Generating hull form...');
  const offsetTable = generateOffsetTable(ship);
  console.log(`Generated offset table: ${offsetTable.halfBreadths.length} waterlines × ${offsetTable.halfBreadths[0].length} stations`);
  console.log('');

  // 3. Calculate hydrostatics
  console.log('🧮 Calculating hydrostatic parameters...');
  const hydro = calculateHydrostatics(offsetTable, ship);

  console.log('HYDROSTATIC RESULTS:');
  console.log('-'.repeat(30));
  console.log(`Displacement (Δ): ${hydro.displacement.toLocaleString()} tonnes`);
  console.log(`Volume (∇): ${hydro.volume.toLocaleString()} m³`);
  console.log(`Waterplane Area (Aw): ${hydro.Aw.toLocaleString()} m²`);
  console.log(`LCB from AP: ${hydro.LCB_AP.toFixed(2)} m`);
  console.log(`LCF from AP: ${hydro.LCF_AP.toFixed(2)} m`);
  console.log(`KB: ${hydro.KB.toFixed(3)} m`);
  console.log(`KM: ${hydro.KM.toFixed(3)} m`);
  console.log(`GM: ${hydro.GM.toFixed(3)} m ${hydro.GM >= 0.15 ? '✅' : '⚠️'}`);
  console.log(`TPC: ${hydro.TPC.toFixed(3)} t/cm`);
  console.log(`MCTC: ${hydro.MCTC.toFixed(3)} t·m/cm`);
  console.log('');

  // 4. Generate stability curve
  console.log('📈 Generating GZ stability curve...');
  const gzData = generateGZCurve(hydro);

  console.log('GZ CURVE (0° to 60°):');
  console.log('Angle | GZ (m) | KN (m)');
  console.log('-'.repeat(25));
  gzData.slice(0, 21).forEach(point => { // Show every 3° up to 60°
    console.log(`${point.angle.toString().padStart(5)}° | ${point.GZ.toFixed(3).padStart(6)} | ${point.KN.toFixed(3).padStart(6)}`);
  });
  console.log('');

  // 5. IMO Stability Criteria Check
  console.log('🚢 IMO STABILITY CRITERIA CHECK:');
  const maxGZ = Math.max(...gzData.map(p => p.GZ));
  const area0to30 = gzData.filter(p => p.angle <= 30).reduce((sum, p, i, arr) => {
    if (i === 0) return 0;
    const prev = arr[i-1];
    return sum + (p.GZ + prev.GZ) * (p.angle - prev.angle) * Math.PI / 360; // Trapezoidal rule
  }, 0);

  const area30to40 = gzData.filter(p => p.angle >= 30 && p.angle <= 40).reduce((sum, p, i, arr) => {
    if (i === 0) return 0;
    const prev = arr[i-1];
    return sum + (p.GZ + prev.GZ) * (p.angle - prev.angle) * Math.PI / 360;
  }, 0);

  console.log(`Maximum GZ: ${maxGZ.toFixed(3)} m (should be ≥ 0.20 m)`);
  console.log(`Area 0°-30°: ${area0to30.toFixed(3)} m·rad (should be ≥ 0.055 m·rad)`);
  console.log(`Area 30°-40°: ${area30to40.toFixed(3)} m·rad (should be ≥ 0.030 m·rad)`);
  console.log(`GM: ${hydro.GM.toFixed(3)} m (should be ≥ 0.15 m)`);

  const criteria = [
    maxGZ >= 0.20,
    area0to30 >= 0.055,
    area30to40 >= 0.030,
    hydro.GM >= 0.15
  ];

  const passed = criteria.filter(Boolean).length;
  console.log(`Criteria passed: ${passed}/4 ${passed === 4 ? '✅' : '⚠️'}`);
  console.log('');

  return { ship, offsetTable, hydro, gzData };
}

// Example: Batch calculation for different drafts
function calculateDraftSeries() {
  console.log('📊 DRAFT SERIES CALCULATION:');
  console.log('Draft | Displacement | GM | Max GZ');
  console.log('-'.repeat(35));

  const baseShip = { ...DEFAULT_SHIP, name: 'Draft Series' };
  const drafts = [12.0, 13.0, 14.0, 15.0, 16.0];

  drafts.forEach(draft => {
    const ship = { ...baseShip, T: draft };
    const offsetTable = generateOffsetTable(ship);
    const hydro = calculateHydrostatics(offsetTable, ship);
    const gzData = generateGZCurve(hydro);
    const maxGZ = Math.max(...gzData.map(p => p.GZ));

    console.log(`${draft.toFixed(1).padStart(5)}m | ${hydro.displacement.toLocaleString().padStart(11)}t | ${hydro.GM.toFixed(3).padStart(4)}m | ${maxGZ.toFixed(3).padStart(6)}m`);
  });
  console.log('');
}

// Run examples
if (typeof window === 'undefined') {
  // Node.js environment
  calculateSampleVessel();
  calculateDraftSeries();
} else {
  // Browser environment - expose functions globally
  window.calculateSampleVessel = calculateSampleVessel;
  window.calculateDraftSeries = calculateDraftSeries;
  console.log('NavStab calculation functions loaded. Run calculateSampleVessel() or calculateDraftSeries() in console.');
}

export { calculateSampleVessel, calculateDraftSeries };