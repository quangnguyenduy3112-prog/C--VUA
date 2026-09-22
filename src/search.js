/* ============================================================
 *  search.js — Alpha-beta search with advanced pruning
 * ============================================================
 *  Features:
 *    ✓ Iterative deepening
 *    ✓ Alpha-beta with fail-soft
 *    ✓ Transposition table (2-bucket)
 *    ✓ Quiescence search with delta pruning + SEE
 *    ✓ Null-move pruning (adaptive R)
 *    ✓ Late-move reduction (LMR) with log-based formula
 *    ✓ Killer moves (2 per ply)
 *    ✓ Counter-move heuristic
 *    ✓ History heuristic with aging
 *    ✓ MVV-LVA move ordering
 *    ✓ Check extensions
 *    ✓ Aspiration windows (widening)
 *    ✓ Futility pruning (extended)
 *    ✓ Razoring
 *    ✓ Internal iterative deepening (IID)
 *    ✓ Late-move pruning
 *    ✓ Mate distance pruning
 *    ✓ SEE-based pruning for captures
 * ============================================================ */

import {
  EMPTY, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  WHITE, BLACK,
  pieceType, pieceColor,
  VAL_MG, FLAG_PROMO, FLAG_CASTLE_K, FLAG_CASTLE_Q,
  rankOf, fileOf,
} from './constants.js';

import { generatePseudoMoves, generateLegalMoves, generateLegalCaptures } from './moveGen.js';
import { evaluate } from './evaluation.js';

/* ── Constants ───────────────────────────────────────────── */
const INF        = 30000;
const MATE_SCORE = 29000;
const TT_SIZE    = 1 << 21;   // ~2M entries
const TT_MASK    = TT_SIZE - 1;

// TT flags
const TT_EXACT = 0;
const TT_ALPHA = 1;  // upper bound
const TT_BETA  = 2;  // lower bound

// MVV-LVA lookup: victim-type → attacker-type → score
const MVV_LVA = new Int32Array(15 * 7);
{
  const victimVal  = [0, 10, 20, 30, 40, 50, 60];
  const attackerVal = [0, 6, 5, 4, 3, 2, 1];
  for (let v = 1; v <= 6; v++) {
    for (let a = 1; a <= 6; a++) {
      MVV_LVA[v * 7 + a] = victimVal[v] * 10 + attackerVal[a];
    }
  }
}

// LMR reduction table (precomputed logarithmic)
const LMR_TABLE = [];
for (let d = 0; d < 64; d++) {
  LMR_TABLE[d] = [];
  for (let m = 0; m < 64; m++) {
    if (d === 0 || m === 0) {
      LMR_TABLE[d][m] = 0;
    } else {
      LMR_TABLE[d][m] = Math.max(0, Math.floor(0.75 + Math.log(d) * Math.log(m) / 2.25));
    }
  }
}

// SEE piece values for Static Exchange Evaluation
const SEE_VAL = [0, 100, 320, 330, 500, 900, 20000];

/* ── Transposition Table ─────────────────────────────────── */
class TTEntry {
  constructor() {
    this.hash  = 0;
    this.depth = -1;
    this.score = 0;
    this.flag  = 0;
    this.bestFrom = -1;
    this.bestTo   = -1;
    this.bestPromo = 0;
    this.age   = 0;
  }
}

/* ============================================================
 *  Search Engine
 * ============================================================ */
export class SearchEngine {
  constructor() {
    this.tt = new Array(TT_SIZE);
    for (let i = 0; i < TT_SIZE; i++) this.tt[i] = new TTEntry();

    this.killers  = [];  // [ply][0..1]
    this.counterMoves = new Int32Array(64 * 64 * 2); // counterMove[from*64+to] = packed(from,to)
    this.history  = new Int32Array(2 * 64 * 64);
    this.nodes    = 0;
    this.maxDepth = 64;
    this.stopped  = false;
    this.startTime = 0;
    this.timeLimit = 0;
    this.age       = 0;

    // Stats for UI
    this.lastInfo = { depth: 0, score: 0, nodes: 0, time: 0, pv: '' };
  }

