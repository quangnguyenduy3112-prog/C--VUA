/* ============================================================
 *  opening.js — Opening book (ECO-based common lines)
 * ============================================================
 *  Maps position-key → array of good moves.
 *  Moves stored as "e2e4" strings for compactness.
 *  Expanded with deeper lines and more openings.
 * ============================================================ */

import { sqFrom, FILE_NAMES, rankOf, fileOf } from './constants.js';

/* ─── Opening book entries ───────────────────────────────────
 *  Key = move sequence string
 *  Val = array of move strings ["e2e4","d2d4",…]
 * ──────────────────────────────────────────────────────────── */
const BOOK = new Map();

function addLine(moves) {
  const list = moves.trim().split(/\s+/);
  for (let i = 0; i < list.length; i++) {
    const key = i === 0 ? 'start' : list.slice(0, i).join(' ');
    if (!BOOK.has(key)) BOOK.set(key, []);
    const arr = BOOK.get(key);
    if (!arr.includes(list[i])) arr.push(list[i]);
  }
}

// ── Italian Game ──────────────────────────────────────────
addLine('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 b1c3');
addLine('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 d2d3 g8f6 c2c3 d7d6 b2b4');
addLine('e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 c2c3 d7d6 b1d2');
addLine('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4 c2c3 b4a5 d2d4 e5d4');

// ── Ruy Lopez ─────────────────────────────────────────────
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8 h2h3 b8a5');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f6e4 d2d4 b7b5 a4b3 d7d5 d4e5 f8e7 c2c3');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4 d2d4 f8e7 d1e2 e4d6 b5c6 d7c6');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 e8g8 c2c3 d7d5');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 f8c5 c2c3 g8f6 e1g1 e8g8 d2d4');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6 d7c6 e1g1 f8d6');

// ── Sicilian Defense (Najdorf, Dragon, Sveshnikov, etc.) ─
addLine('e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3');
addLine('e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 f1e2 e7e5 d4b3');
addLine('e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5 e7e6 f2f4');
addLine('e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5 d4b5 d7d6 c1g5 a7a6 b5a3');
addLine('e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 g8f6 b1c3 d7d6 f1e2');
addLine('e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6 c1e3 f8g7 f2f3 e8g8 d1d2 b8c6');
addLine('e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 d2d3 d7d6');
addLine('e2e4 c7c5 g1f3 b8c6 f1b5 g7g6 e1g1 f8g7 f1e1 e7e5');
addLine('e2e4 c7c5 c2c3 d7d5 e4d5 d8d5 d2d4 g8f6 g1f3');

// ── French Defense ────────────────────────────────────────
addLine('e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7 g5e7 d8e7');
addLine('e2e4 e7e6 d2d4 d7d5 b1c3 f8b4 e4e5 c7c5 a2a3 b4c3 b2c3');
addLine('e2e4 e7e6 d2d4 d7d5 b1d2 g8f6 e4e5 f6d7 f1d3 c7c5 c2c3 b8c6 g1e2');
addLine('e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3 d8b6 a2a3');
addLine('e2e4 e7e6 d2d4 d7d5 b1c3 d5e4 c3e4 b8d7 g1f3 g8f6 e4f6 d7f6');

// ── Caro-Kann ─────────────────────────────────────────────
addLine('e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 b8d7 g1f3 g8f6 e4f6 d7f6 f3e5');
addLine('e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 b1c3 e7e6 g2g4 f5g6 g1e2 c6c5');
addLine('e2e4 c7c6 d2d4 d7d5 e4d5 c6d5 c2c4 g8f6 b1c3 e7e6 g1f3 f8e7');
addLine('e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6 h2h4 h7h6');
addLine('e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 g1f3 e7e6 f1e2 c6c5 e1g1');

// ── Queen's Gambit Declined ──────────────────────────────
addLine('d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 b8d7 a1c1 c7c6');
addLine('d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 f8e7 c1f4 e8g8 e2e3 c7c5');
addLine('d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c4d5 e6d5 c1g5 f8e7 e2e3 e8g8 f1d3');
addLine('d2d4 d7d5 c2c4 e7e6 g1f3 g8f6 g2g3 f8e7 f1g2 e8g8 e1g1');

// ── Queen's Gambit Accepted ──────────────────────────────
addLine('d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5 e1g1 a7a6');
addLine('d2d4 d7d5 c2c4 d5c4 e2e4 e7e5 g1f3 e5d4 f1c4');

// ── Slav Defense ──────────────────────────────────────────
addLine('d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 e7e6 e2e3 b8d7 f1d3 d5c4 d3c4');
addLine('d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5 e2e3');

// ── King's Indian Defense ─────────────────────────────────
addLine('d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 e1g1 b8c6 d4d5 c6e7');
addLine('d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f3 e8g8 c1e3 e7e5 d4d5 c7c5');
addLine('d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 d4d5 a7a5');
addLine('d2d4 g8f6 c2c4 g7g6 g1f3 f8g7 g2g3 e8g8 f1g2 d7d6 e1g1 b8d7');

