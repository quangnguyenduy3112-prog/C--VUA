/* ============================================================
 *  engine.js — AI controller (ties search + opening book)
 * ============================================================ */

import { SearchEngine } from './search.js';
import { lookupBook, parseBookMove } from './opening.js';
import { generateLegalMoves } from './moveGen.js';
import { pieceType, QUEEN, KNIGHT, fileOf, rankOf, sqName, FILE_NAMES } from './constants.js';

export class Engine {
  constructor() {
    this.search = new SearchEngine();
    this.movesPlayed = [];   // move strings for opening book lookup
    this.thinkTime   = 3000; // default think time in ms
  }

  /** Reset for a new game. */
  reset() {
    this.search.clear();
    this.movesPlayed = [];
  }

  /** Record a move (for book tracking). */
  recordMove(from, to, promo) {
    let s = sqName(from) + sqName(to);
    if (promo) s += promo;
    this.movesPlayed.push(s);
  }

  /** Set thinking time (ms). */
  setThinkTime(ms) {
    this.thinkTime = Math.max(500, ms);
  }

  /**
   * Get the best move for the current position.
   * Returns a legal move object, or null if no move.
   */
  getBestMove(board) {
    // 1) Try the opening book
    const bookMoveStr = lookupBook(this.movesPlayed);
    if (bookMoveStr) {
      const { from, to, promo } = parseBookMove(bookMoveStr);
      const legalMoves = generateLegalMoves(board);
      for (const m of legalMoves) {
        if (m.from === from && m.to === to) {
          // If promotion, match the piece type
          if (m.promotion && promo) {
            const promoChar = promo.toLowerCase();
            if (promoChar === 'q' && pieceType(m.promotion) === QUEEN) return m;
            if (promoChar === 'n' && pieceType(m.promotion) === KNIGHT) return m;
            continue;
          }
          return m;
        }
      }
    }

    // 2) Fall back to search
    const maxDepth = 64;  // effectively unlimited, controlled by time
    return this.search.search(board, maxDepth, this.thinkTime);
  }

  /** Get search info from last search. */
  getInfo() {
    return this.search.lastInfo;
  }
}