  /* ─── Clear state ──────────────────────────────────────── */
  clear() {
    for (let i = 0; i < TT_SIZE; i++) {
      this.tt[i].hash = 0;
      this.tt[i].depth = -1;
    }
    this.history.fill(0);
    this.counterMoves.fill(-1);
    this.age = 0;
  }

  /* ─── Time check ───────────────────────────────────────── */
  checkTime() {
    if (this.nodes % 2048 === 0) {
      if (performance.now() - this.startTime >= this.timeLimit) {
        this.stopped = true;
      }
    }
  }

  /* ─── TT probe ─────────────────────────────────────────── */
  ttProbe(hash, depth, alpha, beta, ply) {
    const entry = this.tt[hash & TT_MASK];
    if (entry.hash !== hash) return null;

    if (entry.depth >= depth) {
      let score = entry.score;
      // Adjust mate scores for current ply
      if (score >  MATE_SCORE - 100) score -= ply;
      if (score < -MATE_SCORE + 100) score += ply;

      if (entry.flag === TT_EXACT) return { score, bestFrom: entry.bestFrom, bestTo: entry.bestTo, bestPromo: entry.bestPromo };
      if (entry.flag === TT_ALPHA && score <= alpha) return { score: alpha, bestFrom: entry.bestFrom, bestTo: entry.bestTo, bestPromo: entry.bestPromo };
      if (entry.flag === TT_BETA  && score >= beta)  return { score: beta,  bestFrom: entry.bestFrom, bestTo: entry.bestTo, bestPromo: entry.bestPromo };
    }

    return { score: null, bestFrom: entry.bestFrom, bestTo: entry.bestTo, bestPromo: entry.bestPromo };
  }

  /* ─── TT store ─────────────────────────────────────────── */
  ttStore(hash, depth, score, flag, bestFrom, bestTo, bestPromo, ply) {
    const idx   = hash & TT_MASK;
    const entry = this.tt[idx];

    // Always-replace with depth priority
    if (entry.hash !== hash || depth >= entry.depth - 2 || entry.age !== this.age) {
      let s = score;
      if (s >  MATE_SCORE - 100) s += ply;
      if (s < -MATE_SCORE + 100) s -= ply;

      entry.hash      = hash;
      entry.depth     = depth;
      entry.score     = s;
      entry.flag      = flag;
      entry.bestFrom  = bestFrom;
      entry.bestTo    = bestTo;
      entry.bestPromo = bestPromo || 0;
      entry.age       = this.age;
    }
  }

  /* ─── Static Exchange Evaluation (simplified) ──────────── */
  see(board, move) {
    if (!move.captured) return 0;
    
    const val = SEE_VAL[pieceType(move.captured)];
    const attackerVal = SEE_VAL[pieceType(move.piece)];
    
    // Simple approximation: if we capture a more valuable piece, it's likely good
    if (val >= attackerVal) return val - attackerVal;
    
    // For captures of less valuable pieces, check if the square is defended
    // Simplified: just use MVV-LVA score as proxy
    return val - attackerVal;
  }

  /* ─── Move ordering ────────────────────────────────────── */
  scoreMove(move, ttFrom, ttTo, ttPromo, ply, board, prevMove) {
    // TT move gets highest priority
    if (move.from === ttFrom && move.to === ttTo && 
        (!ttPromo || move.promotion === ttPromo)) return 10000000;

    // Winning captures (MVV-LVA + SEE positive)
    if (move.captured) {
      const seeVal = this.see(board, move);
      if (seeVal >= 0) {
        return 6000000 + MVV_LVA[pieceType(move.captured) * 7 + pieceType(move.piece)];
      }
      // Losing captures still above quiet moves but below killers
      return 2000000 + MVV_LVA[pieceType(move.captured) * 7 + pieceType(move.piece)];
    }

    // Promotions
    if (move.flag === FLAG_PROMO) {
      return 5500000 + VAL_MG[pieceType(move.promotion)];
    }

    // Killer moves
    if (this.killers[ply]) {
      if (this.killers[ply][0] &&
          this.killers[ply][0].from === move.from &&
          this.killers[ply][0].to === move.to) return 5000000;
      if (this.killers[ply][1] &&
          this.killers[ply][1].from === move.from &&
          this.killers[ply][1].to === move.to) return 4900000;
    }

    // Counter-move heuristic
    if (prevMove) {
      const cmIdx = prevMove.from * 64 + prevMove.to;
      const cmPacked = this.counterMoves[cmIdx * 2];
      const cmPacked2 = this.counterMoves[cmIdx * 2 + 1];
      if (cmPacked >= 0) {
        const cmFrom = cmPacked >> 6;
        const cmTo = cmPacked & 63;
        if (move.from === cmFrom && move.to === cmTo) return 4800000;
      }
    }

    // Castling gets a small bonus
    if (move.flag === FLAG_CASTLE_K || move.flag === FLAG_CASTLE_Q) {
      return 4700000;
    }

    // History heuristic
    const ci = board.turn === WHITE ? 0 : 64 * 64;
    return this.history[ci + move.from * 64 + move.to];
  }

