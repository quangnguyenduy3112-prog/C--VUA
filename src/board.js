/* ============================================================
 *  board.js — Board state: make / unmake / queries
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
  INITIAL_BOARD, CHAR_TO_PIECE, PIECE_CHAR, FILE_NAMES,
} from './constants.js';

import {
  computeHash, getPieceKey, getSideKey, getCastleKey, getEPKey,
} from './zobrist.js';

// Squares for castling validation
const SQ_A1 = 0, SQ_E1 = 4, SQ_H1 = 7;
const SQ_A8 = 56, SQ_E8 = 60, SQ_H8 = 63;

/**
 * Mutable board state.  Supports efficient make / unmake.
 */
export class Board {
  constructor() {
    this.squares   = new Int8Array(64);
    this.turn      = WHITE;         // 0 = white, 8 = black
    this.castling  = 0;             // CASTLE_WK | WQ | BK | BQ
    this.epSquare  = -1;            // en-passant target square
    this.halfMoves = 0;             // 50-move rule counter
    this.fullMoves = 1;
    this.hash      = 0;             // Zobrist hash

    // King positions (cached)
    this.kingPos   = [4, 60];       // [white, black] – indices into squares

    // History stack for unmake
    this.history   = [];

    this.reset();
  }

  /* ─── Reset to starting position ───────────────────────── */
  reset() {
    for (let i = 0; i < 64; i++) this.squares[i] = INITIAL_BOARD[i];
    this.turn      = WHITE;
    this.castling  = CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ;
    this.epSquare  = -1;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.kingPos   = [4, 60];
    this.history   = [];
    this.hash      = computeHash(this.squares, this.turn, this.castling, this.epSquare);
  }

  /* ─── Clone ────────────────────────────────────────────── */
  clone() {
    const b = new Board();
    b.squares   = new Int8Array(this.squares);
    b.turn      = this.turn;
    b.castling  = this.castling;
    b.epSquare  = this.epSquare;
    b.halfMoves = this.halfMoves;
    b.fullMoves = this.fullMoves;
    b.hash      = this.hash;
    b.kingPos   = [this.kingPos[0], this.kingPos[1]];
    b.history   = [];
    return b;
  }

