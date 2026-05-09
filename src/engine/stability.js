/**
 * Stability Calculation Engine
 * GZ curve, KN curve, Righting Moment, Wall-sided formula
 */

/**
 * Calculate GZ (righting lever) at a given heel angle using Wall-sided formula
 * GZ = (GM + ½·BM·tan²θ) × sinθ
 *
 * @param {number} GM  - Metacentric height (m)
 * @param {number} BM  - Metacentric radius (m)
 * @param {number} thetaDeg - Heel angle in degrees
 * @returns {number} GZ in meters
 */
export function wallSidedGZ(GM, BM, thetaDeg) {
  const theta = (thetaDeg * Math.PI) / 180;
  const tanT = Math.tan(theta);
  return (GM + 0.5 * BM * tanT * tanT) * Math.sin(theta);
}

/**
 * Calculate KN value at a given heel angle
 * KN = KG·sinθ (used for loading condition analysis)
 * GZ = KN - KG·sinθ, so actual righting arm = KN - KG·sinθ
 *
 * More accurately: KN is the righting moment arm from keel measured perpendicular to ship's CL
 * Approximated as: KN = KB·sinθ + BM·sinθ·cosθ
 *
 * @param {number} KB
 * @param {number} BM
 * @param {number} thetaDeg
 * @returns {number} KN in meters
 */
export function calculateKN(KB, BM, thetaDeg) {
  const theta = (thetaDeg * Math.PI) / 180;
  // Wall-sided KN: KN = (KB + BM)·sinθ - ½·BM·sin θ·cos²θ... 
  // Simplified: KN = KM·sinθ for small angles, extended:
  return KB * Math.sin(theta) + BM * Math.sin(theta) * Math.cos(theta);
}

/**
 * Generate GZ curve data points from 0° to 90°
 * @param {Object} hydro - hydrostatics result { GM, BM, KB, KG }
 * @param {number[]} angles - array of angles in degrees (default 0-90 step 5)
 * @returns {Object[]} array of { angle, GZ, KN }
 */
export function generateGZCurve(hydro, angles = null) {
  const { GM, BM, KB, KG } = hydro;
  const evalAngles = angles || Array.from({ length: 19 }, (_, i) => i * 5); // 0 to 90

  return evalAngles.map(deg => {
    const GZ = wallSidedGZ(GM, BM, deg);
    const KN = calculateKN(KB, BM, deg);
    const theta = (deg * Math.PI) / 180;
    return {
      angle: deg,
      GZ: parseFloat(GZ.toFixed(4)),
      KN: parseFloat(KN.toFixed(4)),
      GZcheck: parseFloat((KN - KG * Math.sin(theta)).toFixed(4)), // cross-check
    };
  });
}

/**
 * Generate KN table for multiple KG values (loading conditions)
 * @param {Object} hydro - { KB, BM }
 * @param {number[]} KGValues - array of KG values to evaluate
 * @param {number[]} angles - angles in degrees
 * @returns {Object[]} array of { KG, curve: [{angle, GZ}] }
 */
export function generateKNFamily(hydro, KGValues, angles = null) {
  const evalAngles = angles || [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  return KGValues.map(kg => ({
    KG: kg,
    curve: evalAngles.map(deg => {
      const theta = (deg * Math.PI) / 180;
      const KN = calculateKN(hydro.KB, hydro.BM, deg);
      const GZ = KN - kg * Math.sin(theta);
      return { angle: deg, GZ: parseFloat(GZ.toFixed(4)), KN: parseFloat(KN.toFixed(4)) };
    }),
  }));
}

/**
 * Find angle of maximum GZ
 */
export function findMaxGZAngle(gzCurve) {
  let maxGZ = -Infinity;
  let maxAngle = 0;
  for (const pt of gzCurve) {
    if (pt.GZ > maxGZ) {
      maxGZ = pt.GZ;
      maxAngle = pt.angle;
    }
  }
  return { maxGZ, maxAngle };
}

/**
 * Find angle of vanishing stability (GZ = 0 after maximum)
 */
export function findVanishingAngle(gzCurve) {
  const maxInfo = findMaxGZAngle(gzCurve);
  for (let i = 0; i < gzCurve.length - 1; i++) {
    if (gzCurve[i].angle >= maxInfo.maxAngle) {
      if (gzCurve[i].GZ > 0 && gzCurve[i + 1].GZ <= 0) {
        // Linear interpolation
        const x0 = gzCurve[i].angle, y0 = gzCurve[i].GZ;
        const x1 = gzCurve[i + 1].angle, y1 = gzCurve[i + 1].GZ;
        return x0 - y0 * (x1 - x0) / (y1 - y0);
      }
    }
  }
  return gzCurve[gzCurve.length - 1].angle; // assume still positive at 90°
}

/**
 * Calculate area under GZ curve between two angles using trapezoidal rule
 * @param {Object[]} gzCurve - [{angle, GZ}]
 * @param {number} fromDeg
 * @param {number} toDeg
 * @returns {number} area in m·rad
 */
export function gzArea(gzCurve, fromDeg, toDeg) {
  const subset = gzCurve.filter(p => p.angle >= fromDeg && p.angle <= toDeg);
  if (subset.length < 2) return 0;
  let area = 0;
  for (let i = 0; i < subset.length - 1; i++) {
    const dTheta = ((subset[i + 1].angle - subset[i].angle) * Math.PI) / 180;
    area += 0.5 * (subset[i].GZ + subset[i + 1].GZ) * dTheta;
  }
  return area;
}

/**
 * Calculate free surface correction to GM
 * @param {number} rho_s - density of liquid in tank (kg/m³)
 * @param {number} rho - sea water density (kg/m³)
 * @param {number} i_t - second moment of area of free surface (m⁴)
 * @param {number} displacement_m3 - ship displacement volume (m³)
 * @returns {number} GG' (reduction in GM) in meters
 */
export function freeSurfaceCorrection(rho_s, rho, i_t, displacement_m3) {
  return (rho_s / rho) * (i_t / displacement_m3);
}
