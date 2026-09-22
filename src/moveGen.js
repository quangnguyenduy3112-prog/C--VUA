/* ============================================================
 *  moveGen.js — Legal-move generation
 * ============================================================ */

import {
  EMPTY, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  WHITE, BLACK,
  W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
  pieceType, pieceColor, isWhite, isBlack, isPiece,
  rankOf, fileOf, sqFrom, isOnBoard,
  KNIGHT_DELTAS, KING_DELTAS, BISHOP_DIRS, ROOK_DIRS,
  CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ,
  FLAG_NORMAL, FLAG_DOUBLE, FLAG_EP, FLAG_CASTLE_K, FLAG_CASTLE_Q, FLAG_PROMO,
} from './constants.js';

/* ─── Helper: create a move object ───────────────────────── */
function mv(from, to, piece, captured, flag, promotion) {
  return { from, to, piece, captured: captured || 0, flag: flag || FLAG_NORMAL, promotion: promotion || 0 };
}

/* ────────────────────────────────────────────────────────────
 *  Generate pseudo-legal moves (may leave own king in check)
 * ──────────────────────────────────────────────────────────── */
export function generatePseudoMoves(board, capturesOnly = false) {
  const moves = [];
  const sqs   = board.squares;
  const color = board.turn;
  const enemy = color ^ 8;

  for (let sq = 0; sq < 64; sq++) {
    const p = sqs[sq];
    if (p === EMPTY || pieceColor(p) !== color) continue;
    const type = pieceType(p);
    const r = rankOf(sq), f = fileOf(sq);

    // ── PAWN ────────────────────────────────────────────
    if (type === PAWN) {
      const dir    = color === WHITE ? 1 : -1;
      const startR = color === WHITE ? 1 : 6;
      const promoR = color === WHITE ? 7 : 0;

      // Pushes
      if (!capturesOnly) {
        const one = sqFrom(r + dir, f);
        if (sqs[one] === EMPTY) {
          if (r + dir === promoR) {
            addPromotions(moves, sq, one, p, 0);
          } else {
            moves.push(mv(sq, one, p, 0, FLAG_NORMAL));
            // Double push
            if (r === startR) {
              const two = sqFrom(r + 2 * dir, f);
              if (sqs[two] === EMPTY) {
                moves.push(mv(sq, two, p, 0, FLAG_DOUBLE));
              }
            }
          }
        }
      }

      // Captures
      for (const df of [-1, 1]) {
        const nf = f + df;
        if (nf < 0 || nf > 7) continue;
        const target = sqFrom(r + dir, nf);
        const tp     = sqs[target];
        if (tp !== EMPTY && pieceColor(tp) === enemy) {
          if (r + dir === promoR) {
            addPromotions(moves, sq, target, p, tp);
          } else {
            moves.push(mv(sq, target, p, tp));
          }
        }
        // En-passant
        if (target === board.epSquare) {
          const capPiece = color === WHITE ? B_PAWN : W_PAWN;
          moves.push(mv(sq, target, p, capPiece, FLAG_EP));
        }
      }
      continue;
    }

    // ── KNIGHT ──────────────────────────────────────────
    if (type === KNIGHT) {
      for (const [dr, df] of KNIGHT_DELTAS) {
        const nr = r + dr, nf = f + df;
        if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
        const target = sqFrom(nr, nf);
        const tp     = sqs[target];
        if (tp !== EMPTY && pieceColor(tp) === color) continue;
        if (capturesOnly && tp === EMPTY) continue;
        moves.push(mv(sq, target, p, tp));
      }
      continue;
    }

    // ── Sliding pieces: BISHOP, ROOK, QUEEN ─────────────
    const dirs = type === BISHOP ? BISHOP_DIRS
               : type === ROOK   ? ROOK_DIRS
               : [...BISHOP_DIRS, ...ROOK_DIRS];

    if (type === BISHOP || type === ROOK || type === QUEEN) {
      for (const [dr, df] of dirs) {
        let nr = r + dr, nf = f + df;
        while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
          const target = sqFrom(nr, nf);
          const tp     = sqs[target];
          if (tp !== EMPTY) {
            if (pieceColor(tp) === enemy) {
              moves.push(mv(sq, target, p, tp));
            }
            break;
          }
          if (!capturesOnly) moves.push(mv(sq, target, p, 0));
          nr += dr; nf += df;
        }
      }
      continue;
    }

    // ── KING ────────────────────────────────────────────
    if (type === KING) {
      for (const [dr, df] of KING_DELTAS) {
        const nr = r + dr, nf = f + df;
        if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
        const target = sqFrom(nr, nf);
        const tp     = sqs[target];
        if (tp !== EMPTY && pieceColor(tp) === color) continue;
        if (capturesOnly && tp === EMPTY) continue;
        moves.push(mv(sq, target, p, tp));
      }

      // Castling (only in non-captures mode)
      if (!capturesOnly) {
        if (color === WHITE) {
          // King-side
          if ((board.castling & CASTLE_WK) &&
              sqs[5] === EMPTY && sqs[6] === EMPTY &&
              !board.isAttacked(4, BLACK) &&
              !board.isAttacked(5, BLACK) &&
              !board.isAttacked(6, BLACK)) {
            moves.push(mv(4, 6, p, 0, FLAG_CASTLE_K));
          }
          // Queen-side
          if ((board.castling & CASTLE_WQ) &&
              sqs[1] === EMPTY && sqs[2] === EMPTY && sqs[3] === EMPTY &&
              !board.isAttacked(4, BLACK) &&
              !board.isAttacked(3, BLACK) &&
              !board.isAttacked(2, BLACK)) {
            moves.push(mv(4, 2, p, 0, FLAG_CASTLE_Q));
          }
        } else {
          if ((board.castling & CASTLE_BK) &&
              sqs[61] === EMPTY && sqs[62] === EMPTY &&
              !board.isAttacked(60, WHITE) &&
              !board.isAttacked(61, WHITE) &&
              !board.isAttacked(62, WHITE)) {
            moves.push(mv(60, 62, p, 0, FLAG_CASTLE_K));
          }
          if ((board.castling & CASTLE_BQ) &&
              sqs[57] === EMPTY && sqs[58] === EMPTY && sqs[59] === EMPTY &&
              !board.isAttacked(60, WHITE) &&
              !board.isAttacked(59, WHITE) &&
              !board.isAttacked(58, WHITE)) {
            moves.push(mv(60, 58, p, 0, FLAG_CASTLE_Q));
          }
        }
      }
    }
  }

  return moves;
}