  /* ─── Load FEN ─────────────────────────────────────────── */
  loadFEN(fen) {
    const parts = fen.split(' ');
    const rows = parts[0].split('/');

    this.squares.fill(EMPTY);

    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of rows[7 - r]) {
        if (ch >= '1' && ch <= '8') {
          f += +ch;
        } else {
          const piece = CHAR_TO_PIECE[ch];
          const sq = sqFrom(r, f);
          this.squares[sq] = piece;
          if (pieceType(piece) === KING) {
            this.kingPos[pieceColor(piece) === WHITE ? 0 : 1] = sq;
          }
          f++;
        }
      }
    }

    this.turn = parts[1] === 'b' ? BLACK : WHITE;

    this.castling = 0;
    if (parts[2] !== '-') {
      if (parts[2].includes('K')) this.castling |= CASTLE_WK;
      if (parts[2].includes('Q')) this.castling |= CASTLE_WQ;
      if (parts[2].includes('k')) this.castling |= CASTLE_BK;
      if (parts[2].includes('q')) this.castling |= CASTLE_BQ;
    }

    this.epSquare = parts[3] === '-' ? -1 :
      sqFrom(+parts[3][1] - 1, FILE_NAMES.indexOf(parts[3][0]));

    this.halfMoves = parts[4] ? +parts[4] : 0;
    this.fullMoves = parts[5] ? +parts[5] : 1;
    this.history   = [];
    this.hash      = computeHash(this.squares, this.turn, this.castling, this.epSquare);
  }

  /* ─── Export FEN ───────────────────────────────────────── */
  toFEN() {
    let fen = '';
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.squares[sqFrom(r, f)];
        if (p === EMPTY) { empty++; continue; }
        if (empty) { fen += empty; empty = 0; }
        fen += PIECE_CHAR[p];
      }
      if (empty) fen += empty;
      if (r > 0) fen += '/';
    }
    fen += this.turn === WHITE ? ' w ' : ' b ';
    let c = '';
    if (this.castling & CASTLE_WK) c += 'K';
    if (this.castling & CASTLE_WQ) c += 'Q';
    if (this.castling & CASTLE_BK) c += 'k';
    if (this.castling & CASTLE_BQ) c += 'q';
    fen += c || '-';
    fen += ' ';
    if (this.epSquare >= 0) {
      fen += FILE_NAMES[fileOf(this.epSquare)] + (rankOf(this.epSquare) + 1);
    } else {
      fen += '-';
    }
    fen += ` ${this.halfMoves} ${this.fullMoves}`;
    return fen;
  }

  /* ─── Make move (mutates board) ────────────────────────── */
  makeMove(move) {
    const { from, to, piece, captured, promotion, flag } = move;

    // Save state for undo
    this.history.push({
      castling:  this.castling,
      epSquare:  this.epSquare,
      halfMoves: this.halfMoves,
      hash:      this.hash,
      captured,
    });

    const sqs = this.squares;
    let h = this.hash;

    // Remove piece from origin
    h ^= getPieceKey(piece, from);
    sqs[from] = EMPTY;

    // Remove captured piece
    if (captured) {
      if (flag === FLAG_EP) {
        // En-passant: captured pawn is on a different square
        const capSq = this.turn === WHITE ? to - 8 : to + 8;
        h ^= getPieceKey(captured, capSq);
        sqs[capSq] = EMPTY;
      } else {
        h ^= getPieceKey(captured, to);
      }
    }

    // Place piece on target (or promoted piece)
    const placed = promotion || piece;
    h ^= getPieceKey(placed, to);
    sqs[to] = placed;

    // Update king position
    if (pieceType(piece) === KING) {
      this.kingPos[this.turn === WHITE ? 0 : 1] = to;

      // Handle castling rook movement
      if (flag === FLAG_CASTLE_K) {
        const rookFrom = this.turn === WHITE ? SQ_H1 : SQ_H8;
        const rookTo   = this.turn === WHITE ? 5     : 61;
        const rook     = sqs[rookFrom];
        h ^= getPieceKey(rook, rookFrom);
        h ^= getPieceKey(rook, rookTo);
        sqs[rookFrom] = EMPTY;
        sqs[rookTo]   = rook;
      } else if (flag === FLAG_CASTLE_Q) {
        const rookFrom = this.turn === WHITE ? SQ_A1 : SQ_A8;
        const rookTo   = this.turn === WHITE ? 3     : 59;
        const rook     = sqs[rookFrom];
        h ^= getPieceKey(rook, rookFrom);
        h ^= getPieceKey(rook, rookTo);
        sqs[rookFrom] = EMPTY;
        sqs[rookTo]   = rook;
      }
    }

    // Update castling rights
    h ^= getCastleKey(this.castling);
    if (pieceType(piece) === KING) {
      if (this.turn === WHITE) this.castling &= ~(CASTLE_WK | CASTLE_WQ);
      else                      this.castling &= ~(CASTLE_BK | CASTLE_BQ);
    }
    if (from === SQ_A1 || to === SQ_A1) this.castling &= ~CASTLE_WQ;
    if (from === SQ_H1 || to === SQ_H1) this.castling &= ~CASTLE_WK;
    if (from === SQ_A8 || to === SQ_A8) this.castling &= ~CASTLE_BQ;
    if (from === SQ_H8 || to === SQ_H8) this.castling &= ~CASTLE_BK;
    h ^= getCastleKey(this.castling);

    // En-passant
    h ^= getEPKey(this.epSquare >= 0 ? fileOf(this.epSquare) : -1);
    if (flag === FLAG_DOUBLE) {
      this.epSquare = this.turn === WHITE ? from + 8 : from - 8;
    } else {
      this.epSquare = -1;
    }
    h ^= getEPKey(this.epSquare >= 0 ? fileOf(this.epSquare) : -1);

    // Half-move clock
    if (pieceType(piece) === PAWN || captured) this.halfMoves = 0;
    else this.halfMoves++;

    // Full-move number
    if (this.turn === BLACK) this.fullMoves++;

    // Switch side
    h ^= getSideKey();
    this.turn ^= 8;
    this.hash = h >>> 0;
  }

  /* ─── Unmake move ──────────────────────────────────────── */
  unmakeMove(move) {
    const { from, to, piece, captured, promotion, flag } = move;

    this.turn ^= 8;
    if (this.turn === BLACK) this.fullMoves--;

    const saved = this.history.pop();
    this.castling  = saved.castling;
    this.epSquare  = saved.epSquare;
    this.halfMoves = saved.halfMoves;
    this.hash      = saved.hash;

    const sqs = this.squares;

    // Remove piece from target
    sqs[to] = EMPTY;

    // Restore piece at origin
    sqs[from] = piece;

    // Restore captured piece
    if (captured) {
      if (flag === FLAG_EP) {
        const capSq = this.turn === WHITE ? to - 8 : to + 8;
        sqs[capSq] = captured;
      } else {
        sqs[to] = captured;
      }
    }

    // Restore king position
    if (pieceType(piece) === KING) {
      this.kingPos[this.turn === WHITE ? 0 : 1] = from;

      if (flag === FLAG_CASTLE_K) {
        const rookFrom = this.turn === WHITE ? SQ_H1 : SQ_H8;
        const rookTo   = this.turn === WHITE ? 5     : 61;
        sqs[rookFrom] = sqs[rookTo];
        sqs[rookTo]   = EMPTY;
      } else if (flag === FLAG_CASTLE_Q) {
        const rookFrom = this.turn === WHITE ? SQ_A1 : SQ_A8;
        const rookTo   = this.turn === WHITE ? 3     : 59;
        sqs[rookFrom] = sqs[rookTo];
        sqs[rookTo]   = EMPTY;
      }
    }
  }

  /* ─── Is a square attacked by `byColor`? ───────────────── */
  isAttacked(sq, byColor) {
    const sqs = this.squares;
    const r = rankOf(sq), f = fileOf(sq);

    // Pawn attacks
    if (byColor === WHITE) {
      if (r > 0) {
        if (f > 0 && sqs[sq - 9] === W_PAWN) return true;
        if (f < 7 && sqs[sq - 7] === W_PAWN) return true;
      }
    } else {
      if (r < 7) {
        if (f > 0 && sqs[sq + 7] === B_PAWN) return true;
        if (f < 7 && sqs[sq + 9] === B_PAWN) return true;
      }
    }

    // Knight attacks
    const kn = byColor === WHITE ? W_KNIGHT : B_KNIGHT;
    for (const [dr, df] of KNIGHT_DELTAS) {
      const nr = r + dr, nf = f + df;
      if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8 && sqs[sqFrom(nr, nf)] === kn)
        return true;
    }

    // Bishop / Queen (diagonal)
    const bish = byColor === WHITE ? W_BISHOP : B_BISHOP;
    const queen = byColor === WHITE ? W_QUEEN : B_QUEEN;
    for (const [dr, df] of BISHOP_DIRS) {
      let nr = r + dr, nf = f + df;
      while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
        const p = sqs[sqFrom(nr, nf)];
        if (p !== EMPTY) {
          if (p === bish || p === queen) return true;
          break;
        }
        nr += dr; nf += df;
      }
    }

    // Rook / Queen (orthogonal)
    const rk = byColor === WHITE ? W_ROOK : B_ROOK;
    for (const [dr, df] of ROOK_DIRS) {
      let nr = r + dr, nf = f + df;
      while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
        const p = sqs[sqFrom(nr, nf)];
        if (p !== EMPTY) {
          if (p === rk || p === queen) return true;
          break;
        }
        nr += dr; nf += df;
      }
    }

    // King
    const kg = byColor === WHITE ? W_KING : B_KING;
    for (const [dr, df] of KING_DELTAS) {
      const nr = r + dr, nf = f + df;
      if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8 && sqs[sqFrom(nr, nf)] === kg)
        return true;
    }

    return false;
  }

  /* ─── Is current side's king in check? ─────────────────── */
  inCheck() {
    const kidx = this.turn === WHITE ? 0 : 1;
    const enemy = this.turn ^ 8;
    return this.isAttacked(this.kingPos[kidx], enemy);
  }

  /* ─── Is opponent's king in check? (after our move) ────── */
  givesCheck() {
    const kidx = this.turn === WHITE ? 1 : 0;  // opponent king
    return this.isAttacked(this.kingPos[kidx], this.turn);
  }

  /* ─── Simple draw detection ────────────────────────────── */
  isDraw50() { return this.halfMoves >= 100; }

  isInsufficientMaterial() {
    let wn = 0, wb = 0, bn = 0, bb = 0, other = false;
    for (let i = 0; i < 64; i++) {
      const p = this.squares[i];
      if (p === EMPTY) continue;
      const t = pieceType(p);
      if (t === KING) continue;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      if (pieceColor(p) === WHITE) {
        if (t === KNIGHT) wn++;
        if (t === BISHOP) wb++;
      } else {
        if (t === KNIGHT) bn++;
        if (t === BISHOP) bb++;
      }
    }
    // K vs K
    if (wn + wb + bn + bb === 0) return true;
    // K+N vs K or K+B vs K
    if (wn + wb === 0 && bn + bb <= 1) return true;
    if (bn + bb === 0 && wn + wb <= 1) return true;
    return false;
  }

  /* ─── Repetition detection (simple: check current history) */
  isRepetition() {
    if (this.history.length < 4) return false;
    let count = 0;
    for (let i = this.history.length - 2; i >= 0; i -= 2) {
      if (this.history[i].hash === this.hash) {
        count++;
        if (count >= 2) return true;
      }
    }
    return false;
  }
}
