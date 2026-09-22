/* ============================================================
 *  evaluation.js — Static position evaluation (centipawns)
 * ============================================================
 *  Uses PeSTO-style tapered evaluation that interpolates between
 *  middle-game and end-game piece-square tables based on material.
 *  Enhanced with: mobility, king safety, pawn structure, space,
 *  bishop pair, rook on 7th, connected rooks, threats.
 * ============================================================ */

import {
  EMPTY, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  WHITE, BLACK,
  W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
  B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
  pieceType, pieceColor,
  rankOf, fileOf, sqFrom, mirrorSq,
  VAL_MG, VAL_EG, PHASE_VAL,
  PST_MG, PST_EG,
  BISHOP_DIRS, ROOK_DIRS, KNIGHT_DELTAS, KING_DELTAS,
  isOnBoard,
} from './constants.js';

/* ── Mobility weights (centipawns per legal square) ──────── */
const MOB_MG = [0, 0, 4, 5, 2, 1, 0];   // P N B R Q K
const MOB_EG = [0, 0, 4, 5, 4, 2, 0];

/* ── King attack weights ─────────────────────────────────── */
const KING_ATK_WEIGHT = [0, 0, 2, 2, 3, 5, 0]; // piece type → weight for attacking king zone

/* ────────────────────────────────────────────────────────────
 *  evaluate(board) → score from WHITE's perspective
 * ──────────────────────────────────────────────────────────── */
