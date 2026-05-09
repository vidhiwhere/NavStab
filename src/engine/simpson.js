/**
 * Simpson's 1/3 Rule Numerical Integration Engine
 * Handles even & odd arrays, with multiplier tables
 */

/**
 * Returns Simpson's multipliers for n+1 points (n must be even)
 * Falls back to trapezoidal for odd intervals
 */
export function simpsonMultipliers(n) {
  if (n % 2 !== 0) throw new Error('Simpson 1/3 requires even number of intervals (odd number of points)');
  const mults = new Array(n + 1).fill(0);
  for (let i = 0; i <= n; i++) {
    if (i === 0 || i === n) mults[i] = 1;
    else if (i % 2 === 1) mults[i] = 4;
    else mults[i] = 2;
  }
  return mults;
}

/**
 * Integrate an array of y-values with equal spacing h
 * Uses composite Simpson's 1/3 rule
 * If odd number of intervals, uses Simpson's on first n-1 and trapezoidal on last
 */
export function simpsonIntegrate(yValues, h) {
  const n = yValues.length - 1;
  if (n < 2) return 0;

  // Ensure even n for pure Simpson's; handle odd by splitting
  if (n % 2 === 0) {
    const mults = simpsonMultipliers(n);
    let sum = 0;
    for (let i = 0; i <= n; i++) sum += mults[i] * yValues[i];
    return (h / 3) * sum;
  } else {
    // Apply Simpson's to first n-1 intervals, trapezoidal to last
    const sub = yValues.slice(0, -1);
    const simp = simpsonIntegrate(sub, h);
    const trap = (h / 2) * (yValues[n - 1] + yValues[n]);
    return simp + trap;
  }
}

/**
 * First moment integral: ∫ x·y dx
 * xValues and yValues must be same length
 */
export function simpsonFirstMoment(xValues, yValues, h) {
  const xyValues = xValues.map((x, i) => x * yValues[i]);
  return simpsonIntegrate(xyValues, h);
}

/**
 * Second moment integral: ∫ y³/3 dx (for second moment of area about CL)
 * Half-breadths y — second moment = ∫ (2/3)·y³ dx over full breadth
 */
export function simpsonSecondMomentCL(halfBreadths, h) {
  const y3Values = halfBreadths.map(y => (2 / 3) * Math.pow(y, 3));
  return simpsonIntegrate(y3Values, h);
}

/**
 * Second moment integral about x-axis (longitudinal axis)
 * For waterplane: I_L = ∫ x²·(2y) dx where x is distance from midship
 */
export function simpsonSecondMomentLong(xValues, halfBreadths, h) {
  const vals = xValues.map((x, i) => x * x * 2 * halfBreadths[i]);
  return simpsonIntegrate(vals, h);
}

/**
 * Integrate non-uniform spacing using trapezoidal rule
 * xValues and yValues arrays of same length, x must be sorted ascending
 */
export function trapezoidalIntegrate(xValues, yValues) {
  let sum = 0;
  for (let i = 0; i < xValues.length - 1; i++) {
    const dx = xValues[i + 1] - xValues[i];
    sum += 0.5 * (yValues[i] + yValues[i + 1]) * dx;
  }
  return sum;
}