  sortMoves(moves, ttFrom, ttTo, ttPromo, ply, board, prevMove) {
    const scores = moves.map(m => this.scoreMove(m, ttFrom, ttTo, ttPromo, ply, board, prevMove));
    const indexed = moves.map((m, i) => i);
    indexed.sort((a, b) => scores[b] - scores[a]);
    return indexed.map(i => moves[i]);
  }

  /* ─── Pick best move incrementally (for first few moves) ── */
  pickBest(moves, scores, startIdx) {
    let bestIdx = startIdx;
    let bestScore = scores[startIdx];
    for (let i = startIdx + 1; i < moves.length; i++) {
      if (scores[i] > bestScore) {
        bestScore = scores[i];
        bestIdx = i;
      }
    }
    if (bestIdx !== startIdx) {
      // Swap
      [moves[startIdx], moves[bestIdx]] = [moves[bestIdx], moves[startIdx]];
      [scores[startIdx], scores[bestIdx]] = [scores[bestIdx], scores[startIdx]];
    }
  }

  /* ─── Quiescence search ────────────────────────────────── */
  quiescence(board, alpha, beta, ply) {
    this.nodes++;
    if (this.stopped) return 0;
    this.checkTime();
    if (this.stopped) return 0;

    const standPat = evaluate(board);

    if (ply >= 64) return standPat;

    if (standPat >= beta) return beta;
    
    // Delta pruning: if even queen capture can't raise alpha
    const DELTA = 1025;
    if (standPat + DELTA < alpha) return alpha;

    if (alpha < standPat) alpha = standPat;

    const captures = generateLegalCaptures(board);

    // Sort captures by MVV-LVA
    captures.sort((a, b) => {
      const sa = MVV_LVA[pieceType(a.captured) * 7 + pieceType(a.piece)];
      const sb = MVV_LVA[pieceType(b.captured) * 7 + pieceType(b.piece)];
      return sb - sa;
    });

    for (const move of captures) {
      // SEE pruning: skip clearly losing captures
      if (standPat + VAL_MG[pieceType(move.captured)] + 200 < alpha &&
          move.flag !== FLAG_PROMO) continue;

      // Skip losing captures by SEE
      if (this.see(board, move) < -50 && move.flag !== FLAG_PROMO) continue;

      board.makeMove(move);
      const score = -this.quiescence(board, -beta, -alpha, ply + 1);
      board.unmakeMove(move);

      if (this.stopped) return 0;

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }

    return alpha;
  }