export function evaluate(board) {
  const sqs = board.squares;

  let mgWhite = 0, mgBlack = 0;
  let egWhite = 0, egBlack = 0;
  let phase = 0;

  // Piece counters
  let wBishops = 0, bBishops = 0;
  let wKnights = 0, bKnights = 0;
  let wRooks = 0, bRooks = 0;
  let wQueens = 0, bQueens = 0;
  let wPawns = 0, bPawns = 0;

  // Pawn file occupancy
  const wPawnFiles = new Uint8Array(8);
  const bPawnFiles = new Uint8Array(8);
  const wPawnRanks = new Int8Array(8).fill(-1);   // highest rank per file for white
  const bPawnRanks = new Int8Array(8).fill(8);    // lowest rank per file for black

  // King zones for safety eval
  const wk = board.kingPos[0];
  const bk = board.kingPos[1];
  const wkr = rankOf(wk), wkf = fileOf(wk);
  const bkr = rankOf(bk), bkf = fileOf(bk);
  let wKingAttackers = 0, wKingAttackVal = 0;
  let bKingAttackers = 0, bKingAttackVal = 0;

  // Mobility
  let wMobMG = 0, wMobEG = 0;
  let bMobMG = 0, bMobEG = 0;

  // First pass: material + PST + count pieces
  for (let sq = 0; sq < 64; sq++) {
    const p = sqs[sq];
    if (p === EMPTY) continue;
    const type  = pieceType(p);
    const color = pieceColor(p);
    const idx   = color === WHITE ? sq : mirrorSq(sq);

    const mgVal = VAL_MG[type] + PST_MG[type][idx];
    const egVal = VAL_EG[type] + PST_EG[type][idx];

    if (color === WHITE) {
      mgWhite += mgVal;
      egWhite += egVal;
    } else {
      mgBlack += mgVal;
      egBlack += egVal;
    }

    phase += PHASE_VAL[type];

    const f = fileOf(sq), r = rankOf(sq);
    if (type === PAWN) {
      if (color === WHITE) {
        wPawns++;
        wPawnFiles[f]++;
        if (r > wPawnRanks[f]) wPawnRanks[f] = r;
      } else {
        bPawns++;
        bPawnFiles[f]++;
        if (r < bPawnRanks[f]) bPawnRanks[f] = r;
      }
    } else if (type === KNIGHT) {
      color === WHITE ? wKnights++ : bKnights++;
    } else if (type === BISHOP) {
      color === WHITE ? wBishops++ : bBishops++;
    } else if (type === ROOK) {
      color === WHITE ? wRooks++ : bRooks++;
    } else if (type === QUEEN) {
      color === WHITE ? wQueens++ : bQueens++;
    }

    // ── Mobility + King attacks for non-pawn pieces ───────
    if (type === KNIGHT) {
      let mob = 0;
      for (const [dr, df] of KNIGHT_DELTAS) {
        const nr = r + dr, nf = f + df;
        if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
        const tp = sqs[sqFrom(nr, nf)];
        if (tp !== EMPTY && pieceColor(tp) === color) continue;
        // Don't count squares controlled by enemy pawns
        if (color === WHITE) {
          if (nr > 0 && ((nf > 0 && sqs[sqFrom(nr - 1, nf - 1)] === B_PAWN) ||
                         (nf < 7 && sqs[sqFrom(nr - 1, nf + 1)] === B_PAWN))) continue;
        } else {
          if (nr < 7 && ((nf > 0 && sqs[sqFrom(nr + 1, nf - 1)] === W_PAWN) ||
                         (nf < 7 && sqs[sqFrom(nr + 1, nf + 1)] === W_PAWN))) continue;
        }
        mob++;
        // King attack zone (within 2 squares of enemy king)
        if (color === WHITE && Math.abs(nr - bkr) <= 2 && Math.abs(nf - bkf) <= 2) {
          bKingAttackers++;
          bKingAttackVal += KING_ATK_WEIGHT[KNIGHT];
        } else if (color === BLACK && Math.abs(nr - wkr) <= 2 && Math.abs(nf - wkf) <= 2) {
          wKingAttackers++;
          wKingAttackVal += KING_ATK_WEIGHT[KNIGHT];
        }
      }
      if (color === WHITE) { wMobMG += mob * MOB_MG[KNIGHT]; wMobEG += mob * MOB_EG[KNIGHT]; }
      else { bMobMG += mob * MOB_MG[KNIGHT]; bMobEG += mob * MOB_EG[KNIGHT]; }
    }

    if (type === BISHOP) {
      let mob = 0;
      for (const [dr, df] of BISHOP_DIRS) {
        let nr = r + dr, nf = f + df;
        while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
          const tp = sqs[sqFrom(nr, nf)];
          if (tp !== EMPTY && pieceColor(tp) === color) break;
          mob++;
          if (color === WHITE && Math.abs(nr - bkr) <= 2 && Math.abs(nf - bkf) <= 2) {
            bKingAttackVal += KING_ATK_WEIGHT[BISHOP];
          } else if (color === BLACK && Math.abs(nr - wkr) <= 2 && Math.abs(nf - wkf) <= 2) {
            wKingAttackVal += KING_ATK_WEIGHT[BISHOP];
          }
          if (tp !== EMPTY) break;
          nr += dr; nf += df;
        }
      }
      if (color === WHITE) { wMobMG += mob * MOB_MG[BISHOP]; wMobEG += mob * MOB_EG[BISHOP]; }
      else { bMobMG += mob * MOB_MG[BISHOP]; bMobEG += mob * MOB_EG[BISHOP]; }
    }

    if (type === ROOK) {
      let mob = 0;
      for (const [dr, df] of ROOK_DIRS) {
        let nr = r + dr, nf = f + df;
        while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
          const tp = sqs[sqFrom(nr, nf)];
          if (tp !== EMPTY && pieceColor(tp) === color) break;
          mob++;
          if (color === WHITE && Math.abs(nr - bkr) <= 2 && Math.abs(nf - bkf) <= 2) {
            bKingAttackVal += KING_ATK_WEIGHT[ROOK];
          } else if (color === BLACK && Math.abs(nr - wkr) <= 2 && Math.abs(nf - wkf) <= 2) {
            wKingAttackVal += KING_ATK_WEIGHT[ROOK];
          }
          if (tp !== EMPTY) break;
          nr += dr; nf += df;
        }
      }
      if (color === WHITE) { wMobMG += mob * MOB_MG[ROOK]; wMobEG += mob * MOB_EG[ROOK]; }
      else { bMobMG += mob * MOB_MG[ROOK]; bMobEG += mob * MOB_EG[ROOK]; }
    }

    if (type === QUEEN) {
      let mob = 0;
      const qDirs = [...BISHOP_DIRS, ...ROOK_DIRS];
      for (const [dr, df] of qDirs) {
        let nr = r + dr, nf = f + df;
        while (nr >= 0 && nr < 8 && nf >= 0 && nf < 8) {
          const tp = sqs[sqFrom(nr, nf)];
          if (tp !== EMPTY && pieceColor(tp) === color) break;
          mob++;
          if (color === WHITE && Math.abs(nr - bkr) <= 2 && Math.abs(nf - bkf) <= 2) {
            bKingAttackers++;
            bKingAttackVal += KING_ATK_WEIGHT[QUEEN];
          } else if (color === BLACK && Math.abs(nr - wkr) <= 2 && Math.abs(nf - wkf) <= 2) {
            wKingAttackers++;
            wKingAttackVal += KING_ATK_WEIGHT[QUEEN];
          }
          if (tp !== EMPTY) break;
          nr += dr; nf += df;
        }
      }
      if (color === WHITE) { wMobMG += mob * MOB_MG[QUEEN]; wMobEG += mob * MOB_EG[QUEEN]; }
      else { bMobMG += mob * MOB_MG[QUEEN]; bMobEG += mob * MOB_EG[QUEEN]; }
    }
  }

  // Apply mobility
  mgWhite += wMobMG; egWhite += wMobEG;
  mgBlack += bMobMG; egBlack += bMobEG;

  // ── Bishop pair bonus ─────────────────────────────────────
  if (wBishops >= 2) { mgWhite += 30; egWhite += 55; }
  if (bBishops >= 2) { mgBlack += 30; egBlack += 55; }

  // ── Knight bonus with many pawns ──────────────────────────
  if (wKnights > 0) { mgWhite += wPawns; egWhite += wPawns; }
  if (bKnights > 0) { mgBlack += bPawns; egBlack += bPawns; }

  // ── Rook bonus with few pawns ─────────────────────────────
  if (wRooks > 0) { mgWhite += (8 - wPawns) * 2; egWhite += (8 - wPawns) * 3; }
  if (bRooks > 0) { mgBlack += (8 - bPawns) * 2; egBlack += (8 - bPawns) * 3; }

  // ── Pawn structure ────────────────────────────────────────
  for (let f = 0; f < 8; f++) {
    // Doubled pawns
    if (wPawnFiles[f] > 1) {
      const penalty = (wPawnFiles[f] - 1) * 12;
      mgWhite -= penalty;
      egWhite -= penalty * 2;
    }
    if (bPawnFiles[f] > 1) {
      const penalty = (bPawnFiles[f] - 1) * 12;
      mgBlack -= penalty;
      egBlack -= penalty * 2;
    }

    // Isolated pawns
    if (wPawnFiles[f] > 0) {
      const left  = f > 0 ? wPawnFiles[f - 1] : 0;
      const right = f < 7 ? wPawnFiles[f + 1] : 0;
      if (left === 0 && right === 0) {
        mgWhite -= 15;
        egWhite -= 25;
      }
    }
    if (bPawnFiles[f] > 0) {
      const left  = f > 0 ? bPawnFiles[f - 1] : 0;
      const right = f < 7 ? bPawnFiles[f + 1] : 0;
      if (left === 0 && right === 0) {
        mgBlack -= 15;
        egBlack -= 25;
      }
    }

    // Backward pawns (simplified)
    if (wPawnFiles[f] > 0 && wPawnRanks[f] >= 0) {
      const leftRank = f > 0 ? wPawnRanks[f - 1] : 8;
      const rightRank = f < 7 ? wPawnRanks[f + 1] : 8;
      if (leftRank < wPawnRanks[f] && rightRank < wPawnRanks[f]) {
        // Pawn is ahead of both adjacent pawns - might be backward
        mgWhite -= 8;
        egWhite -= 10;
      }
    }
    if (bPawnFiles[f] > 0 && bPawnRanks[f] < 8) {
      const leftRank = f > 0 ? bPawnRanks[f - 1] : -1;
      const rightRank = f < 7 ? bPawnRanks[f + 1] : -1;
      if (leftRank > bPawnRanks[f] && rightRank > bPawnRanks[f]) {
        mgBlack -= 8;
        egBlack -= 10;
      }
    }

    // Passed pawns
    if (wPawnRanks[f] >= 0) {
      let passed = true;
      for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) {
        if (bPawnRanks[ff] <= wPawnRanks[f]) { passed = false; break; }
      }
      if (passed) {
        const bonus = [0, 5, 10, 20, 40, 70, 120, 0][wPawnRanks[f]];
        mgWhite += bonus;
        egWhite += bonus * 2;
        // Bonus for king proximity to passed pawn in endgame
        const dist = Math.abs(bkr - wPawnRanks[f]) + Math.abs(bkf - f);
        egWhite += dist * 3; // enemy king far = good
        const ownDist = Math.abs(wkr - wPawnRanks[f]) + Math.abs(wkf - f);
        egWhite -= ownDist * 2; // own king close = good
      }
    }
    if (bPawnRanks[f] < 8) {
      let passed = true;
      for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) {
        if (wPawnRanks[ff] >= bPawnRanks[f]) { passed = false; break; }
      }
      if (passed) {
        const bonus = [0, 120, 70, 40, 20, 10, 5, 0][bPawnRanks[f]];
        mgBlack += bonus;
        egBlack += bonus * 2;
        const dist = Math.abs(wkr - bPawnRanks[f]) + Math.abs(wkf - f);
        egBlack += dist * 3;
        const ownDist = Math.abs(bkr - bPawnRanks[f]) + Math.abs(bkf - f);
        egBlack -= ownDist * 2;
      }
    }
  }

  // ── Rook on open / semi-open files ────────────────────────
  for (let sq = 0; sq < 64; sq++) {
    const p = sqs[sq];
    if (p === EMPTY) continue;
    const type = pieceType(p);
    const f = fileOf(sq);
    const r = rankOf(sq);

    if (type === ROOK) {
      if (pieceColor(p) === WHITE) {
        if (wPawnFiles[f] === 0 && bPawnFiles[f] === 0) {
          mgWhite += 25; egWhite += 18;  // open file
        } else if (wPawnFiles[f] === 0) {
          mgWhite += 12; egWhite += 10;  // semi-open
        }
        // Rook on 7th rank
        if (r === 6) { mgWhite += 20; egWhite += 40; }
      } else {
        if (wPawnFiles[f] === 0 && bPawnFiles[f] === 0) {
          mgBlack += 25; egBlack += 18;
        } else if (bPawnFiles[f] === 0) {
          mgBlack += 12; egBlack += 10;
        }
        // Rook on 2nd rank (7th from black's perspective)
        if (r === 1) { mgBlack += 20; egBlack += 40; }
      }
    }
  }

  // ── Knight outpost bonus ──────────────────────────────────
  for (let sq = 0; sq < 64; sq++) {
    const p = sqs[sq];
    if (p === EMPTY) continue;
    const type = pieceType(p);
    const r = rankOf(sq), f = fileOf(sq);

    if (type === KNIGHT) {
      if (pieceColor(p) === WHITE && r >= 3 && r <= 5) {
        let isOutpost = true;
        for (let rr = r + 1; rr < 8; rr++) {
          if (f > 0 && sqs[sqFrom(rr, f - 1)] === B_PAWN) { isOutpost = false; break; }
          if (f < 7 && sqs[sqFrom(rr, f + 1)] === B_PAWN) { isOutpost = false; break; }
        }
        if (isOutpost) {
          mgWhite += 25; egWhite += 15;
          // Extra bonus if supported by own pawn
          if (r > 0) {
            if ((f > 0 && sqs[sqFrom(r - 1, f - 1)] === W_PAWN) ||
                (f < 7 && sqs[sqFrom(r - 1, f + 1)] === W_PAWN)) {
              mgWhite += 15; egWhite += 5;
            }
          }
        }
      }
      if (pieceColor(p) === BLACK && r >= 2 && r <= 4) {
        let isOutpost = true;
        for (let rr = r - 1; rr >= 0; rr--) {
          if (f > 0 && sqs[sqFrom(rr, f - 1)] === W_PAWN) { isOutpost = false; break; }
          if (f < 7 && sqs[sqFrom(rr, f + 1)] === W_PAWN) { isOutpost = false; break; }
        }
        if (isOutpost) {
          mgBlack += 25; egBlack += 15;
          if (r < 7) {
            if ((f > 0 && sqs[sqFrom(r + 1, f - 1)] === B_PAWN) ||
                (f < 7 && sqs[sqFrom(r + 1, f + 1)] === B_PAWN)) {
              mgBlack += 15; egBlack += 5;
            }
          }
        }
      }
    }
  }

  // ── King safety (pawn shield + attack evaluation) ─────────
  {
    // White king pawn shield
    if (wkr <= 1) {
      let shield = 0;
      for (let df = -1; df <= 1; df++) {
        const sf = wkf + df;
        if (sf < 0 || sf > 7) continue;
        for (let dr = 1; dr <= 2; dr++) {
          const sr = wkr + dr;
          if (sr < 8 && sqs[sqFrom(sr, sf)] === W_PAWN) {
            shield += dr === 1 ? 12 : 6;
            break;
          }
        }
      }
      mgWhite += shield;

      // Penalty for open files near king
      for (let df = -1; df <= 1; df++) {
        const sf = wkf + df;
        if (sf < 0 || sf > 7) continue;
        if (wPawnFiles[sf] === 0) mgWhite -= 18;
        if (bPawnFiles[sf] === 0) mgWhite -= 8;
      }
    }

    // Black king pawn shield
    if (bkr >= 6) {
      let shield = 0;
      for (let df = -1; df <= 1; df++) {
        const sf = bkf + df;
        if (sf < 0 || sf > 7) continue;
        for (let dr = 1; dr <= 2; dr++) {
          const sr = bkr - dr;
          if (sr >= 0 && sqs[sqFrom(sr, sf)] === B_PAWN) {
            shield += dr === 1 ? 12 : 6;
            break;
          }
        }
      }
      mgBlack += shield;

      for (let df = -1; df <= 1; df++) {
        const sf = bkf + df;
        if (sf < 0 || sf > 7) continue;
        if (bPawnFiles[sf] === 0) mgBlack -= 18;
        if (wPawnFiles[sf] === 0) mgBlack -= 8;
      }
    }

    // King attack table (simplified)
    const attackTable = [0, 0, 5, 12, 25, 50, 75, 100, 130, 170, 210, 260, 320, 380, 450, 530, 620];
    const wIdx = Math.min(wKingAttackVal, attackTable.length - 1);
    const bIdx = Math.min(bKingAttackVal, attackTable.length - 1);
    if (wKingAttackers >= 2) mgBlack += attackTable[wIdx];
    if (bKingAttackers >= 2) mgWhite += attackTable[bIdx];
  }

  // ── Space advantage (middle game) ─────────────────────────
  {
    let wSpace = 0, bSpace = 0;
    // Count squares controlled in the center and extended center
    for (let r = 2; r <= 5; r++) {
      for (let f = 2; f <= 5; f++) {
        const sq = sqFrom(r, f);
        // Check white pawn control
        if (r > 0) {
          if (f > 0 && sqs[sqFrom(r - 1, f - 1)] === W_PAWN) wSpace++;
          if (f < 7 && sqs[sqFrom(r - 1, f + 1)] === W_PAWN) wSpace++;
        }
        if (r < 7) {
          if (f > 0 && sqs[sqFrom(r + 1, f - 1)] === B_PAWN) bSpace++;
          if (f < 7 && sqs[sqFrom(r + 1, f + 1)] === B_PAWN) bSpace++;
        }
      }
    }
    mgWhite += wSpace * 3;
    mgBlack += bSpace * 3;
  }

  // ── Tempo bonus for side to move ──────────────────────────
  const tempoMG = 15;
  const tempoEG = 5;

  // ── Taper between MG and EG ───────────────────────────────
  const totalPhase = 24;
  const mgPhase = Math.min(phase, totalPhase);
  const egPhase = totalPhase - mgPhase;

  let mgScore = mgWhite - mgBlack;
  let egScore = egWhite - egBlack;

  // Apply tempo
  if (board.turn === WHITE) {
    mgScore += tempoMG;
    egScore += tempoEG;
  } else {
    mgScore -= tempoMG;
    egScore -= tempoEG;
  }

  const score = Math.round((mgScore * mgPhase + egScore * egPhase) / totalPhase);

  return board.turn === WHITE ? score : -score;
}

/* ────────────────────────────────────────────────────────────
 *  Simple material-only evaluation (for move ordering)
 * ──────────────────────────────────────────────────────────── */
export function materialScore(board) {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = board.squares[sq];
    if (p === EMPTY) continue;
    const v = VAL_MG[pieceType(p)];
    score += pieceColor(p) === WHITE ? v : -v;
  }
  return board.turn === WHITE ? score : -score;
}
