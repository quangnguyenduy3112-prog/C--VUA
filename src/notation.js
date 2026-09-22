/* ============================================================
 *  notation.js — Algebraic notation for move display
 * ============================================================ */

import {
  PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  pieceType, pieceColor, WHITE,
  fileOf, rankOf, sqName,
  FLAG_CASTLE_K, FLAG_CASTLE_Q, FLAG_EP, FLAG_PROMO,
} from './constants.js';

import { generateLegalMoves } from './moveGen.js';

const TYPE_CHAR = { [KNIGHT]: 'N', [BISHOP]: 'B', [ROOK]: 'R', [QUEEN]: 'Q', [KING]: 'K' };

/**
 * Convert a move to Standard Algebraic Notation (SAN).
 * Must be called BEFORE the move is made on the board.
 */
export function moveToSAN(move, board) {
  const { from, to, piece, captured, promotion, flag } = move;

  // Castling
  if (flag === FLAG_CASTLE_K) return 'O-O';
  if (flag === FLAG_CASTLE_Q) return 'O-O-O';

  const type = pieceType(piece);
  let san = '';

  if (type === PAWN) {
    if (captured) {
      san += sqName(from)[0] + 'x';
    }
    san += sqName(to);
    if (flag === FLAG_PROMO && promotion) {
      san += '=' + TYPE_CHAR[pieceType(promotion)];
    }
  } else {
    san += TYPE_CHAR[type] || '';

    // Disambiguation: check if another piece of same type can move to same square
    const allMoves = generateLegalMoves(board);
    const ambiguous = allMoves.filter(m =>
      m.from !== from &&
      m.to === to &&
      pieceType(m.piece) === type &&
      pieceColor(m.piece) === pieceColor(piece)
    );

    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some(m => fileOf(m.from) === fileOf(from));
      const sameRank = ambiguous.some(m => rankOf(m.from) === rankOf(from));

      if (!sameFile) {
        san += sqName(from)[0]; // file
      } else if (!sameRank) {
        san += sqName(from)[1]; // rank
      } else {
        san += sqName(from); // both
      }
    }

    if (captured) san += 'x';
    san += sqName(to);
  }

  // Check / checkmate indicator
  board.makeMove(move);
  if (board.inCheck()) {
    // Check if it's checkmate
    const replies = generateLegalMoves(board);
    san += replies.length === 0 ? '#' : '+';
  }
  board.unmakeMove(move);

  return san;
}

/**
 * Format move number + SAN for move list display.
 */
export function formatMoveEntry(moveNumber, isWhite, san) {
  if (isWhite) {
    return `${moveNumber}. ${san}`;
  }
  return san;
}
