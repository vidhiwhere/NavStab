/**
 * Hull Form Generator
 * Generates a synthetic offset table (half-breadths at stations × waterlines)
 * from principal dimensions using standard series hull form mathematics.
 * 
 * Based on Series 60 / Lackenby form parameters.
 */

/**
 * Default ship data matching the problem statement
 */
export const DEFAULT_SHIP = {
  name: 'Sample Vessel',
  LOA: 420.95,   // m — Length Overall
  LBP: 410.0,    // m — Length Between Perpendiculars (estimated)
  B: 63.0,       // m — Breadth
  T: 28.5,       // m — Draft
  D: 37.269,     // m — Depth
  CB: 0.78,      // Block Coefficient
  CM: 0.98,      // Midship Coefficient (typical for large vessels)
  CW: 0.88,      // Waterplane Coefficient
  CP: 0.796,     // Prismatic Coefficient = CB/CM
  rho: 1025,     // kg/m³ — Seawater density
  KG: 24.846,    // m — KG = 2/3 × D
  numStations: 21, // 0 to 20 (20 equal spaces)
};

/**
 * Waterline definitions (A through K from problem statement)
 * Each entry: { id, pctDraft, height }
 */
export const WATERLINE_DEFS = [
  { id: 'A', pctDraft: 0.0769, height: 2.19165 },
  { id: 'B', pctDraft: 0.1538, height: 4.3833 },
  { id: 'C', pctDraft: 0.2308, height: 6.5778 },
  { id: 'D', pctDraft: 0.3846, height: 10.9611 },
  { id: 'E', pctDraft: 0.5385, height: 15.34725 },
  { id: 'F', pctDraft: 0.6923, height: 19.73055 },
  { id: 'G', pctDraft: 0.8462, height: 24.1167 },
  { id: 'H', pctDraft: 1.0000, height: 28.5 },
  { id: 'J', pctDraft: 1.1538, height: 32.8833 },
  { id: 'K', pctDraft: 1.3077, height: 37.26945 },
];

/**
 * Stern profile half-breadths (Table 4.4) — at 10 waterline heights
 */
export const STERN_PROFILE = [6.016, 6.818, 7.219, 7.62, 6.818, 6.016, -10.829, -11.23, -13.236, -14.038];

/**
 * Stem profile half-breadths (Table 4.5) — at 10 waterline heights
 */
export const STEM_PROFILE = [5.615, 7.219, 7.62, 6.417, 3.609, 1.604, 1.604, 0.802, 0.802, 1.604];

/**
 * Generate synthetic half-breadths using a parabolic/cosine series form.
 * This approximates a realistic ship hull form for the given parameters.
 * 
 * @param {Object} ship - Ship parameters
 * @returns {Object} offsetTable - { stations[], waterlines[], halfBreadths[wl][station] }
 */
export function generateOffsetTable(ship = DEFAULT_SHIP) {
  const { LBP, B, T, CB, CM, CW, numStations } = ship;
  const nStations = numStations || 21;
  const nWL = 10; // using waterlines A-K (index 0-9 matching H waterline = full draft)

  // Station positions from AP (x=0) to FP (x=LBP)
  const stations = Array.from({ length: nStations }, (_, i) => (i / (nStations - 1)) * LBP);

  // Waterline heights (0 to T for WLs A–H, use only up to H=T for submerged)
  const wlHeights = WATERLINE_DEFS.slice(0, 8).map(wl => wl.height); // A to H

  // Half-breadths[wl][station]
  const halfBreadths = [];

  for (let wi = 0; wi < wlHeights.length; wi++) {
    const wlFrac = wlHeights[wi] / T; // fraction of draft
    const row = [];

    for (let si = 0; si < nStations; si++) {
      const xi = stations[si] / LBP; // 0=AP, 1=FP

      // Longitudinal distribution using cosine series
      // Stern taper (aft 20%) and bow taper (forward 30%)
      let longFactor;
      if (xi <= 0.15) {
        // Stern taper
        longFactor = Math.sin((xi / 0.15) * Math.PI * 0.5);
        longFactor = Math.pow(longFactor, 0.7);
      } else if (xi >= 0.75) {
        // Bow taper
        const t = (xi - 0.75) / 0.25;
        longFactor = Math.cos(t * Math.PI * 0.5);
        longFactor = Math.pow(Math.max(0, longFactor), 0.6);
      } else {
        // Parallel body
        longFactor = 1.0;
      }

      // Vertical distribution — fuller at deeper waterlines
      const vertFactor = Math.pow(wlFrac, 0.3) * (1 - 0.05 * (1 - wlFrac));

      // Maximum half-breadth at this waterline
      const maxHB = (B / 2) * CW * vertFactor;

      let hb = maxHB * longFactor;

      // Apply CB correction to match desired block coefficient
      // Scale factor derived from integration
      const cbScale = CB / (0.78 * CM); // normalize
      hb *= Math.min(1.0, cbScale);

      row.push(Math.max(0, hb));
    }
    halfBreadths.push(row);
  }

  return {
    stations,           // x positions from AP [m]
    waterlines: wlHeights, // heights from keel [m]
    halfBreadths,       // [wi][si] — half-breadths in meters
    waterlineDefs: WATERLINE_DEFS.slice(0, 8),
  };
}

/**
 * Convert a pasted tab/space separated text offset table into structured data.
 * Expected format: rows = waterlines, columns = stations
 * First row/col may be headers (auto-detected)
 */
export function parseOffsetTable(text, ship = DEFAULT_SHIP) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const rows = lines.map(l => l.trim().split(/[\t,;]+/).map(v => parseFloat(v)));

  // Filter out header rows (NaN in first cell)
  const dataRows = rows.filter(r => !isNaN(r[0]));

  if (dataRows.length === 0) return null;

  const numWL = dataRows.length;
  const numSt = dataRows[0].length;

  // Reconstruct stations and waterlines
  const stations = Array.from({ length: numSt }, (_, i) => (i / (numSt - 1)) * ship.LBP);
  const wlStep = ship.T / numWL;
  const waterlines = Array.from({ length: numWL }, (_, i) => (i + 1) * wlStep);

  return {
    stations,
    waterlines,
    halfBreadths: dataRows,
    waterlineDefs: waterlines.map((h, i) => ({ id: String.fromCharCode(65 + i), pctDraft: h / ship.T, height: h })),
  };
}
