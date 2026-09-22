/* ============================================================
 *  zobrist.js — Zobrist hashing for transposition table
 * ============================================================ */

import { EMPTY } from './constants.js';

// We use 32-bit hashes (safe integer range).
// Collision risk is acceptable for a browser engine.

function rand32() {
  return (Math.random() * 0x100000000) >>> 0;
}

// Piece keys: 15 piece-types × 64 squares
const pieceKeys = new Uint32Array(15 * 64);
for (let i = 0; i < pieceKeys.length; i++) pieceKeys[i] = rand32();

// Side-to-move key
const sideKey = rand32();

// Castling keys (16 combinations of 4 bits)
const castleKeys = new Uint32Array(16);
for (let i = 0; i < 16; i++) castleKeys[i] = rand32();

// En-passant file keys (8 files + 1 for "none")
const epKeys = new Uint32Array(9);
for (let i = 0; i < 9; i++) epKeys[i] = rand32();

export function getPieceKey(piece, sq) {
  return pieceKeys[piece * 64 + sq];
}

export function getSideKey() {
  return sideKey;
}

export function getCastleKey(rights) {
  return castleKeys[rights & 15];
}

export function getEPKey(epFile) {
  // epFile: 0-7 for a-h, or -1 / 8 for none
  return epKeys[epFile >= 0 && epFile < 8 ? epFile : 8];
}

/**
 * Compute full Zobrist hash from scratch.
 */
export function computeHash(squares, turn, castling, epSquare) {
  let h = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = squares[sq];
    if (p !== EMPTY) h ^= pieceKeys[p * 64 + sq];
  }
  if (turn === 8) h ^= sideKey; // BLACK = 8
  h ^= castleKeys[castling & 15];
  if (epSquare >= 0) {
    h ^= epKeys[epSquare & 7];
  } else {
    h ^= epKeys[8];
  }
  return h >>> 0;
}