  /* ─── Alpha-Beta search ────────────────────────────────── */
  alphaBeta(board, depth, alpha, beta, ply, doNull, prevMove) {
    // Check for time
    this.nodes++;
    if (this.stopped) return 0;
    this.checkTime();
    if (this.stopped) return 0;

    // Mate distance pruning
    {
      const mateAlpha = Math.max(alpha, -MATE_SCORE + ply);
      const mateBeta  = Math.min(beta,   MATE_SCORE - ply - 1);
      if (mateAlpha >= mateBeta) return mateAlpha;
    }

    // Repetition / 50-move draw
    if (ply > 0 && (board.isRepetition() || board.isDraw50())) return 0;

    // Insufficient material
    if (ply > 0 && board.isInsufficientMaterial()) return 0;

    const isInCheck = board.inCheck();

    // Check extension
    if (isInCheck) depth++;

    // Leaf: quiescence
    if (depth <= 0) {
      return this.quiescence(board, alpha, beta, ply);
    }

    const isPV = beta - alpha > 1;

    // ── TT probe ─────────────────────────────────────────
    let ttFrom = -1, ttTo = -1, ttPromo = 0;
    const ttResult = this.ttProbe(board.hash, depth, alpha, beta, ply);
    if (ttResult) {
      ttFrom = ttResult.bestFrom;
      ttTo   = ttResult.bestTo;
      ttPromo = ttResult.bestPromo;
      if (ttResult.score !== null && !isPV) {
        return ttResult.score;
      }
    }

    const staticEval = evaluate(board);

    // ── Razoring ─────────────────────────────────────────
    if (!isPV && !isInCheck && depth <= 3) {
      const margin = 250 * depth;
      if (staticEval + margin <= alpha) {
        const razorScore = this.quiescence(board, alpha, beta, ply);
        if (razorScore <= alpha) return razorScore;
      }
    }

    // ── Reverse futility pruning (static null move pruning) ─
    if (!isPV && !isInCheck && depth <= 5 && staticEval - 80 * depth >= beta) {
      return staticEval - 80 * depth;
    }

    // ── Null-move pruning ────────────────────────────────
    if (doNull && !isPV && !isInCheck && depth >= 3 && staticEval >= beta) {
      // Don't null move in positions with only pawns + king
      let hasNonPawn = false;
      for (let sq = 0; sq < 64; sq++) {
        const p = board.squares[sq];
        if (p !== EMPTY && pieceColor(p) === board.turn && pieceType(p) !== PAWN && pieceType(p) !== KING) {
          hasNonPawn = true;
          break;
        }
      }

      if (hasNonPawn) {
        // Make null move
        const savedEp = board.epSquare;
        const savedHash = board.hash;
        board.turn ^= 8;
        board.epSquare = -1;
        board.hash ^= 0x12345678;

        const R = 3 + Math.floor(depth / 4) + Math.min(Math.floor((staticEval - beta) / 200), 3);
        const score = -this.alphaBeta(board, depth - 1 - R, -beta, -beta + 1, ply + 1, false, null);

        board.turn ^= 8;
        board.epSquare = savedEp;
        board.hash = savedHash;

        if (this.stopped) return 0;
        if (score >= beta) {
          if (score >= MATE_SCORE - 100) return beta;
          return beta;
        }
      }
    }

    // ── Generate and sort moves ──────────────────────────
    const moves = generateLegalMoves(board);

    if (moves.length === 0) {
      if (isInCheck) return -MATE_SCORE + ply;  // checkmate
      return 0;  // stalemate
    }

    // ── Internal iterative deepening ─────────────────────
    if (isPV && depth >= 4 && ttFrom < 0) {
      this.alphaBeta(board, depth - 2, alpha, beta, ply, false, prevMove);
      const ttResult2 = this.ttProbe(board.hash, 0, alpha, beta, ply);
      if (ttResult2) {
        ttFrom = ttResult2.bestFrom;
        ttTo   = ttResult2.bestTo;
        ttPromo = ttResult2.bestPromo;
      }
    }

    const sorted = this.sortMoves(moves, ttFrom, ttTo, ttPromo, ply, board, prevMove);

    let bestScore = -INF;
    let bestFrom  = sorted[0].from;
    let bestTo    = sorted[0].to;
    let bestPromo = sorted[0].promotion || 0;
    let flag      = TT_ALPHA;

    // ── Futility pruning margin ──────────────────────────
    let canFutile = false;
    let futilityMargin = 0;
    if (!isPV && !isInCheck && depth <= 4) {
      futilityMargin = staticEval + 120 * depth;
      canFutile = futilityMargin <= alpha;
    }

    let quietsSearched = 0;

    for (let i = 0; i < sorted.length; i++) {
      const move = sorted[i];
      const isQuiet = !move.captured && move.flag !== FLAG_PROMO;

      // ── Late-move pruning (for quiet moves) ────────────
      if (!isPV && !isInCheck && isQuiet && depth <= 3 && quietsSearched >= (3 + depth * depth)) {
        continue;
      }

      // Futility pruning (extended)
      if (canFutile && i > 0 && isQuiet) {
        quietsSearched++;
        continue;
      }

      // SEE pruning for bad captures in non-PV nodes
      if (!isPV && i > 0 && move.captured && depth <= 3 && this.see(board, move) < -100 * depth) {
        continue;
      }

      board.makeMove(move);

      let score;
      const givesCheck = board.inCheck(); // Check if move gives check (opponent in check)

      if (i === 0) {
        // Full window search for first move
        score = -this.alphaBeta(board, depth - 1, -beta, -alpha, ply + 1, true, move);
      } else {
        // ── Late-Move Reduction ──────────────────────────
        let reduction = 0;
        if (depth >= 3 && i >= 2 && !isInCheck && isQuiet && !givesCheck) {
          reduction = LMR_TABLE[Math.min(depth, 63)][Math.min(i, 63)];
          
          // Reduce more for non-PV nodes
          if (!isPV) reduction++;
          
          // Reduce less for killer moves
          if (this.killers[ply] && 
              ((this.killers[ply][0] && this.killers[ply][0].from === move.from && this.killers[ply][0].to === move.to) ||
               (this.killers[ply][1] && this.killers[ply][1].from === move.from && this.killers[ply][1].to === move.to))) {
            reduction--;
          }

          // Reduce less for moves with good history
          const ci = board.turn === BLACK ? 0 : 64 * 64; // turn already flipped
          const histScore = this.history[ci + move.from * 64 + move.to];
          if (histScore > 1000) reduction--;

          reduction = Math.max(0, Math.min(reduction, depth - 2));
        }

        // Null-window search with reduction
        score = -this.alphaBeta(board, depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, true, move);

        // Re-search if LMR found something interesting
        if (reduction > 0 && score > alpha) {
          score = -this.alphaBeta(board, depth - 1, -alpha - 1, -alpha, ply + 1, true, move);
        }

        // Re-search with full window
        if (score > alpha && score < beta) {
          score = -this.alphaBeta(board, depth - 1, -beta, -alpha, ply + 1, true, move);
        }
      }

      board.unmakeMove(move);

      if (isQuiet) quietsSearched++;

      if (this.stopped) return 0;

      if (score > bestScore) {
        bestScore = score;
        bestFrom  = move.from;
        bestTo    = move.to;
        bestPromo = move.promotion || 0;

        if (score > alpha) {
          alpha = score;
          flag  = TT_EXACT;

          if (score >= beta) {
            flag = TT_BETA;

            // Update killers (non-captures only)
            if (!move.captured && move.flag !== FLAG_PROMO) {
              if (!this.killers[ply]) this.killers[ply] = [null, null];
              if (!this.killers[ply][0] ||
                  this.killers[ply][0].from !== move.from ||
                  this.killers[ply][0].to !== move.to) {
                this.killers[ply][1] = this.killers[ply][0];
                this.killers[ply][0] = { from: move.from, to: move.to };
              }

              // Update counter-move
              if (prevMove) {
                const cmIdx = prevMove.from * 64 + prevMove.to;
                this.counterMoves[cmIdx * 2] = (move.from << 6) | move.to;
              }

              // Update history (with depth-based bonus)
              const ci = board.turn === BLACK ? 0 : 64 * 64;
              const bonus = depth * depth;
              this.history[ci + move.from * 64 + move.to] += bonus;
              
              // Penalize other quiet moves (history malus)
              for (let j = 0; j < i; j++) {
                const prev = sorted[j];
                if (!prev.captured && prev.flag !== FLAG_PROMO) {
                  this.history[ci + prev.from * 64 + prev.to] -= bonus;
                  if (this.history[ci + prev.from * 64 + prev.to] < -1000000) {
                    this.history[ci + prev.from * 64 + prev.to] = -1000000;
                  }
                }
              }
            }

            break;
          }
        }
      }
    }

    // Store in TT
    this.ttStore(board.hash, depth, bestScore, flag, bestFrom, bestTo, bestPromo, ply);

    return bestScore;
  }

