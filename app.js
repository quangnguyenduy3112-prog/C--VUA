/* ============================================================
 *  Cờ Vua AI — Bundled Application
 *  All modules combined for standalone operation (no server needed)
 * ============================================================ */
(function() {
"use strict";

// ═══════════════════════════════════════════════════════════
//  constants.js
// ═══════════════════════════════════════════════════════════
const EMPTY  = 0;
const PAWN   = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK   = 4;
const QUEEN  = 5;
const KING   = 6;

const WHITE = 0;
const BLACK = 8;

const W_PAWN   = 1;
const W_KNIGHT = 2;
const W_BISHOP = 3;
const W_ROOK   = 4;
const W_QUEEN  = 5;
const W_KING   = 6;
const B_PAWN   = 9;
const B_KNIGHT = 10;
const B_BISHOP = 11;
const B_ROOK   = 12;
const B_QUEEN  = 13;
const B_KING   = 14;

function pieceType(p)  { return p & 7; }
function pieceColor(p) { return p & 8; }
function isWhite(p)    { return p !== 0 && (p & 8) === 0; }
function isBlack(p)    { return (p & 8) !== 0; }
function isPiece(p)    { return p !== 0; }
function colorOf(p)    { return (p & 8) === 0 ? WHITE : BLACK; }

function rankOf(sq) { return sq >> 3; }
function fileOf(sq) { return sq & 7; }
function sqFrom(r, f) { return (r << 3) | f; }
function isOnBoard(r, f) { return (r | f) >= 0 && r < 8 && f < 8; }
function mirrorSq(sq) { return ((7 - (sq >> 3)) << 3) | (sq & 7); }

const KNIGHT_DELTAS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_DELTAS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ROOK_DIRS   = [[-1,0],[1,0],[0,-1],[0,1]];

const CASTLE_WK = 1;
const CASTLE_WQ = 2;
const CASTLE_BK = 4;
const CASTLE_BQ = 8;

const FLAG_NORMAL   = 0;
const FLAG_DOUBLE   = 1;
const FLAG_EP       = 2;
const FLAG_CASTLE_K = 3;
const FLAG_CASTLE_Q = 4;
const FLAG_PROMO    = 5;

const INITIAL_BOARD = [
  W_ROOK, W_KNIGHT, W_BISHOP, W_QUEEN, W_KING, W_BISHOP, W_KNIGHT, W_ROOK,
  W_PAWN, W_PAWN,   W_PAWN,   W_PAWN,  W_PAWN, W_PAWN,   W_PAWN,   W_PAWN,
  EMPTY,  EMPTY,    EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,
  EMPTY,  EMPTY,    EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,
  EMPTY,  EMPTY,    EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,
  EMPTY,  EMPTY,    EMPTY,    EMPTY,   EMPTY,  EMPTY,    EMPTY,    EMPTY,
  B_PAWN, B_PAWN,   B_PAWN,   B_PAWN,  B_PAWN, B_PAWN,   B_PAWN,   B_PAWN,
  B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, B_BISHOP, B_KNIGHT, B_ROOK,
];

const VAL_MG = [0, 82, 337, 365, 477, 1025, 20000];
const VAL_EG = [0, 94, 281, 297, 512,  936, 20000];
const PHASE_VAL = [0, 0, 1, 1, 2, 4, 0];

const PST_PAWN_MG = [0,0,0,0,0,0,0,0,-35,-1,-20,-23,-15,24,38,-22,-26,-4,-4,-10,3,3,33,-12,-27,-2,-5,12,17,6,10,-25,-14,13,6,21,23,12,17,-23,-6,7,26,31,65,56,25,-20,98,134,61,95,68,126,34,-11,0,0,0,0,0,0,0,0];
const PST_PAWN_EG = [0,0,0,0,0,0,0,0,-17,-7,6,1,1,6,-7,-17,-13,-6,2,8,8,2,-6,-13,-8,-4,7,22,22,7,-4,-8,-1,5,13,27,27,13,5,-1,3,3,10,19,19,10,3,3,13,8,8,10,10,8,8,13,0,0,0,0,0,0,0,0];
const PST_KNIGHT_MG = [-167,-89,-34,-49,61,-97,-15,-107,-73,-41,72,36,23,62,7,-17,-47,60,37,65,84,129,73,44,-9,17,19,53,37,69,18,22,-13,4,16,13,28,19,21,-8,-23,-9,12,10,19,17,25,-16,-29,-53,-12,-3,-1,18,-14,-19,-105,-21,-58,-33,-17,-28,-19,-23];
const PST_KNIGHT_EG = [-58,-38,-13,-28,-31,-27,-63,-99,-25,-8,-25,-2,-9,-25,-24,-52,-24,-20,10,9,-1,-9,-19,-41,-17,3,22,22,22,11,8,-18,-18,-6,16,25,16,17,4,-18,-23,-3,-1,15,10,-3,-20,-22,-42,-20,-10,-5,-2,-20,-23,-44,-29,-51,-23,-15,-22,-18,-50,-64];
const PST_BISHOP_MG = [-29,4,-82,-37,-25,-42,7,-8,-26,16,-18,-13,30,59,18,-47,-16,37,43,40,35,50,37,-2,-4,5,19,50,37,37,7,-2,-6,13,13,26,34,12,10,4,0,15,15,15,14,27,18,10,4,15,16,0,7,21,33,1,-33,-3,-14,-21,-13,-12,-39,-21];
const PST_BISHOP_EG = [-14,-21,-11,-8,-7,-9,-17,-24,-8,-4,7,-12,-3,-13,-4,-14,2,-8,0,-1,-2,6,0,4,-3,9,12,9,14,10,3,2,-6,3,13,19,7,10,-3,-9,-12,-3,8,10,13,3,-7,-15,-14,-18,-7,-1,4,-9,-15,-27,-23,-9,-23,-5,-9,-16,-5,-17];
const PST_ROOK_MG = [32,42,32,51,63,9,31,43,27,32,58,62,80,67,26,44,-5,19,26,36,17,45,61,16,-24,-11,7,26,24,35,-8,-20,-36,-26,-12,-1,9,-7,6,-23,-45,-25,-16,-17,3,0,-5,-33,-44,-16,-20,-9,-1,11,-6,-71,-19,-13,1,17,16,7,-37,-26];
const PST_ROOK_EG = [13,10,18,15,12,12,8,5,11,13,13,11,-3,3,8,3,7,7,7,5,4,-3,-5,-3,4,3,13,1,2,1,-1,2,3,5,8,4,-5,-6,-8,-11,-4,0,-5,-1,-7,-12,-8,-16,-6,-6,0,2,-9,-9,-11,-3,-9,2,3,-1,-5,-13,4,-20];
const PST_QUEEN_MG = [-28,0,29,12,59,44,43,45,-24,-39,-5,1,-16,57,28,54,-13,-17,7,8,29,56,47,57,-27,-27,-16,-16,-1,17,-2,1,-9,-26,-9,-10,-2,-4,3,-3,-14,2,-11,-2,-5,2,14,5,-35,-8,11,2,8,15,-3,1,-1,-18,-9,10,-15,-25,-31,-50];
const PST_QUEEN_EG = [-9,22,22,27,27,19,10,20,-17,20,32,41,58,25,30,0,-20,6,9,49,47,35,19,9,3,22,24,45,57,40,57,36,-18,28,19,47,31,34,39,23,-16,-27,15,6,9,17,10,5,-22,-23,-30,-16,-16,-23,-36,-32,-33,-28,-22,-43,-5,-32,-20,-41];
const PST_KING_MG = [-65,23,16,-15,-56,-34,2,13,29,-1,-20,-7,-8,-4,-38,-29,-9,24,2,-16,-20,6,22,-22,-17,-20,-12,-27,-30,-25,-14,-36,-49,-1,-27,-39,-46,-44,-33,-51,-14,-14,-22,-46,-44,-30,-15,-27,1,7,-8,-64,-43,-16,9,8,-15,36,12,-54,8,-28,24,14];
const PST_KING_EG = [-74,-35,-18,-18,-11,15,4,-17,-12,17,14,17,17,38,23,11,10,17,23,15,20,45,44,13,-8,22,24,27,26,33,26,3,-18,-4,21,24,27,23,9,-11,-19,-3,11,21,23,16,7,-9,-27,-11,4,13,14,4,-5,-17,-53,-34,-21,-11,-28,-14,-24,-43];

const PST_MG = [null,PST_PAWN_MG,PST_KNIGHT_MG,PST_BISHOP_MG,PST_ROOK_MG,PST_QUEEN_MG,PST_KING_MG];
const PST_EG = [null,PST_PAWN_EG,PST_KNIGHT_EG,PST_BISHOP_EG,PST_ROOK_EG,PST_QUEEN_EG,PST_KING_EG];

const PIECE_UNICODE = {
  [W_KING]:'♔',[W_QUEEN]:'♕',[W_ROOK]:'♖',[W_BISHOP]:'♗',[W_KNIGHT]:'♘',[W_PAWN]:'♙',
  [B_KING]:'♚',[B_QUEEN]:'♛',[B_ROOK]:'♜',[B_BISHOP]:'♝',[B_KNIGHT]:'♞',[B_PAWN]:'♟',
};

const PIECE_CHAR = {
  [W_KING]:'K',[W_QUEEN]:'Q',[W_ROOK]:'R',[W_BISHOP]:'B',[W_KNIGHT]:'N',[W_PAWN]:'P',
  [B_KING]:'k',[B_QUEEN]:'q',[B_ROOK]:'r',[B_BISHOP]:'b',[B_KNIGHT]:'n',[B_PAWN]:'p',
};

const CHAR_TO_PIECE = {};
for (const [k, v] of Object.entries(PIECE_CHAR)) CHAR_TO_PIECE[v] = +k;

const FILE_NAMES = 'abcdefgh';
const RANK_NAMES = '12345678';

function sqName(sq) { return FILE_NAMES[fileOf(sq)] + RANK_NAMES[rankOf(sq)]; }
function nameToSq(name) { return sqFrom(+name[1] - 1, FILE_NAMES.indexOf(name[0])); }

// ═══════════════════════════════════════════════════════════
//  zobrist.js
// ═══════════════════════════════════════════════════════════
function rand32() { return (Math.random() * 0x100000000) >>> 0; }

const pieceKeys = new Uint32Array(15 * 64);
for (let i = 0; i < pieceKeys.length; i++) pieceKeys[i] = rand32();
const sideKey = rand32();
const castleKeys = new Uint32Array(16);
for (let i = 0; i < 16; i++) castleKeys[i] = rand32();
const epKeys = new Uint32Array(9);
for (let i = 0; i < 9; i++) epKeys[i] = rand32();

function getPieceKey(piece, sq) { return pieceKeys[piece * 64 + sq]; }
function getSideKey() { return sideKey; }
function getCastleKey(rights) { return castleKeys[rights & 15]; }
function getEPKey(epFile) { return epKeys[epFile >= 0 && epFile < 8 ? epFile : 8]; }

function computeHash(squares, turn, castling, epSquare) {
  let h = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = squares[sq];
    if (p !== EMPTY) h ^= pieceKeys[p * 64 + sq];
  }
  if (turn === 8) h ^= sideKey;
  h ^= castleKeys[castling & 15];
  if (epSquare >= 0) h ^= epKeys[epSquare & 7];
  else h ^= epKeys[8];
  return h >>> 0;
}

// ═══════════════════════════════════════════════════════════
//  board.js
// ═══════════════════════════════════════════════════════════
const SQ_A1 = 0, SQ_E1 = 4, SQ_H1 = 7;
const SQ_A8 = 56, SQ_E8 = 60, SQ_H8 = 63;

class Board {
  constructor() {
    this.squares = new Int8Array(64);
    this.turn = WHITE;
    this.castling = 0;
    this.epSquare = -1;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.hash = 0;
    this.kingPos = [4, 60];
    this.history = [];
    this.reset();
  }

  reset() {
    for (let i = 0; i < 64; i++) this.squares[i] = INITIAL_BOARD[i];
    this.turn = WHITE;
    this.castling = CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ;
    this.epSquare = -1;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.kingPos = [4, 60];
    this.history = [];
    this.hash = computeHash(this.squares, this.turn, this.castling, this.epSquare);
  }

  clone() {
    const b = new Board();
    b.squares = new Int8Array(this.squares);
    b.turn = this.turn;
    b.castling = this.castling;
    b.epSquare = this.epSquare;
    b.halfMoves = this.halfMoves;
    b.fullMoves = this.fullMoves;
    b.hash = this.hash;
    b.kingPos = [this.kingPos[0], this.kingPos[1]];
    b.history = [];
    return b;
  }

  loadFEN(fen) {
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    this.squares.fill(EMPTY);
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of rows[7 - r]) {
        if (ch >= '1' && ch <= '8') { f += +ch; }
        else {
          const piece = CHAR_TO_PIECE[ch];
          const sq = sqFrom(r, f);
          this.squares[sq] = piece;
          if (pieceType(piece) === KING) this.kingPos[pieceColor(piece) === WHITE ? 0 : 1] = sq;
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
    this.epSquare = parts[3] === '-' ? -1 : sqFrom(+parts[3][1] - 1, FILE_NAMES.indexOf(parts[3][0]));
    this.halfMoves = parts[4] ? +parts[4] : 0;
    this.fullMoves = parts[5] ? +parts[5] : 1;
    this.history = [];
    this.hash = computeHash(this.squares, this.turn, this.castling, this.epSquare);
  }

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
    if (this.epSquare >= 0) fen += FILE_NAMES[fileOf(this.epSquare)] + (rankOf(this.epSquare) + 1);
    else fen += '-';
    fen += ` ${this.halfMoves} ${this.fullMoves}`;
    return fen;
  }

  makeMove(move) {
    const { from, to, piece, captured, promotion, flag } = move;
    this.history.push({ castling: this.castling, epSquare: this.epSquare, halfMoves: this.halfMoves, hash: this.hash, captured });
    const sqs = this.squares;
    let h = this.hash;
    h ^= getPieceKey(piece, from);
    sqs[from] = EMPTY;
    if (captured) {
      if (flag === FLAG_EP) {
        const capSq = this.turn === WHITE ? to - 8 : to + 8;
        h ^= getPieceKey(captured, capSq);
        sqs[capSq] = EMPTY;
      } else {
        h ^= getPieceKey(captured, to);
      }
    }
    const placed = promotion || piece;
    h ^= getPieceKey(placed, to);
    sqs[to] = placed;
    if (pieceType(piece) === KING) {
      this.kingPos[this.turn === WHITE ? 0 : 1] = to;
      if (flag === FLAG_CASTLE_K) {
        const rookFrom = this.turn === WHITE ? SQ_H1 : SQ_H8;
        const rookTo = this.turn === WHITE ? 5 : 61;
        const rook = sqs[rookFrom];
        h ^= getPieceKey(rook, rookFrom);
        h ^= getPieceKey(rook, rookTo);
        sqs[rookFrom] = EMPTY;
        sqs[rookTo] = rook;
      } else if (flag === FLAG_CASTLE_Q) {
        const rookFrom = this.turn === WHITE ? SQ_A1 : SQ_A8;
        const rookTo = this.turn === WHITE ? 3 : 59;
        const rook = sqs[rookFrom];
        h ^= getPieceKey(rook, rookFrom);
        h ^= getPieceKey(rook, rookTo);
        sqs[rookFrom] = EMPTY;
        sqs[rookTo] = rook;
      }
    }
    h ^= getCastleKey(this.castling);
    if (pieceType(piece) === KING) {
      if (this.turn === WHITE) this.castling &= ~(CASTLE_WK | CASTLE_WQ);
      else this.castling &= ~(CASTLE_BK | CASTLE_BQ);
    }
    if (from === SQ_A1 || to === SQ_A1) this.castling &= ~CASTLE_WQ;
    if (from === SQ_H1 || to === SQ_H1) this.castling &= ~CASTLE_WK;
    if (from === SQ_A8 || to === SQ_A8) this.castling &= ~CASTLE_BQ;
    if (from === SQ_H8 || to === SQ_H8) this.castling &= ~CASTLE_BK;
    h ^= getCastleKey(this.castling);
    h ^= getEPKey(this.epSquare >= 0 ? fileOf(this.epSquare) : -1);
    if (flag === FLAG_DOUBLE) this.epSquare = this.turn === WHITE ? from + 8 : from - 8;
    else this.epSquare = -1;
    h ^= getEPKey(this.epSquare >= 0 ? fileOf(this.epSquare) : -1);
    if (pieceType(piece) === PAWN || captured) this.halfMoves = 0;
    else this.halfMoves++;
    if (this.turn === BLACK) this.fullMoves++;
    h ^= getSideKey();
    this.turn ^= 8;
    this.hash = h >>> 0;
  }

  unmakeMove(move) {
    const { from, to, piece, captured, promotion, flag } = move;
    this.turn ^= 8;
    if (this.turn === BLACK) this.fullMoves--;
    const saved = this.history.pop();
    this.castling = saved.castling;
    this.epSquare = saved.epSquare;
    this.halfMoves = saved.halfMoves;
    this.hash = saved.hash;
    const sqs = this.squares;
    sqs[to] = EMPTY;
    sqs[from] = piece;
    if (captured) {
      if (flag === FLAG_EP) {
        const capSq = this.turn === WHITE ? to - 8 : to + 8;
        sqs[capSq] = captured;
      } else {
        sqs[to] = captured;
      }
    }
    if (pieceType(piece) === KING) {
      this.kingPos[this.turn === WHITE ? 0 : 1] = from;
      if (flag === FLAG_CASTLE_K) {
        const rookFrom = this.turn === WHITE ? SQ_H1 : SQ_H8;
        const rookTo = this.turn === WHITE ? 5 : 61;
        sqs[rookFrom] = sqs[rookTo];
        sqs[rookTo] = EMPTY;
      } else if (flag === FLAG_CASTLE_Q) {
        const rookFrom = this.turn === WHITE ? SQ_A1 : SQ_A8;
        const rookTo = this.turn === WHITE ? 3 : 59;
        sqs[rookFrom] = sqs[rookTo];
        sqs[rookTo] = EMPTY;
      }
    }
  }

  isAttacked(sq, byColor) {
    const sqs = this.squares;
    const r = rankOf(sq), f = fileOf(sq);
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
    const kn = byColor === WHITE ? W_KNIGHT : B_KNIGHT;
    for (const [dr, df] of KNIGHT_DELTAS) {
      const nr = r + dr, nf = f + df;
      if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8 && sqs[sqFrom(nr, nf)] === kn) return true;
    }
    const bish = byColor === WHITE ? W_BISHOP : B_BISHOP;
    const queen = byColor === WHITE ? W_QUEEN : B_QUEEN;
    for (const [dr, df] of BISHOP_DIRS) {
      let nr = r + dr, nf = f + df;
      while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
        const p = sqs[sqFrom(nr, nf)];
        if (p !== EMPTY) { if (p === bish || p === queen) return true; break; }
        nr += dr; nf += df;
      }
    }
    const rk = byColor === WHITE ? W_ROOK : B_ROOK;
    for (const [dr, df] of ROOK_DIRS) {
      let nr = r + dr, nf = f + df;
      while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
        const p = sqs[sqFrom(nr, nf)];
        if (p !== EMPTY) { if (p === rk || p === queen) return true; break; }
        nr += dr; nf += df;
      }
    }
    const kg = byColor === WHITE ? W_KING : B_KING;
    for (const [dr, df] of KING_DELTAS) {
      const nr = r + dr, nf = f + df;
      if (nr >= 0 && nr < 8 && nf >= 0 && nf < 8 && sqs[sqFrom(nr, nf)] === kg) return true;
    }
    return false;
  }

  inCheck() {
    const kidx = this.turn === WHITE ? 0 : 1;
    return this.isAttacked(this.kingPos[kidx], this.turn ^ 8);
  }

  givesCheck() {
    const kidx = this.turn === WHITE ? 1 : 0;
    return this.isAttacked(this.kingPos[kidx], this.turn);
  }

  isDraw50() { return this.halfMoves >= 100; }

  isInsufficientMaterial() {
    let wn = 0, wb = 0, bn = 0, bb = 0;
    for (let i = 0; i < 64; i++) {
      const p = this.squares[i];
      if (p === EMPTY) continue;
      const t = pieceType(p);
      if (t === KING) continue;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      if (pieceColor(p) === WHITE) { if (t === KNIGHT) wn++; if (t === BISHOP) wb++; }
      else { if (t === KNIGHT) bn++; if (t === BISHOP) bb++; }
    }
    if (wn + wb + bn + bb === 0) return true;
    if (wn + wb === 0 && bn + bb <= 1) return true;
    if (bn + bb === 0 && wn + wb <= 1) return true;
    return false;
  }

  isRepetition() {
    if (this.history.length < 4) return false;
    let count = 0;
    for (let i = this.history.length - 2; i >= 0; i -= 2) {
      if (this.history[i].hash === this.hash) { count++; if (count >= 2) return true; }
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
//  moveGen.js
// ═══════════════════════════════════════════════════════════
function mv(from, to, piece, captured, flag, promotion) {
  return { from, to, piece, captured: captured || 0, flag: flag || FLAG_NORMAL, promotion: promotion || 0 };
}

function addPromotions(list, from, to, piece, captured) {
  const color = pieceColor(piece);
  const q = color === WHITE ? W_QUEEN : B_QUEEN;
  const r = color === WHITE ? W_ROOK : B_ROOK;
  const b = color === WHITE ? W_BISHOP : B_BISHOP;
  const n = color === WHITE ? W_KNIGHT : B_KNIGHT;
  list.push(mv(from, to, piece, captured, FLAG_PROMO, q));
  list.push(mv(from, to, piece, captured, FLAG_PROMO, r));
  list.push(mv(from, to, piece, captured, FLAG_PROMO, b));
  list.push(mv(from, to, piece, captured, FLAG_PROMO, n));
}

function generatePseudoMoves(board, capturesOnly = false) {
  const moves = [];
  const sqs = board.squares;
  const color = board.turn;
  const enemy = color ^ 8;
  for (let sq = 0; sq < 64; sq++) {
    const p = sqs[sq];
    if (p === EMPTY || pieceColor(p) !== color) continue;
    const type = pieceType(p);
    const r = rankOf(sq), f = fileOf(sq);
    if (type === PAWN) {
      const dir = color === WHITE ? 1 : -1;
      const startR = color === WHITE ? 1 : 6;
      const promoR = color === WHITE ? 7 : 0;
      if (!capturesOnly) {
        const one = sqFrom(r + dir, f);
        if (sqs[one] === EMPTY) {
          if (r + dir === promoR) addPromotions(moves, sq, one, p, 0);
          else {
            moves.push(mv(sq, one, p, 0, FLAG_NORMAL));
            if (r === startR) {
              const two = sqFrom(r + 2 * dir, f);
              if (sqs[two] === EMPTY) moves.push(mv(sq, two, p, 0, FLAG_DOUBLE));
            }
          }
        }
      }
      for (const df of [-1, 1]) {
        const nf = f + df;
        if (nf < 0 || nf > 7) continue;
        const target = sqFrom(r + dir, nf);
        const tp = sqs[target];
        if (tp !== EMPTY && pieceColor(tp) === enemy) {
          if (r + dir === promoR) addPromotions(moves, sq, target, p, tp);
          else moves.push(mv(sq, target, p, tp));
        }
        if (target === board.epSquare) {
          const capPiece = color === WHITE ? B_PAWN : W_PAWN;
          moves.push(mv(sq, target, p, capPiece, FLAG_EP));
        }
      }
      continue;
    }
    if (type === KNIGHT) {
      for (const [dr, df] of KNIGHT_DELTAS) {
        const nr = r + dr, nf = f + df;
        if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
        const target = sqFrom(nr, nf);
        const tp = sqs[target];
        if (tp !== EMPTY && pieceColor(tp) === color) continue;
        if (capturesOnly && tp === EMPTY) continue;
        moves.push(mv(sq, target, p, tp));
      }
      continue;
    }
    if (type === BISHOP || type === ROOK || type === QUEEN) {
      const dirs = type === BISHOP ? BISHOP_DIRS : type === ROOK ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
      for (const [dr, df] of dirs) {
        let nr = r + dr, nf = f + df;
        while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
          const target = sqFrom(nr, nf);
          const tp = sqs[target];
          if (tp !== EMPTY) {
            if (pieceColor(tp) === enemy) moves.push(mv(sq, target, p, tp));
            break;
          }
          if (!capturesOnly) moves.push(mv(sq, target, p, 0));
          nr += dr; nf += df;
        }
      }
      continue;
    }
    if (type === KING) {
      for (const [dr, df] of KING_DELTAS) {
        const nr = r + dr, nf = f + df;
        if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
        const target = sqFrom(nr, nf);
        const tp = sqs[target];
        if (tp !== EMPTY && pieceColor(tp) === color) continue;
        if (capturesOnly && tp === EMPTY) continue;
        moves.push(mv(sq, target, p, tp));
      }
      if (!capturesOnly) {
        if (color === WHITE) {
          if ((board.castling & CASTLE_WK) && sqs[5] === EMPTY && sqs[6] === EMPTY && !board.isAttacked(4, BLACK) && !board.isAttacked(5, BLACK) && !board.isAttacked(6, BLACK))
            moves.push(mv(4, 6, p, 0, FLAG_CASTLE_K));
          if ((board.castling & CASTLE_WQ) && sqs[1] === EMPTY && sqs[2] === EMPTY && sqs[3] === EMPTY && !board.isAttacked(4, BLACK) && !board.isAttacked(3, BLACK) && !board.isAttacked(2, BLACK))
            moves.push(mv(4, 2, p, 0, FLAG_CASTLE_Q));
        } else {
          if ((board.castling & CASTLE_BK) && sqs[61] === EMPTY && sqs[62] === EMPTY && !board.isAttacked(60, WHITE) && !board.isAttacked(61, WHITE) && !board.isAttacked(62, WHITE))
            moves.push(mv(60, 62, p, 0, FLAG_CASTLE_K));
          if ((board.castling & CASTLE_BQ) && sqs[57] === EMPTY && sqs[58] === EMPTY && sqs[59] === EMPTY && !board.isAttacked(60, WHITE) && !board.isAttacked(59, WHITE) && !board.isAttacked(58, WHITE))
            moves.push(mv(60, 58, p, 0, FLAG_CASTLE_Q));
        }
      }
    }
  }
  return moves;
}

function generateLegalMoves(board) {
  const pseudos = generatePseudoMoves(board, false);
  const legals = [];
  const color = board.turn;
  const enemy = color ^ 8;
  for (const move of pseudos) {
    board.makeMove(move);
    const kingIdx = color === WHITE ? 0 : 1;
    if (!board.isAttacked(board.kingPos[kingIdx], enemy)) legals.push(move);
    board.unmakeMove(move);
  }
  return legals;
}

function generateLegalCaptures(board) {
  const pseudos = generatePseudoMoves(board, true);
  const legals = [];
  const color = board.turn;
  const enemy = color ^ 8;
  for (const move of pseudos) {
    board.makeMove(move);
    const kingIdx = color === WHITE ? 0 : 1;
    if (!board.isAttacked(board.kingPos[kingIdx], enemy)) legals.push(move);
    board.unmakeMove(move);
  }
  return legals;
}

function hasLegalMove(board) {
  const pseudos = generatePseudoMoves(board, false);
  const color = board.turn;
  const enemy = color ^ 8;
  for (const move of pseudos) {
    board.makeMove(move);
    const kingIdx = color === WHITE ? 0 : 1;
    const legal = !board.isAttacked(board.kingPos[kingIdx], enemy);
    board.unmakeMove(move);
    if (legal) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
//  evaluation.js
// ═══════════════════════════════════════════════════════════
function evaluate(board) {
  const sqs = board.squares;
  let mgWhite = 0, mgBlack = 0, egWhite = 0, egBlack = 0, phase = 0;
  let wBishops = 0, bBishops = 0;
  const wPawnFiles = new Uint8Array(8), bPawnFiles = new Uint8Array(8);
  const wPawnRanks = new Int8Array(8).fill(-1), bPawnRanks = new Int8Array(8).fill(8);

  for (let sq = 0; sq < 64; sq++) {
    const p = sqs[sq];
    if (p === EMPTY) continue;
    const type = pieceType(p), color = pieceColor(p);
    const idx = color === WHITE ? sq : mirrorSq(sq);
    const mgVal = VAL_MG[type] + PST_MG[type][idx];
    const egVal = VAL_EG[type] + PST_EG[type][idx];
    if (color === WHITE) { mgWhite += mgVal; egWhite += egVal; }
    else { mgBlack += mgVal; egBlack += egVal; }
    phase += PHASE_VAL[type];
    const f = fileOf(sq), r = rankOf(sq);
    if (type === PAWN) {
      if (color === WHITE) { wPawnFiles[f]++; if (r > wPawnRanks[f]) wPawnRanks[f] = r; }
      else { bPawnFiles[f]++; if (r < bPawnRanks[f]) bPawnRanks[f] = r; }
    } else if (type === BISHOP) { color === WHITE ? wBishops++ : bBishops++; }
  }

  if (wBishops >= 2) { mgWhite += 30; egWhite += 50; }
  if (bBishops >= 2) { mgBlack += 30; egBlack += 50; }

  for (let f = 0; f < 8; f++) {
    if (wPawnFiles[f] > 1) { const pen = (wPawnFiles[f]-1)*10; mgWhite -= pen; egWhite -= pen*2; }
    if (bPawnFiles[f] > 1) { const pen = (bPawnFiles[f]-1)*10; mgBlack -= pen; egBlack -= pen*2; }
    if (wPawnFiles[f] > 0) {
      const left = f > 0 ? wPawnFiles[f-1] : 0, right = f < 7 ? wPawnFiles[f+1] : 0;
      if (left === 0 && right === 0) { mgWhite -= 15; egWhite -= 20; }
    }
    if (bPawnFiles[f] > 0) {
      const left = f > 0 ? bPawnFiles[f-1] : 0, right = f < 7 ? bPawnFiles[f+1] : 0;
      if (left === 0 && right === 0) { mgBlack -= 15; egBlack -= 20; }
    }
    if (wPawnRanks[f] >= 0) {
      let passed = true;
      for (let ff = Math.max(0,f-1); ff <= Math.min(7,f+1); ff++) if (bPawnRanks[ff] <= wPawnRanks[f]) { passed = false; break; }
      if (passed) { const bonus = [0,5,10,20,35,60,100,0][wPawnRanks[f]]; mgWhite += bonus; egWhite += bonus*2; }
    }
    if (bPawnRanks[f] < 8) {
      let passed = true;
      for (let ff = Math.max(0,f-1); ff <= Math.min(7,f+1); ff++) if (wPawnRanks[ff] >= bPawnRanks[f]) { passed = false; break; }
      if (passed) { const bonus = [0,100,60,35,20,10,5,0][bPawnRanks[f]]; mgBlack += bonus; egBlack += bonus*2; }
    }
  }

  // Rook on open files
  for (let sq = 0; sq < 64; sq++) {
    const p = sqs[sq];
    if (p === EMPTY || pieceType(p) !== ROOK) continue;
    const f = fileOf(sq);
    if (pieceColor(p) === WHITE) {
      if (wPawnFiles[f] === 0 && bPawnFiles[f] === 0) { mgWhite += 20; egWhite += 15; }
      else if (wPawnFiles[f] === 0) { mgWhite += 10; egWhite += 8; }
    } else {
      if (wPawnFiles[f] === 0 && bPawnFiles[f] === 0) { mgBlack += 20; egBlack += 15; }
      else if (bPawnFiles[f] === 0) { mgBlack += 10; egBlack += 8; }
    }
  }

  // King safety
  const wk = board.kingPos[0], wkr = rankOf(wk), wkf = fileOf(wk);
  if (wkr <= 1) {
    let shield = 0;
    for (let df = -1; df <= 1; df++) {
      const sf = wkf + df;
      if (sf < 0 || sf > 7) continue;
      for (let dr = 1; dr <= 2; dr++) {
        const sr = wkr + dr;
        if (sr < 8 && sqs[sqFrom(sr, sf)] === W_PAWN) { shield += dr === 1 ? 10 : 5; break; }
      }
    }
    mgWhite += shield;
  }
  const bk = board.kingPos[1], bkr = rankOf(bk), bkf = fileOf(bk);
  if (bkr >= 6) {
    let shield = 0;
    for (let df = -1; df <= 1; df++) {
      const sf = bkf + df;
      if (sf < 0 || sf > 7) continue;
      for (let dr = 1; dr <= 2; dr++) {
        const sr = bkr - dr;
        if (sr >= 0 && sqs[sqFrom(sr, sf)] === B_PAWN) { shield += dr === 1 ? 10 : 5; break; }
      }
    }
    mgBlack += shield;
  }

  const totalPhase = 24;
  const mgPhase = Math.min(phase, totalPhase);
  const egPhase = totalPhase - mgPhase;
  let mgScore = mgWhite - mgBlack, egScore = egWhite - egBlack;
  if (board.turn === WHITE) { mgScore += 15; egScore += 5; } else { mgScore -= 15; egScore -= 5; }
  const score = Math.round((mgScore * mgPhase + egScore * egPhase) / totalPhase);
  return board.turn === WHITE ? score : -score;
}

// ═══════════════════════════════════════════════════════════
//  notation.js
// ═══════════════════════════════════════════════════════════
const TYPE_CHAR = { [KNIGHT]: 'N', [BISHOP]: 'B', [ROOK]: 'R', [QUEEN]: 'Q', [KING]: 'K' };

function moveToSAN(move, board) {
  const { from, to, piece, captured, promotion, flag } = move;
  if (flag === FLAG_CASTLE_K) return 'O-O';
  if (flag === FLAG_CASTLE_Q) return 'O-O-O';
  const type = pieceType(piece);
  let san = '';
  if (type === PAWN) {
    if (captured) san += sqName(from)[0] + 'x';
    san += sqName(to);
    if (flag === FLAG_PROMO && promotion) san += '=' + TYPE_CHAR[pieceType(promotion)];
  } else {
    san += TYPE_CHAR[type] || '';
    const allMoves = generateLegalMoves(board);
    const ambiguous = allMoves.filter(m => m.from !== from && m.to === to && pieceType(m.piece) === type && pieceColor(m.piece) === pieceColor(piece));
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some(m => fileOf(m.from) === fileOf(from));
      const sameRank = ambiguous.some(m => rankOf(m.from) === rankOf(from));
      if (!sameFile) san += sqName(from)[0];
      else if (!sameRank) san += sqName(from)[1];
      else san += sqName(from);
    }
    if (captured) san += 'x';
    san += sqName(to);
  }
  board.makeMove(move);
  if (board.inCheck()) {
    const replies = generateLegalMoves(board);
    san += replies.length === 0 ? '#' : '+';
  }
  board.unmakeMove(move);
  return san;
}

// ═══════════════════════════════════════════════════════════
//  opening.js
// ═══════════════════════════════════════════════════════════
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
addLine('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 b1c3');
addLine('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 d2d3 g8f6 c2c3');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f6e4 d2d4 b7b5 a4b3 d7d5 d4e5 f8e7');
addLine('e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4 d2d4 f8e7');
addLine('e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6');
addLine('e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5 d4b5 d7d6');
addLine('e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 g8f6 b1c3 d7d6');
addLine('e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6');
addLine('e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7');
addLine('e2e4 e7e6 d2d4 d7d5 b1c3 f8b4 e4e5 c7c5');
addLine('e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3');
addLine('e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 b8d7 g1f3 g8f6');
addLine('e2e4 c7c6 d2d4 d7d5 e4d5 c6d5 c2c4 g8f6 b1c3 e7e6');
addLine('d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 b8d7');
addLine('d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 g1f3 f8e7 c1f4 e8g8 e2e3');
addLine('d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 e7e6 e2e3 b8d7 f1d3');
addLine('d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5');
addLine('d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5');
addLine('d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 f2f3 e8g8 c1e3');
addLine('d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1c2 e8g8 a2a3 b4c3 c2c3');
addLine('d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5');
addLine('c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 f8b4');
addLine('e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 b1c3');
addLine('d2d4 d7d5 c1f4 g8f6 e2e3 e7e6 g1f3 f8d6 f4d6 c7d6');
addLine('e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3');
addLine('e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4');

function lookupBook(movesSoFar) {
  const key = movesSoFar.length === 0 ? 'start' : movesSoFar.join(' ');
  const candidates = BOOK.get(key);
  if (!candidates || candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function parseBookMove(str) {
  const fromFile = FILE_NAMES.indexOf(str[0]);
  const fromRank = +str[1] - 1;
  const toFile = FILE_NAMES.indexOf(str[2]);
  const toRank = +str[3] - 1;
  return { from: sqFrom(fromRank, fromFile), to: sqFrom(toRank, toFile), promo: str.length > 4 ? str[4] : null };
}

// ═══════════════════════════════════════════════════════════
//  search.js
// ═══════════════════════════════════════════════════════════
const INF = 30000;
const MATE_SCORE = 29000;
const TT_SIZE = 1 << 20;
const TT_MASK = TT_SIZE - 1;
const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;

const MVV_LVA = new Int32Array(15 * 7);
{
  const victimVal = [0,10,20,30,40,50,60];
  const attackerVal = [0,6,5,4,3,2,1];
  for (let v = 1; v <= 6; v++) for (let a = 1; a <= 6; a++) MVV_LVA[v*7+a] = victimVal[v]*10 + attackerVal[a];
}

class TTEntry { constructor() { this.hash=0;this.depth=0;this.score=0;this.flag=0;this.bestFrom=-1;this.bestTo=-1;this.age=0; } }

class SearchEngine {
  constructor() {
    this.tt = new Array(TT_SIZE);
    for (let i = 0; i < TT_SIZE; i++) this.tt[i] = new TTEntry();
    this.killers = [];
    this.history = new Int32Array(2 * 64 * 64);
    this.nodes = 0;
    this.maxDepth = 64;
    this.stopped = false;
    this.startTime = 0;
    this.timeLimit = 0;
    this.age = 0;
    this.lastInfo = { depth: 0, score: 0, nodes: 0, time: 0, pv: '' };
  }

  clear() { for (let i = 0; i < TT_SIZE; i++) { this.tt[i].hash = 0; this.tt[i].depth = 0; } this.history.fill(0); this.age = 0; }

  checkTime() { if (this.nodes % 4096 === 0 && performance.now() - this.startTime >= this.timeLimit) this.stopped = true; }

  ttProbe(hash, depth, alpha, beta, ply) {
    const entry = this.tt[hash & TT_MASK];
    if (entry.hash !== hash) return null;
    if (entry.depth >= depth) {
      let score = entry.score;
      if (score > MATE_SCORE - 100) score -= ply;
      if (score < -MATE_SCORE + 100) score += ply;
      if (entry.flag === TT_EXACT) return { score, bestFrom: entry.bestFrom, bestTo: entry.bestTo };
      if (entry.flag === TT_ALPHA && score <= alpha) return { score: alpha, bestFrom: entry.bestFrom, bestTo: entry.bestTo };
      if (entry.flag === TT_BETA && score >= beta) return { score: beta, bestFrom: entry.bestFrom, bestTo: entry.bestTo };
    }
    return { score: null, bestFrom: entry.bestFrom, bestTo: entry.bestTo };
  }

  ttStore(hash, depth, score, flag, bestFrom, bestTo, ply) {
    const idx = hash & TT_MASK;
    const entry = this.tt[idx];
    if (entry.hash !== hash || depth >= entry.depth || entry.age !== this.age) {
      let s = score;
      if (s > MATE_SCORE - 100) s += ply;
      if (s < -MATE_SCORE + 100) s -= ply;
      entry.hash = hash; entry.depth = depth; entry.score = s; entry.flag = flag;
      entry.bestFrom = bestFrom; entry.bestTo = bestTo; entry.age = this.age;
    }
  }

  scoreMove(move, ttFrom, ttTo, ply, board) {
    if (move.from === ttFrom && move.to === ttTo) return 10000000;
    if (move.captured) return 5000000 + MVV_LVA[pieceType(move.captured) * 7 + pieceType(move.piece)];
    if (move.flag === FLAG_PROMO) return 4500000 + VAL_MG[pieceType(move.promotion)];
    if (this.killers[ply]) {
      if (this.killers[ply][0] && this.killers[ply][0].from === move.from && this.killers[ply][0].to === move.to) return 4000000;
      if (this.killers[ply][1] && this.killers[ply][1].from === move.from && this.killers[ply][1].to === move.to) return 3900000;
    }
    const ci = board.turn === WHITE ? 0 : 64 * 64;
    return this.history[ci + move.from * 64 + move.to];
  }

  sortMoves(moves, ttFrom, ttTo, ply, board) {
    const scores = moves.map(m => this.scoreMove(m, ttFrom, ttTo, ply, board));
    const indexed = moves.map((m, i) => i);
    indexed.sort((a, b) => scores[b] - scores[a]);
    return indexed.map(i => moves[i]);
  }

  quiescence(board, alpha, beta, ply) {
    this.nodes++;
    if (this.stopped) return 0;
    this.checkTime();
    if (this.stopped) return 0;
    const standPat = evaluate(board);
    if (standPat >= beta) return beta;
    if (standPat + 1025 < alpha) return alpha;
    if (alpha < standPat) alpha = standPat;
    const captures = generateLegalCaptures(board);
    captures.sort((a, b) => MVV_LVA[pieceType(b.captured)*7+pieceType(b.piece)] - MVV_LVA[pieceType(a.captured)*7+pieceType(a.piece)]);
    for (const move of captures) {
      if (standPat + VAL_MG[pieceType(move.captured)] + 200 < alpha && move.flag !== FLAG_PROMO) continue;
      board.makeMove(move);
      const score = -this.quiescence(board, -beta, -alpha, ply + 1);
      board.unmakeMove(move);
      if (this.stopped) return 0;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  alphaBeta(board, depth, alpha, beta, ply, doNull) {
    this.nodes++;
    if (this.stopped) return 0;
    this.checkTime();
    if (this.stopped) return 0;
    if (ply > 0 && (board.isRepetition() || board.isDraw50())) return 0;
    const isInCheck = board.inCheck();
    if (isInCheck) depth++;
    if (depth <= 0) return this.quiescence(board, alpha, beta, ply);
    const isPV = beta - alpha > 1;
    let ttFrom = -1, ttTo = -1;
    const ttResult = this.ttProbe(board.hash, depth, alpha, beta, ply);
    if (ttResult) {
      ttFrom = ttResult.bestFrom; ttTo = ttResult.bestTo;
      if (ttResult.score !== null && !isPV) return ttResult.score;
    }
    if (!isPV && !isInCheck && depth <= 3) {
      const margin = 300 * depth;
      const staticEval = evaluate(board);
      if (staticEval + margin <= alpha) {
        const razorScore = this.quiescence(board, alpha, beta, ply);
        if (razorScore <= alpha) return razorScore;
      }
    }
    if (doNull && !isPV && !isInCheck && depth >= 3) {
      const staticEval = evaluate(board);
      if (staticEval >= beta) {
        const savedEp = board.epSquare, savedHash = board.hash;
        board.turn ^= 8; board.epSquare = -1; board.hash ^= 0x12345678;
        const R = depth >= 6 ? 3 : 2;
        const score = -this.alphaBeta(board, depth - 1 - R, -beta, -beta + 1, ply + 1, false);
        board.turn ^= 8; board.epSquare = savedEp; board.hash = savedHash;
        if (this.stopped) return 0;
        if (score >= beta) return beta;
      }
    }
    const moves = generateLegalMoves(board);
    if (moves.length === 0) { if (isInCheck) return -MATE_SCORE + ply; return 0; }
    const sorted = this.sortMoves(moves, ttFrom, ttTo, ply, board);
    let bestScore = -INF, bestFrom = sorted[0].from, bestTo = sorted[0].to, flag = TT_ALPHA;
    let canFutile = false, futilityMargin = 0;
    if (!isPV && !isInCheck && depth <= 3) {
      const staticEval = evaluate(board);
      futilityMargin = staticEval + 150 * depth;
      canFutile = futilityMargin <= alpha;
    }
    for (let i = 0; i < sorted.length; i++) {
      const move = sorted[i];
      if (canFutile && i > 0 && !move.captured && move.flag !== FLAG_PROMO) continue;
      board.makeMove(move);
      let score;
      if (i === 0) {
        score = -this.alphaBeta(board, depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        let reduction = 0;
        if (depth >= 3 && i >= 3 && !isInCheck && !move.captured && move.flag !== FLAG_PROMO) {
          reduction = 1;
          if (i >= 6) reduction = 2;
          if (depth >= 6 && i >= 10) reduction = 3;
          reduction = Math.min(reduction, depth - 2);
        }
        score = -this.alphaBeta(board, depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, true);
        if (reduction > 0 && score > alpha) score = -this.alphaBeta(board, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && score < beta) score = -this.alphaBeta(board, depth - 1, -beta, -alpha, ply + 1, true);
      }
      board.unmakeMove(move);
      if (this.stopped) return 0;
      if (score > bestScore) {
        bestScore = score; bestFrom = move.from; bestTo = move.to;
        if (score > alpha) {
          alpha = score; flag = TT_EXACT;
          if (score >= beta) {
            flag = TT_BETA;
            if (!move.captured) {
              if (!this.killers[ply]) this.killers[ply] = [null, null];
              if (!this.killers[ply][0] || this.killers[ply][0].from !== move.from || this.killers[ply][0].to !== move.to) {
                this.killers[ply][1] = this.killers[ply][0];
                this.killers[ply][0] = { from: move.from, to: move.to };
              }
              const ci = board.turn === BLACK ? 0 : 64 * 64;
              this.history[ci + move.from * 64 + move.to] += depth * depth;
            }
            break;
          }
        }
      }
    }
    this.ttStore(board.hash, depth, bestScore, flag, bestFrom, bestTo, ply);
    return bestScore;
  }

  search(board, maxDepth, timeLimitMs) {
    this.stopped = false; this.nodes = 0; this.startTime = performance.now(); this.timeLimit = timeLimitMs; this.age++;
    this.killers = [];
    for (let i = 0; i < 64; i++) this.killers[i] = [null, null];
    for (let i = 0; i < this.history.length; i++) this.history[i] = Math.floor(this.history[i] / 2);
    let bestMove = null, bestScore = 0;
    const rootMoves = generateLegalMoves(board);
    if (rootMoves.length === 0) return null;
    if (rootMoves.length === 1) return rootMoves[0];
    bestMove = rootMoves[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      let alpha = -INF, beta = INF;
      if (depth >= 4) { alpha = bestScore - 50; beta = bestScore + 50; }
      let score = this.alphaBeta(board, depth, alpha, beta, 0, true);
      if (!this.stopped && (score <= alpha || score >= beta)) {
        alpha = -INF; beta = INF;
        score = this.alphaBeta(board, depth, alpha, beta, 0, true);
      }
      if (this.stopped) break;
      bestScore = score;
      const ttEntry = this.tt[board.hash & TT_MASK];
      if (ttEntry.hash === board.hash && ttEntry.bestFrom >= 0) {
        for (const m of rootMoves) { if (m.from === ttEntry.bestFrom && m.to === ttEntry.bestTo) { bestMove = m; break; } }
      }
      const elapsed = performance.now() - this.startTime;
      this.lastInfo = { depth, score: bestScore, nodes: this.nodes, time: Math.round(elapsed), nps: elapsed > 0 ? Math.round(this.nodes / elapsed * 1000) : 0 };
      if (Math.abs(bestScore) >= MATE_SCORE - 100) break;
      if (elapsed > timeLimitMs * 0.5) break;
    }
    return bestMove;
  }
}

// ═══════════════════════════════════════════════════════════
//  engine.js
// ═══════════════════════════════════════════════════════════
class Engine {
  constructor() { this.search = new SearchEngine(); this.movesPlayed = []; this.thinkTime = 3000; }
  reset() { this.search.clear(); this.movesPlayed = []; }
  recordMove(from, to) { this.movesPlayed.push(sqName(from) + sqName(to)); }
  setThinkTime(ms) { this.thinkTime = Math.max(500, ms); }
  getBestMove(board) {
    const bookMoveStr = lookupBook(this.movesPlayed);
    if (bookMoveStr) {
      const { from, to, promo } = parseBookMove(bookMoveStr);
      const legalMoves = generateLegalMoves(board);
      for (const m of legalMoves) {
        if (m.from === from && m.to === to) {
          if (m.promotion && promo) { if (promo === 'q' && pieceType(m.promotion) === QUEEN) return m; continue; }
          return m;
        }
      }
    }
    return this.search.search(board, 64, this.thinkTime);
  }
  getInfo() { return this.search.lastInfo; }
}

// ═══════════════════════════════════════════════════════════
//  game.js
// ═══════════════════════════════════════════════════════════
const MODE_PVP = 'pvp', MODE_PVE = 'pve';
const STATUS_PLAYING = 'playing', STATUS_CHECKMATE = 'checkmate', STATUS_STALEMATE = 'stalemate';
const STATUS_DRAW_50 = 'draw50', STATUS_DRAW_REP = 'repetition', STATUS_DRAW_MAT = 'insufficient', STATUS_RESIGN = 'resign';

class Game {
  constructor() {
    this.board = new Board();
    this.engine = new Engine();
    this.mode = MODE_PVP;
    this.playerColor = WHITE;
    this.status = STATUS_PLAYING;
    this.winner = null;
    this.moveList = [];
    this.selected = -1;
    this.legalMoves = [];
    this.lastMove = null;
    this.listeners = [];
    this.isThinking = false;
    this.capturedWhite = [];
    this.capturedBlack = [];
    this._pendingPromotion = null;
  }
  onChange(fn) { this.listeners.push(fn); }
  _emit() { for (const fn of this.listeners) fn(); }
  newGame(mode, playerColor = WHITE) {
    this.board.reset(); this.engine.reset();
    this.mode = mode; this.playerColor = playerColor;
    this.status = STATUS_PLAYING; this.winner = null;
    this.moveList = []; this.selected = -1; this.legalMoves = [];
    this.lastMove = null; this.isThinking = false;
    this.capturedWhite = []; this.capturedBlack = [];
    this._pendingPromotion = null;
    this._emit();
    if (this.mode === MODE_PVE && this.playerColor === BLACK) this._scheduleAI();
  }
  isPlayerTurn() { if (this.mode === MODE_PVP) return true; return this.board.turn === this.playerColor; }
  clickSquare(sq) {
    if (this.status !== STATUS_PLAYING || this.isThinking || !this.isPlayerTurn()) return;
    const piece = this.board.squares[sq];
    if (this.selected >= 0) {
      if (sq === this.selected) { this.selected = -1; this.legalMoves = []; this._emit(); return; }
      const move = this.legalMoves.find(m => m.to === sq);
      if (move) {
        if (move.flag === FLAG_PROMO) {
          this._pendingPromotion = { sq, moves: this.legalMoves.filter(m => m.to === sq) };
          this._emit(); return;
        }
        this._executeMove(move); return;
      }
      if (piece !== EMPTY && pieceColor(piece) === this.board.turn) { this._selectSquare(sq); return; }
      this.selected = -1; this.legalMoves = []; this._emit(); return;
    }
    if (piece !== EMPTY && pieceColor(piece) === this.board.turn) this._selectSquare(sq);
  }
  _selectSquare(sq) {
    this.selected = sq;
    const allLegal = generateLegalMoves(this.board);
    this.legalMoves = allLegal.filter(m => m.from === sq);
    this._emit();
  }
  promoteWith(pieceTypeChoice) {
    if (!this._pendingPromotion) return;
    const { moves } = this._pendingPromotion;
    const move = moves.find(m => pieceType(m.promotion) === pieceTypeChoice);
    this._pendingPromotion = null;
    if (move) this._executeMove(move);
  }
  get pendingPromotion() { return this._pendingPromotion || null; }
  _executeMove(move) {
    const san = moveToSAN(move, this.board);
    if (move.captured) {
      if (pieceColor(move.captured) === WHITE) this.capturedWhite.push(move.captured);
      else this.capturedBlack.push(move.captured);
    }
    this.engine.recordMove(move.from, move.to);
    this.board.makeMove(move);
    this.moveList.push({ san, from: move.from, to: move.to, piece: move.piece, captured: move.captured, isWhite: pieceColor(move.piece) === WHITE });
    this.lastMove = { from: move.from, to: move.to };
    this.selected = -1; this.legalMoves = [];
    this._checkGameOver();
    this._emit();
    if (this.status === STATUS_PLAYING && this.mode === MODE_PVE && !this.isPlayerTurn()) this._scheduleAI();
  }
  _checkGameOver() {
    if (!hasLegalMove(this.board)) {
      if (this.board.inCheck()) { this.status = STATUS_CHECKMATE; this.winner = this.board.turn === WHITE ? BLACK : WHITE; }
      else this.status = STATUS_STALEMATE;
      return;
    }
    if (this.board.isDraw50()) { this.status = STATUS_DRAW_50; return; }
    if (this.board.isRepetition()) { this.status = STATUS_DRAW_REP; return; }
    if (this.board.isInsufficientMaterial()) { this.status = STATUS_DRAW_MAT; return; }
  }
  _scheduleAI() {
    this.isThinking = true; this._emit();
    setTimeout(() => {
      const move = this.engine.getBestMove(this.board);
      this.isThinking = false;
      if (move) this._executeMove(move);
    }, 100);
  }
  resign() {
    if (this.status !== STATUS_PLAYING) return;
    this.status = STATUS_RESIGN;
    if (this.mode === MODE_PVE) this.winner = this.playerColor === WHITE ? BLACK : WHITE;
    else this.winner = this.board.turn === WHITE ? BLACK : WHITE;
    this._emit();
  }
  getStatusText() {
    switch (this.status) {
      case STATUS_PLAYING:
        if (this.isThinking) return '🤖 AI đang suy nghĩ...';
        if (this.board.inCheck()) return this.board.turn === WHITE ? '⚡ Trắng bị chiếu!' : '⚡ Đen bị chiếu!';
        return this.board.turn === WHITE ? '⬜ Lượt Trắng' : '⬛ Lượt Đen';
      case STATUS_CHECKMATE: return this.winner === WHITE ? '🏆 Trắng thắng — Chiếu hết!' : '🏆 Đen thắng — Chiếu hết!';
      case STATUS_STALEMATE: return '🤝 Hòa — Hết nước đi!';
      case STATUS_DRAW_50: return '🤝 Hòa — Luật 50 nước!';
      case STATUS_DRAW_REP: return '🤝 Hòa — Lặp thế 3 lần!';
      case STATUS_DRAW_MAT: return '🤝 Hòa — Thiếu quân!';
      case STATUS_RESIGN: return this.winner === WHITE ? '🏆 Trắng thắng — Đối thủ đầu hàng!' : '🏆 Đen thắng — Đối thủ đầu hàng!';
      default: return '';
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  renderer.js
// ═══════════════════════════════════════════════════════════
const SVG_PIECES = {
  1: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  2: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/><path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000"/></g></svg>`,
  3: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-12.5-4" stroke-linejoin="miter"/></g></svg>`,
  4: `<svg viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M15 17v7h15v-7" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt"/><path d="M14 29.5L11 36h23l-3-6.5H14z" stroke-linecap="butt"/></g></svg>`,
  5: `<svg viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1 4 0 2 2 0 1 1-4 0z" transform="translate(15.5 -1.5)"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g></svg>`,
  6: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>`,
  9: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  10: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#333"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#333"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#ececec"/><path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#ececec"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#ececec" stroke="none"/></g></svg>`,
  11: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#333" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-12.5-4" stroke="#ececec" stroke-linejoin="miter"/></g></svg>`,
  12: `<svg viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3z" fill="#333" stroke-linecap="butt"/><path d="M12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" fill="#333" stroke-linecap="butt"/><path d="M14 29.5v-13h17v13H14z" fill="#333" stroke-linecap="butt"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" fill="#333" stroke-linecap="butt"/><path d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23" fill="none" stroke="#ececec" stroke-width="1" stroke-linejoin="miter"/></g></svg>`,
  13: `<svg viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#333"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" fill="#333" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="#333" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#ececec"/></g></svg>`,
  14: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#333" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#333"/><path d="M20 8h5" stroke-linejoin="miter"/><path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9" fill="none" stroke="#ececec"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="none" stroke="#ececec"/></g></svg>`,
};

class Renderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.boardEl   = null;
    this.squareEls = [];
    this.flipped   = false;
    this._dragState = null;
    this._init();
  }

  _init() {
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'chess-board';
    this.boardEl.id = 'chess-board';

    for (let visualRow = 0; visualRow < 8; visualRow++) {
      for (let visualCol = 0; visualCol < 8; visualCol++) {
        const sq = document.createElement('div');
        sq.className = 'square';
        sq.dataset.vrow = visualRow;
        sq.dataset.vcol = visualCol;
        this.squareEls.push(sq);
        this.boardEl.appendChild(sq);
      }
    }

    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'board-wrapper';
    boardWrapper.appendChild(this.boardEl);

    this.container.appendChild(boardWrapper);
  }

  visualToSq(vrow, vcol) {
    const rank = this.flipped ? vrow : 7 - vrow;
    const file = this.flipped ? 7 - vcol : vcol;
    return sqFrom(rank, file);
  }

  sqToVisual(sq) {
    const rank = rankOf(sq);
    const file = fileOf(sq);
    const vrow = this.flipped ? rank : 7 - rank;
    const vcol = this.flipped ? 7 - file : file;
    return { vrow, vcol };
  }

  setFlipped(flipped) {
    this.flipped = flipped;
  }

  render(game) {
    const board     = game.board;
    const selected  = game.selected;
    const legalDests = new Set(game.legalMoves.map(m => m.to));
    const lastMove  = game.lastMove;

    for (let vi = 0; vi < 64; vi++) {
      const vrow = Math.floor(vi / 8);
      const vcol = vi % 8;
      const sq   = this.visualToSq(vrow, vcol);
      const el   = this.squareEls[vi];
      const p    = board.squares[sq];

      const isLight = (rankOf(sq) + fileOf(sq)) % 2 === 1;

      let cls = 'square ' + (isLight ? 'light' : 'dark');
      if (sq === selected) cls += ' selected';
      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) cls += ' last-move';
      if (board.inCheck() && p !== EMPTY && pieceType(p) === KING && pieceColor(p) === board.turn) {
        cls += ' in-check';
      }
      el.className = cls;

      if (p !== EMPTY && SVG_PIECES[p]) {
        el.innerHTML = `<div class="piece" data-piece="${p}">${SVG_PIECES[p]}</div>`;
      } else {
        el.innerHTML = '';
      }

      if (vcol === 0) {
        const rankLbl = document.createElement('div');
        rankLbl.className = 'sq-label rank-label';
        rankLbl.textContent = RANK_NAMES[rankOf(sq)];
        el.appendChild(rankLbl);
      }
      if (vrow === 7) {
        const fileLbl = document.createElement('div');
        fileLbl.className = 'sq-label file-label';
        fileLbl.textContent = FILE_NAMES[fileOf(sq)];
        el.appendChild(fileLbl);
      }

      if (legalDests.has(sq)) {
        const dot = document.createElement('div');
        dot.className = board.squares[sq] !== EMPTY ? 'capture-ring' : 'move-dot';
        el.appendChild(dot);
      }

      el.dataset.sq = sq;
    }
  }

  renderCaptured(whiteCap, blackCap, whiteAdv, blackAdv, topId, bottomId) {
    const topEl = document.getElementById(topId);
    const bottomEl = document.getElementById(bottomId);
    if (!topEl || !bottomEl) return;

    const isBottomWhite = !this.flipped;
    
    const renderGroup = (pieces, adv) => {
      let html = '';
      for (const p of pieces) {
        html += `<span class="captured-piece">${PIECE_UNICODE[p] || ''}</span>`;
      }
      if (adv > 0) html += `<span class="material-advantage">+${adv}</span>`;
      return html;
    };

    if (isBottomWhite) {
      topEl.innerHTML = renderGroup(blackCap, blackAdv);
      bottomEl.innerHTML = renderGroup(whiteCap, whiteAdv);
    } else {
      topEl.innerHTML = renderGroup(whiteCap, whiteAdv);
      bottomEl.innerHTML = renderGroup(blackCap, blackAdv);
    }
  }

  renderMoveList(moveList, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;

    let html = '';
    for (let i = 0; i < moveList.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      const white = moveList[i] ? moveList[i].san : '';
      const black = moveList[i + 1] ? moveList[i + 1].san : '';
      const isLatest = (i === moveList.length - 1 || i === moveList.length - 2);
      html += `<div class="move-row ${isLatest ? 'latest' : ''}">
        <span class="move-num">${num}.</span>
        <span class="move-white ${i === moveList.length - 1 || i === moveList.length - 2 ? 'highlight' : ''}">${white}</span>
        <span class="move-black ${i + 1 === moveList.length - 1 ? 'highlight' : ''}">${black}</span>
      </div>`;
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }
}

// ═══════════════════════════════════════════════════════════
//  ui.js
// ═══════════════════════════════════════════════════════════
class UI {
  constructor() {
    this.game     = new Game();
    this.renderer = new Renderer('board-container');
    this._bindEvents();
    this._showMenu();

    this.game.onChange(() => this._onGameUpdate());
  }

  _bindEvents() {
    this.renderer.boardEl.addEventListener('click', (e) => {
      const squareEl = e.target.closest('.square');
      if (!squareEl) return;
      const sq = parseInt(squareEl.dataset.sq);
      if (isNaN(sq)) return;
      this.game.clickSquare(sq);
    });

    this.renderer.boardEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const squareEl = e.target.closest('.square');
      if (!squareEl) return;
      const sq = parseInt(squareEl.dataset.sq);
      if (isNaN(sq)) return;
      
      const piece = this.game.board.squares[sq];
      if (piece === 0) return;
      if (this.game.status !== STATUS_PLAYING) return;
      if (this.game.isThinking) return;
      if (!this.game.isPlayerTurn()) return;
      if (pieceColor(piece) !== this.game.board.turn) return;

      this.game.clickSquare(sq);
      
      const pieceEl = squareEl.querySelector('.piece');
      if (!pieceEl) return;
      
      const boardRect = this.renderer.boardEl.getBoundingClientRect();
      const sqSize = boardRect.width / 8;
      
      const ghost = pieceEl.cloneNode(true);
      ghost.className = 'piece dragging-piece';
      ghost.style.cssText = `
        position: fixed;
        width: ${sqSize * 0.85}px;
        height: ${sqSize * 0.85}px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.9;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
        transform: scale(1.15);
        transition: none;
      `;
      ghost.style.left = (e.clientX - sqSize * 0.425) + 'px';
      ghost.style.top = (e.clientY - sqSize * 0.425) + 'px';
      document.body.appendChild(ghost);
      
      pieceEl.style.opacity = '0.3';
      
      this._dragState = {
        sq,
        ghost,
        pieceEl,
        sqSize,
        boardRect,
      };
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._dragState) return;
      const { ghost, sqSize } = this._dragState;
      ghost.style.left = (e.clientX - sqSize * 0.425) + 'px';
      ghost.style.top = (e.clientY - sqSize * 0.425) + 'px';
    });

    document.addEventListener('mouseup', (e) => {
      if (!this._dragState) return;
      const { ghost, pieceEl, boardRect, sqSize, sq: fromSq } = this._dragState;
      
      ghost.remove();
      if (pieceEl) pieceEl.style.opacity = '';
      
      const col = Math.floor((e.clientX - boardRect.left) / sqSize);
      const row = Math.floor((e.clientY - boardRect.top) / sqSize);
      
      this._dragState = null;
      
      if (col >= 0 && col < 8 && row >= 0 && row < 8) {
        const dropSq = this.renderer.visualToSq(row, col);
        if (dropSq !== fromSq) {
          this.game.clickSquare(dropSq);
        }
      }
    });

    this.renderer.boardEl.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const squareEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.square');
      if (!squareEl) return;
      const sq = parseInt(squareEl.dataset.sq);
      if (isNaN(sq)) return;
      this.game.clickSquare(sq);
    }, { passive: true });

    document.getElementById('btn-new-game').addEventListener('click', () => this._showMenu());

    document.getElementById('btn-resign').addEventListener('click', () => {
      if (this.game.status === STATUS_PLAYING) {
        if (this.game.moveList.length > 0) {
          this.game.resign();
        }
      }
    });

    document.getElementById('btn-flip').addEventListener('click', () => {
      this.renderer.setFlipped(!this.renderer.flipped);
      this._onGameUpdate();
    });

    document.getElementById('menu-pvp').addEventListener('click', () => {
      this._hideMenu();
      this.renderer.setFlipped(false);
      this.game.newGame(MODE_PVP);
    });
    document.getElementById('menu-pve-white').addEventListener('click', () => {
      this._hideMenu();
      this.renderer.setFlipped(false);
      this.game.newGame(MODE_PVE, WHITE);
    });
    document.getElementById('menu-pve-black').addEventListener('click', () => {
      this._hideMenu();
      this.renderer.setFlipped(true);
      this.game.newGame(MODE_PVE, BLACK);
    });

    const slider = document.getElementById('ai-time');
    const sliderLabel = document.getElementById('ai-time-label');
    if (slider) {
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        sliderLabel.textContent = val < 1000 ? `${val}ms` : `${(val / 1000).toFixed(1)}s`;
        this.game.engine.setThinkTime(val);
      });
    }

    document.querySelectorAll('.promo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = parseInt(btn.dataset.type);
        this._hidePromotion();
        this.game.promoteWith(type);
      });
    });

    document.getElementById('menu-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        if (this.game.moveList.length > 0) {
          this._hideMenu();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hidePromotion();
      }
      if (e.key === 'f' || e.key === 'F') {
        this.renderer.setFlipped(!this.renderer.flipped);
        this._onGameUpdate();
      }
      if (e.key === 'n' || e.key === 'N') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._showMenu();
        }
      }
    });
  }

  _onGameUpdate() {
    this.renderer.render(this.game);

    const sortPieces = (arr) => {
      const order = { 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 };
      return [...arr].sort((a, b) => (order[pieceType(a)] || 9) - (order[pieceType(b)] || 9));
    };

    const whiteCap = sortPieces(this.game.capturedBlack);
    const blackCap = sortPieces(this.game.capturedWhite);

    const valMap = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9 };
    let whiteMatVal = 0, blackMatVal = 0;
    for (const p of this.game.capturedBlack) whiteMatVal += valMap[pieceType(p)] || 0;
    for (const p of this.game.capturedWhite) blackMatVal += valMap[pieceType(p)] || 0;
    const whiteAdv = whiteMatVal - blackMatVal;
    const blackAdv = blackMatVal - whiteMatVal;

    this.renderer.renderCaptured(
      whiteCap,
      blackCap,
      whiteAdv,
      blackAdv,
      'opponent-captured',
      'player-captured'
    );

    this.renderer.renderMoveList(this.game.moveList, 'move-list');

    const statusEl = document.getElementById('status-text');
    statusEl.textContent = this.game.getStatusText();

    const isWhiteTurn = this.game.board.turn === WHITE;
    
    const pStatus = document.getElementById('player-status');
    const oStatus = document.getElementById('opponent-status');
    const isPlayerWhite = this.game.playerColor === WHITE;
    const isPlayerTurn = this.game.isPlayerTurn();
    
    if (this.game.status === STATUS_PLAYING) {
      if (isPlayerTurn) {
        pStatus.textContent = "Lượt của bạn";
        oStatus.textContent = "Đang chờ...";
        pStatus.style.color = "var(--accent-bright)";
        oStatus.style.color = "var(--text-muted)";
      } else {
        pStatus.textContent = "Đang chờ...";
        oStatus.textContent = "Đang suy nghĩ...";
        pStatus.style.color = "var(--text-muted)";
        oStatus.style.color = "var(--gold)";
      }
    } else {
      pStatus.textContent = "";
      oStatus.textContent = "";
    }

    if (this.game.status === 'checkmate' || this.game.status === 'resign') {
      statusEl.classList.add('status-win');
      statusEl.classList.remove('status-draw');
    } else if (this.game.status.startsWith('draw') || this.game.status === 'stalemate' || this.game.status === 'insufficient' || this.game.status === 'repetition') {
      statusEl.classList.add('status-draw');
      statusEl.classList.remove('status-win');
    } else {
      statusEl.classList.remove('status-win', 'status-draw');
    }

    const thinkingEl = document.getElementById('thinking-indicator');
    const oppThinking = document.getElementById('opponent-thinking');
    const pThinking = document.getElementById('player-thinking');
    
    thinkingEl.style.display = this.game.isThinking ? 'flex' : 'none';
    
    if (this.game.isThinking) {
       oppThinking.style.display = 'block';
       pThinking.style.display = 'none';
    } else {
       oppThinking.style.display = 'none';
       pThinking.style.display = 'none';
    }

    if (this.game.isThinking || this.game.mode === MODE_PVE) {
      const info = this.game.engine.getInfo();
      const infoEl = document.getElementById('engine-info');
      if (info.depth > 0) {
        let scoreText = '';
        if (Math.abs(info.score) >= 29000) {
          const mateMoves = Math.ceil((29000 - Math.abs(info.score)) / 2);
          scoreText = info.score > 0 ? `M${mateMoves}` : `-M${mateMoves}`;
        } else {
          scoreText = (info.score / 100).toFixed(2);
        }
        infoEl.innerHTML = `
          <span class="info-item">🔍 ${info.depth}</span>
          <span class="info-item">${info.score >= 0 ? '📈' : '📉'} ${scoreText}</span>
          <span class="info-item">🌿 ${(info.nodes / 1000).toFixed(0)}k</span>
          <span class="info-item">⚡ ${info.nps ? (info.nps / 1000).toFixed(0) + 'k n/s' : ''}</span>
        `;
      }
    }

    if (this.game.pendingPromotion) {
      this._showPromotion();
    }

    if (this.game.status !== STATUS_PLAYING && !this.game.isThinking) {
      this._showGameOver();
    }
  }

  _showMenu() {
    document.getElementById('menu-overlay').classList.add('active');
  }
  _hideMenu() {
    document.getElementById('menu-overlay').classList.remove('active');
  }

  _showPromotion() {
    document.getElementById('promotion-modal').classList.add('active');
  }
  _hidePromotion() {
    document.getElementById('promotion-modal').classList.remove('active');
  }

  _showGameOver() {
    const el = document.getElementById('game-over-modal');
    const textEl = document.getElementById('game-over-text');
    textEl.textContent = this.game.getStatusText();
    
    const statsEl = document.getElementById('game-over-stats');
    if (statsEl) {
      const info = this.game.engine.getInfo();
      const totalMoves = this.game.moveList.length;
      statsEl.innerHTML = `
        <div class="game-stats">
          <span>📋 ${totalMoves} nước đi</span>
          ${info.depth > 0 ? `<span>🔍 Độ sâu tối đa: ${info.depth}</span>` : ''}
        </div>
      `;
    }
    
    el.classList.add('active');

    document.getElementById('game-over-new').onclick = () => {
      el.classList.remove('active');
      this._showMenu();
    };
    document.getElementById('game-over-close').onclick = () => {
      el.classList.remove('active');
    };
  }
}

// ═══════════════════════════════════════════════════════════
//  main.js
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => { window.chessApp = new UI(); });

})();
