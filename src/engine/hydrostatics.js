/**
 * Hydrostatics Calculation Engine
 * Computes all hydrostatic parameters from offset table data:
 * Aw, ∇, Δ, LCB, LCF, KB, BM, GM, TPC, MCTC
 */

import { simpsonIntegrate, simpsonFirstMoment, simpsonSecondMomentCL, trapezoidalIntegrate } from './simpson.js';

/**
 * Calculate waterplane area and its moments at a given waterline index
 * @param {number[]} halfBreadths - half-breadths at each station for this WL
 * @param {number[]} stations - x-positions from AP
 * @returns {{ Aw, LCF_raw, IT }}
 */
function calcWaterplaneProps(halfBreadths, stations) {
  const L = stations[stations.length - 1] - stations[0];
  const h = L / (stations.length - 1); // uniform spacing
  const n = stations.length;

  // Full breadths (2 * half-breadth)
  const fullB = halfBreadths.map(hb => 2 * hb);

  // Waterplane area: Aw = ∫ B dx
  const Aw = simpsonIntegrate(fullB, h);

  // First moment about AP: ∫ x·B dx
  const xFromAP = stations;
  const firstMom = simpsonFirstMoment(xFromAP, fullB, h);

  // LCF from AP (centroid of waterplane)
  const LCF_AP = Aw > 0 ? firstMom / Aw : L / 2;

  // Second moment of area about CL (transverse): IT = ∫ (2/3)·y³ dx
  const IT = simpsonSecondMomentCL(halfBreadths, h);

  // Second moment about AP for longitudinal: IL = ∫ x²·B dx
  const ILvals = xFromAP.map((x, i) => x * x * fullB[i]);
  const IL_AP = simpsonIntegrate(ILvals, h);

  // Transfer IL to centroid: IL_CL = IL_AP - Aw·LCF²
  const IL = IL_AP - Aw * LCF_AP * LCF_AP;

  return { Aw, LCF_AP, IT, IL };
}

/**
 * Main hydrostatics calculator
 * @param {Object} offsetTable - { stations, waterlines (heights), halfBreadths[wi][si] }
 * @param {Object} ship - Ship parameters { LBP, B, T, D, KG, rho }
 * @returns {Object} hydrostatics results
 */
export function calculateHydrostatics(offsetTable, ship) {
  const { stations, waterlines, halfBreadths } = offsetTable;
  const { LBP, T, D, KG, rho = 1025 } = ship;

  const nWL = waterlines.length;
  const L = stations[stations.length - 1] - stations[0];

  // Arrays of waterplane properties at each waterline height
  const AwArr = [];
  const LCF_APArr = [];
  const ITArr = [];
  const ILArr = [];

  for (let wi = 0; wi < nWL; wi++) {
    const props = calcWaterplaneProps(halfBreadths[wi], stations);
    AwArr.push(props.Aw);
    LCF_APArr.push(props.LCF_AP);
    ITArr.push(props.IT);
    ILArr.push(props.IL);
  }

  // ── Integration over draft to get volume ──────────────────────────────────
  const wlHeights = waterlines; // heights from keel
  const drafts = wlHeights;     // same array

  // Volume: ∇ = ∫ Aw dz  (integrate Aw over waterline heights)
  const volume = trapezoidalIntegrate(drafts, AwArr);

  // First moment of volume about keel: ∫ z·Aw dz
  const firstMomVol = trapezoidalIntegrate(drafts, drafts.map((z, i) => z * AwArr[i]));

  // KB = first moment of volume / volume
  const KB = volume > 0 ? firstMomVol / volume : 0;

  // LCB — first moment of volume about AP: ∫ LCF_AP·Aw dz / ∇
  const firstMomLCB = trapezoidalIntegrate(drafts, drafts.map((z, i) => LCF_APArr[i] * AwArr[i]));
  const LCB_AP = volume > 0 ? firstMomLCB / volume : L / 2;

  // Use the waterplane at actual draft T (last waterline ≤ T)
  const draftWLIndex = (() => {
    for (let i = nWL - 1; i >= 0; i--) {
      if (waterlines[i] <= T + 0.001) return i;
    }
    return nWL - 1;
  })();

  const Aw = AwArr[draftWLIndex];
  const LCF_AP = LCF_APArr[draftWLIndex];
  const IT = ITArr[draftWLIndex];
  const IL = ILArr[draftWLIndex];

  // ── Key hydrostatic parameters ─────────────────────────────────────────────
  const displacement_m3 = volume;           // m³
  const displacement_t = (rho * volume) / 1000; // tonnes

  const BM = volume > 0 ? IT / volume : 0;          // transverse metacentric radius
  const BML = volume > 0 ? IL / volume : 0;         // longitudinal metacentric radius
  const KM = KB + BM;
  const KML = KB + BML;
  const GM = KM - KG;                               // transverse GM
  const GML = KML - KG;                             // longitudinal GM

  // TPC — Tonnes Per Centimeter immersion
  const TPC = (Aw * rho) / 100000;

  // MCTC — Moment to Change Trim 1 cm
  const MCTC = displacement_t > 0 ? (displacement_t * GML) / (100 * LBP) : 0;

  // LCB and LCF from midship (positive = forward)
  const LCB_mid = LCB_AP - LBP / 2;
  const LCF_mid = LCF_AP - LBP / 2;

  // CW — Waterplane coefficient
  const CW = Aw / (LBP * ship.B);

  // CB — Block coefficient from computed volume
  const CB_calc = displacement_m3 / (LBP * ship.B * T);

  return {
    // Volume & displacement
    volume: displacement_m3,
    displacement: displacement_t,

    // Waterplane
    Aw,
    CW,
    CB: CB_calc,

    // Vertical positions
    KB,
    KG,
    BM,
    BML,
    KM,
    KML,
    GM,
    GML,

    // Longitudinal positions (from AP)
    LCB_AP,
    LCF_AP,

    // From midship (+ fwd, - aft)
    LCB_mid,
    LCF_mid,

    // Trim
    TPC,
    MCTC,

    // Waterplane moments
    IT,
    IL,

    // Per-waterline arrays for curves
    waterlines,
    AwArr,
    LCF_APArr,
    ITArr,

    // Ship refs
    LBP,
    T,
    D,
  };
}

/**
 * Calculate hydrostatics at multiple drafts
 * @param {Object} offsetTable
 * @param {Object} ship
 * @param {number[]} drafts - array of draft values to evaluate
 * @returns {Object[]} array of hydrostatics results
 */
export function calculateHydrostaticCurves(offsetTable, ship, drafts) {
  return drafts.map(draft => {
    // Filter waterlines up to this draft
    const indices = offsetTable.waterlines
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h <= draft + 0.01);

    if (indices.length < 2) return null;

    const subTable = {
      stations: offsetTable.stations,
      waterlines: indices.map(({ h }) => h),
      halfBreadths: indices.map(({ i }) => offsetTable.halfBreadths[i]),
    };

    const result = calculateHydrostatics(subTable, { ...ship, T: draft });
    return { draft, ...result };
  }).filter(Boolean);
}