// ── Nimzo-Indian ──────────────────────────────────────────
addLine('d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1c2 e8g8 a2a3 b4c3 c2c3 b7b6');
addLine('d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5 g1f3 c7c5');
addLine('d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 g1f3 c7c5 g2g3 e8g8 f1g2');

// ── Grünfeld Defense ──────────────────────────────────────
addLine('d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7 g1f3');
addLine('d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 g1f3 f8g7 d1b3 d5c4 b3c4');

// ── English Opening ──────────────────────────────────────
addLine('c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 f8b4 f1g2 e8g8 e1g1 e5e4');
addLine('c2c4 g8f6 b1c3 g7g6 g2g3 f8g7 f1g2 e8g8 e2e4 d7d6 g1e2');
addLine('c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 e2e3 f8b4 d1c2');
addLine('c2c4 c7c5 g1f3 b8c6 b1c3 g8f6 g2g3 d7d5 c4d5 f6d5');

// ── Scotch Game ───────────────────────────────────────────
addLine('e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 b1c3 f8b4 d4c6 b7c6');
addLine('e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 f8c5 c1e3 d8f6 c2c3');

// ── Pirc Defense ──────────────────────────────────────────
addLine('e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 f2f4 f8g7 g1f3 e8g8 f1d3');
addLine('e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 g1f3 f8g7 f1e2 e8g8 e1g1');

// ── London System ─────────────────────────────────────────
addLine('d2d4 d7d5 c1f4 g8f6 e2e3 e7e6 g1f3 f8d6 f4d6 c7d6 c2c4');
addLine('d2d4 g8f6 c1f4 d7d5 e2e3 e7e6 b1d2 c7c5 c2c3 b8c6 g1f3');
addLine('d2d4 d7d5 c1f4 g8f6 e2e3 c7c5 c2c3 b8c6 b1d2 d8b6');

// ── Scandinavian ──────────────────────────────────────────
addLine('e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3 c8f5 f1c4');
addLine('e2e4 d7d5 e4d5 g8f6 d2d4 f6d5 g1f3 g7g6 f1e2');

// ── Petrov / Russian ──────────────────────────────────────
addLine('e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4 d6d5 f1d3 b8c6');
addLine('e2e4 e7e5 g1f3 g8f6 d2d4 f6e4 f1d3 d7d5 f3e5 b8d7');

// ── Vienna Game ───────────────────────────────────────────
addLine('e2e4 e7e5 b1c3 g8f6 f1c4 f8c5 d2d3 d7d6 g1f3');
addLine('e2e4 e7e5 b1c3 g8f6 g2g3 d7d5 e4d5 f6d5 f1g2');

// ── King's Gambit ─────────────────────────────────────────
addLine('e2e4 e7e5 f2f4 e5f4 g1f3 g7g5 h2h4 g5g4 f3e5');
addLine('e2e4 e7e5 f2f4 e5f4 g1f3 d7d6 d2d4 g7g5 h2h4');
addLine('e2e4 e7e5 f2f4 d7d5 e4d5 e5e4 d2d3 g8f6');

// ── Catalan Opening ───────────────────────────────────────
addLine('d2d4 g8f6 c2c4 e7e6 g2g3 d7d5 f1g2 f8e7 g1f3 e8g8 e1g1 d5c4 d1c2');
addLine('d2d4 g8f6 c2c4 e7e6 g2g3 d7d5 f1g2 f8b4 b1d2 e8g8 g1f3');

// ── Dutch Defense ─────────────────────────────────────────
addLine('d2d4 f7f5 g2g3 g8f6 f1g2 g7g6 g1f3 f8g7 e1g1 e8g8 c2c4');

// ── Benoni Defense ────────────────────────────────────────
addLine('d2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6 g1f3 g7g6 e2e4');

// ── Réti Opening ──────────────────────────────────────────
addLine('g1f3 d7d5 g2g3 g8f6 f1g2 g7g6 e1g1 f8g7 d2d3 e8g8 b1d2');
addLine('g1f3 d7d5 c2c4 c7c6 g2g3 g8f6 f1g2 c8f5');

/**
 * Look up the opening book for a given move sequence.
 * @param {string[]} movesSoFar – array of move strings like ["e2e4","e7e5",…]
 * @returns {string|null} – a recommended move string or null
 */
export function lookupBook(movesSoFar) {
  const key = movesSoFar.length === 0 ? 'start' : movesSoFar.join(' ');
  const candidates = BOOK.get(key);
  if (!candidates || candidates.length === 0) return null;
  // Pick randomly among candidates for variety
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Convert a move string "e2e4" to {from, to} square indices.
 */
export function parseBookMove(str) {
  const fromFile = FILE_NAMES.indexOf(str[0]);
  const fromRank = +str[1] - 1;
  const toFile   = FILE_NAMES.indexOf(str[2]);
  const toRank   = +str[3] - 1;
  return {
    from: sqFrom(fromRank, fromFile),
    to:   sqFrom(toRank, toFile),
    promo: str.length > 4 ? str[4] : null,
  };
}