/* ─── Add four promotion moves ───────────────────────────── */
function addPromotions(list, from, to, piece, captured) {
  const color = pieceColor(piece);
  const q = color === WHITE ? W_QUEEN  : B_QUEEN;
  const r = color === WHITE ? W_ROOK   : B_ROOK;
  const b = color === WHITE ? W_BISHOP : B_BISHOP;
  const n = color === WHITE ? W_KNIGHT : B_KNIGHT;
  list.push(mv(from, to, piece, captured, FLAG_PROMO, q));
  list.push(mv(from, to, piece, captured, FLAG_PROMO, r));
  list.push(mv(from, to, piece, captured, FLAG_PROMO, b));
  list.push(mv(from, to, piece, captured, FLAG_PROMO, n));
}

/* ────────────────────────────────────────────────────────────
 *  Generate only legal moves (filters out self-checks)
 * ──────────────────────────────────────────────────────────── */
export function generateLegalMoves(board) {
  const pseudos = generatePseudoMoves(board, false);
  const legals  = [];
  const color   = board.turn;
  const enemy   = color ^ 8;

  for (const move of pseudos) {
    board.makeMove(move);
    // After making the move, turn has switched.
    // Check if the side that JUST moved (color) is in check.
    const kingIdx = color === WHITE ? 0 : 1;
    if (!board.isAttacked(board.kingPos[kingIdx], enemy)) {
      legals.push(move);
    }
    board.unmakeMove(move);
  }

  return legals;
}

/* ────────────────────────────────────────────────────────────
 *  Generate legal captures (for quiescence search)
 * ──────────────────────────────────────────────────────────── */
export function generateLegalCaptures(board) {
  const pseudos = generatePseudoMoves(board, true);
  const legals  = [];
  const color   = board.turn;
  const enemy   = color ^ 8;

  for (const move of pseudos) {
    board.makeMove(move);
    const kingIdx = color === WHITE ? 0 : 1;
    if (!board.isAttacked(board.kingPos[kingIdx], enemy)) {
      legals.push(move);
    }
    board.unmakeMove(move);
  }

  return legals;
}

/* ────────────────────────────────────────────────────────────
 *  Has any legal move? (for checkmate / stalemate detection)
 * ──────────────────────────────────────────────────────────── */
export function hasLegalMove(board) {
  const pseudos = generatePseudoMoves(board, false);
  const color   = board.turn;
  const enemy   = color ^ 8;

  for (const move of pseudos) {
    board.makeMove(move);
    const kingIdx = color === WHITE ? 0 : 1;
    const legal = !board.isAttacked(board.kingPos[kingIdx], enemy);
    board.unmakeMove(move);
    if (legal) return true;
  }

  return false;
}
