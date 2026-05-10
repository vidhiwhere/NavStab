/**
 * NavStab — Reactive State Store
 * Lightweight pub/sub store that holds all app state and notifies subscribers
 */

import { DEFAULT_SHIP, generateOffsetTable } from './engine/hullGenerator.js';
import { calculateHydrostatics, calculateHydrostaticCurves } from './engine/hydrostatics.js';
import { generateGZCurve } from './engine/stability.js';

// ── Initial State ─────────────────────────────────────────────────────────────
const state = {
  ship: { ...DEFAULT_SHIP },
  offsetTable: null,
  hydro: null,
  hydroCurves: null,
  gzCurve: null,
  activeSection: 'dashboard',
};

// ── Subscribers ───────────────────────────────────────────────────────────────
const subscribers = {};

export function subscribe(event, fn) {
  if (!subscribers[event]) subscribers[event] = [];
  subscribers[event].push(fn);
}

function emit(event, data) {
  (subscribers[event] || []).forEach(fn => fn(data));
}

// ── Recalculate everything from ship + offsetTable ───────────────────────────
export function recalculate() {
  const { ship, offsetTable } = state;
  if (!offsetTable) return;

  try {
    state.hydro = calculateHydrostatics(offsetTable, ship);
    state.gzCurve = generateGZCurve(state.hydro);

    // Hydrostatic curves at 8 draft points
    const draftPoints = offsetTable.waterlines.filter(h => h <= ship.T + 0.1);
    state.hydroCurves = calculateHydrostaticCurves(offsetTable, ship, draftPoints);

    emit('hydro', state.hydro);
    emit('gzCurve', state.gzCurve);
    emit('hydroCurves', state.hydroCurves);
  } catch (e) {
    console.error('Calculation error:', e);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export function getState() { return state; }

export function updateShip(params) {
  state.ship = { ...state.ship, ...params };
  state.offsetTable = generateOffsetTable(state.ship);
  recalculate();
  emit('ship', state.ship);
}

export function setOffsetTable(table) {
  state.offsetTable = table;
  recalculate();
  emit('offsetTable', table);
}

export function setActiveSection(section) {
  state.activeSection = section;
  // Note: do NOT emit 'navigate' here — main.ts calls navigateTo which calls setActiveSection;
  // re-emitting 'navigate' from here would create an infinite loop.
}

// ── Boot: generate default offset table immediately ──────────────────────────
state.offsetTable = generateOffsetTable(state.ship);
recalculate();