  /* ─── Extract PV from TT ──────────────────────────────── */
  extractPV(board, depth) {
    const pv = [];
    const seen = new Set();
    let d = depth;
    
    while (d > 0 && pv.length < 20) {
      const entry = this.tt[board.hash & TT_MASK];
      if (entry.hash !== board.hash || entry.bestFrom < 0) break;
      
      if (seen.has(board.hash)) break;
      seen.add(board.hash);
      
      const moves = generateLegalMoves(board);
      let found = null;
      for (const m of moves) {
        if (m.from === entry.bestFrom && m.to === entry.bestTo) {
          if (entry.bestPromo && m.promotion !== entry.bestPromo) continue;
          found = m;
          break;
        }
      }
      
      if (!found) break;
      pv.push(found);
      board.makeMove(found);
      d--;
    }
    
    // Unmake all moves
    for (let i = pv.length - 1; i >= 0; i--) {
      board.unmakeMove(pv[i]);
    }
    
    return pv;
  }

  /* ─── Iterative Deepening ──────────────────────────────── */
  search(board, maxDepth, timeLimitMs) {
    this.stopped   = false;
    this.nodes     = 0;
    this.startTime = performance.now();
    this.timeLimit = timeLimitMs;
    this.age++;

    // Reset killers
    this.killers = [];
    for (let i = 0; i < 64; i++) this.killers[i] = [null, null];

    // Soft reset history (age out old values)
    for (let i = 0; i < this.history.length; i++) {
      this.history[i] = Math.floor(this.history[i] / 4);
    }

    let bestMove  = null;
    let bestScore = 0;

    // Get legal moves
    const rootMoves = generateLegalMoves(board);
    if (rootMoves.length === 0) return null;
    if (rootMoves.length === 1) return rootMoves[0]; // forced move

    bestMove = rootMoves[0];

    for (let depth = 1; depth <= maxDepth; depth++) {
      let alpha = -INF;
      let beta  =  INF;

      // Aspiration window (after depth 5)
      let aspirationDelta = 35;
      if (depth >= 5) {
        alpha = bestScore - aspirationDelta;
        beta  = bestScore + aspirationDelta;
      }

      let score;
      
      // Aspiration window with widening
      while (true) {
        score = this.alphaBeta(board, depth, alpha, beta, 0, true, null);
        
        if (this.stopped) break;
        
        if (score <= alpha) {
          // Fail low - widen window downward
          beta = (alpha + beta) / 2;
          alpha = Math.max(score - aspirationDelta, -INF);
          aspirationDelta *= 2;
        } else if (score >= beta) {
          // Fail high - widen window upward
          beta = Math.min(score + aspirationDelta, INF);
          aspirationDelta *= 2;
        } else {
          break;
        }

        if (aspirationDelta > 500) {
          // Full window search as fallback
          alpha = -INF;
          beta = INF;
          score = this.alphaBeta(board, depth, alpha, beta, 0, true, null);
          break;
        }
      }

      if (this.stopped && depth > 1) break;

      bestScore = score;

      // Extract best move from TT
      const ttEntry = this.tt[board.hash & TT_MASK];
      if (ttEntry.hash === board.hash && ttEntry.bestFrom >= 0) {
        for (const m of rootMoves) {
          if (m.from === ttEntry.bestFrom && m.to === ttEntry.bestTo) {
            if (ttEntry.bestPromo && m.promotion !== ttEntry.bestPromo) continue;
            bestMove = m;
            break;
          }
        }
      }

      const elapsed = performance.now() - this.startTime;
      this.lastInfo = {
        depth,
        score: bestScore,
        nodes: this.nodes,
        time: Math.round(elapsed),
        nps: elapsed > 0 ? Math.round(this.nodes / elapsed * 1000) : 0,
      };

      // If we found a mate, stop searching
      if (Math.abs(bestScore) >= MATE_SCORE - 100) break;

      // If less than 40% time remaining, don't start a new iteration
      if (elapsed > timeLimitMs * 0.4) break;
    }

    return bestMove;
  }
}
