/* ============================================================
 *  game.js — Game controller: manages flow, PvP / PvE
 * ============================================================ */

import { Board } from './board.js';
import { Engine } from './engine.js';
import { generateLegalMoves, hasLegalMove } from './moveGen.js';
import { moveToSAN } from './notation.js';
import {
  EMPTY, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  WHITE, BLACK,
  pieceType, pieceColor, isWhite, isBlack,
  rankOf, fileOf, sqName,
  FLAG_PROMO, FLAG_CASTLE_K, FLAG_CASTLE_Q, FLAG_EP,
  W_QUEEN, B_QUEEN,
  PIECE_UNICODE,
} from './constants.js';

export const MODE_PVP = 'pvp';
export const MODE_PVE = 'pve';
export const MODE_ONLINE = 'online';

export const STATUS_PLAYING   = 'playing';
export const STATUS_CHECKMATE = 'checkmate';
export const STATUS_STALEMATE = 'stalemate';
export const STATUS_DRAW_50   = 'draw50';
export const STATUS_DRAW_REP  = 'repetition';
export const STATUS_DRAW_MAT  = 'insufficient';
export const STATUS_RESIGN    = 'resign';

/* ── Sound system ────────────────────────────────────────── */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _ensureCtx() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.enabled = false;
      }
    }
    return this.ctx;
  }

  _play(freq, duration, type = 'sine', volume = 0.15) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* ignore audio errors */ }
  }

  move() { this._play(600, 0.08, 'sine', 0.12); }
  capture() {
    this._play(200, 0.15, 'square', 0.1);
    setTimeout(() => this._play(400, 0.08, 'sine', 0.08), 50);
  }
  castle() {
    this._play(500, 0.06, 'sine', 0.1);
    setTimeout(() => this._play(700, 0.06, 'sine', 0.1), 60);
  }
  check() {
    this._play(800, 0.12, 'square', 0.15);
    setTimeout(() => this._play(1000, 0.08, 'sine', 0.1), 80);
  }
  checkmate() {
    this._play(300, 0.3, 'square', 0.15);
    setTimeout(() => this._play(200, 0.3, 'sine', 0.12), 200);
    setTimeout(() => this._play(150, 0.5, 'sine', 0.1), 400);
  }
  promote() {
    this._play(500, 0.08, 'sine', 0.1);
    setTimeout(() => this._play(800, 0.08, 'sine', 0.1), 80);
    setTimeout(() => this._play(1100, 0.12, 'sine', 0.12), 160);
  }
  gameStart() {
    this._play(400, 0.08, 'sine', 0.08);
    setTimeout(() => this._play(600, 0.12, 'sine', 0.1), 100);
  }
  illegal() { this._play(150, 0.2, 'square', 0.08); }
}

export class Game {
  constructor() {
    this.board      = new Board();
    this.engine     = new Engine();
    this.sound      = new SoundManager();
    this.mode       = MODE_PVP;
    this.playerColor = WHITE;   // In PvE, player's color
    this.status     = STATUS_PLAYING;
    this.winner     = null;     // WHITE / BLACK / null
    this.moveList   = [];       // { san, from, to, piece, captured }
    this.selected   = -1;       // currently selected square
    this.legalMoves = [];       // legal moves for selected piece
    this.lastMove   = null;     // { from, to }
    this.listeners  = [];       // onChange callbacks
    this.isThinking = false;
    this.capturedWhite = [];    // pieces captured from white (black took them)
    this.capturedBlack = [];    // pieces captured from black (white took them)
    this._pendingPromotion = null;
    this.moveCount = 0;
    
    // Setup Network
    if (typeof NetworkManager !== 'undefined') {
      this.network = new NetworkManager();
      this.network.onMoveReceived = (moveObj) => {
        this._executeMove(moveObj, true);
      };
      this.network.onEventReceived = (type, data) => {
        if (type === 'RESIGN') {
          this.resign(true);
        } else if (type === 'NEW_GAME') {
          this.newGame(MODE_ONLINE, this.playerColor === WHITE ? BLACK : WHITE, true);
        }
      };
      this.network.onDisconnected = () => {
        if (this.mode === MODE_ONLINE) {
          // You could set status to something like STATUS_OPPONENT_LEFT
          this._emit();
        }
      };
    }
  }

  /** Subscribe to state changes. */
  onChange(fn) {
    this.listeners.push(fn);
  }

  _emit() {
    for (const fn of this.listeners) fn();
  }

  /** Start a new game. */
  newGame(mode, playerColor = WHITE, fromNetwork = false) {
    if (mode === MODE_ONLINE && !fromNetwork && this.network) {
      this.network.sendEvent('NEW_GAME');
    }

    this.board.reset();
    this.engine.reset();
    this.mode        = mode;
    this.playerColor = playerColor;
    this.status      = STATUS_PLAYING;
    this.winner      = null;
    this.moveList    = [];
    this.selected    = -1;
    this.legalMoves  = [];
    this.lastMove    = null;
    this.isThinking  = false;
    this.capturedWhite = [];
    this.capturedBlack = [];
    this._pendingPromotion = null;
    this.moveCount = 0;
    this.sound.gameStart();
    this._emit();

    // If PvE and AI plays first (player is black), trigger AI move
    if (this.mode === MODE_PVE && this.playerColor === BLACK) {
      this._scheduleAI();
    }
  }

  /** Is it the human player's turn? */
  isPlayerTurn() {
    if (this.mode === MODE_PVP) return true;
    if (this.mode === MODE_ONLINE) return this.board.turn === this.playerColor;
    return this.board.turn === this.playerColor;
  }

  /** Handle a square click. */
  clickSquare(sq) {
    if (this.status !== STATUS_PLAYING) return;
    if (this.isThinking) return;
    if (!this.isPlayerTurn()) return;

    const piece = this.board.squares[sq];

    // If we already have a piece selected
    if (this.selected >= 0) {
      // Clicking the same square → deselect
      if (sq === this.selected) {
        this.selected = -1;
        this.legalMoves = [];
        this._emit();
        return;
      }

      // Try to make a move to the clicked square
      const move = this.legalMoves.find(m => m.to === sq);
      if (move) {
        // Check for promotion
        if (move.flag === FLAG_PROMO) {
          this._pendingPromotion = { sq, moves: this.legalMoves.filter(m => m.to === sq) };
          this._emit();
          return;
        }
        this._executeMove(move);
        return;
      }

      // Clicking a friendly piece → select it instead
      if (piece !== EMPTY && pieceColor(piece) === this.board.turn) {
        this._selectSquare(sq);
        return;
      }

      // Otherwise deselect
      this.selected = -1;
      this.legalMoves = [];
      this._emit();
      return;
    }

    // No piece selected yet → select if it's a friendly piece
    if (piece !== EMPTY && pieceColor(piece) === this.board.turn) {
      this._selectSquare(sq);
    }
  }

  /** Select a square and compute its legal moves. */
  _selectSquare(sq) {
    this.selected = sq;
    const allLegal = generateLegalMoves(this.board);
    this.legalMoves = allLegal.filter(m => m.from === sq);
    this._emit();
  }

  /** Resolve promotion choice. */
  promoteWith(pieceTypeChoice) {
    if (!this._pendingPromotion) return;
    const { moves } = this._pendingPromotion;
    const move = moves.find(m => pieceType(m.promotion) === pieceTypeChoice);
    this._pendingPromotion = null;
    if (move) {
      this.sound.promote();
      this._executeMove(move);
    }
  }

  /** Has a pending promotion choice? */
  get pendingPromotion() {
    return this._pendingPromotion || null;
  }

  /** Execute a move on the board. */
  _executeMove(move, fromNetwork = false) {
    if (this.mode === MODE_ONLINE && !fromNetwork && this.network) {
      this.network.sendMove(move);
    }

    // Record SAN before making the move
    const san = moveToSAN(move, this.board);

    // Track captured pieces
    if (move.captured) {
      if (pieceColor(move.captured) === WHITE) {
        this.capturedWhite.push(move.captured);
      } else {
        this.capturedBlack.push(move.captured);
      }
    }

    // Record for opening book — fixed promotion char
    let promoChar = null;
    if (move.promotion) {
      const pt = pieceType(move.promotion);
      if (pt === QUEEN) promoChar = 'q';
      else if (pt === ROOK) promoChar = 'r';
      else if (pt === BISHOP) promoChar = 'b';
      else if (pt === KNIGHT) promoChar = 'n';
    }
    this.engine.recordMove(move.from, move.to, promoChar);

    // Make the move
    this.board.makeMove(move);
    this.moveCount++;

    // Store move info
    const moveNum = Math.ceil(this.moveList.length / 2) + 1;
    this.moveList.push({
      san,
      from: move.from,
      to: move.to,
      piece: move.piece,
      captured: move.captured,
      promotion: move.promotion,
      flag: move.flag,
      moveNum,
      isWhite: pieceColor(move.piece) === WHITE,
    });

    this.lastMove = { from: move.from, to: move.to };
    this.selected = -1;
    this.legalMoves = [];

    // Play sound effects
    this._playMoveSound(move);

    // Check game status
    this._checkGameOver();

    this._emit();

    // If PvE and it's AI's turn, schedule AI move
    if (this.status === STATUS_PLAYING && this.mode === MODE_PVE && !this.isPlayerTurn()) {
      this._scheduleAI();
    }
  }

  /** Play appropriate sound for a move. */
  _playMoveSound(move) {
    if (this.status !== STATUS_PLAYING) return;
    
    if (this.board.inCheck()) {
      this.sound.check();
    } else if (move.flag === FLAG_CASTLE_K || move.flag === FLAG_CASTLE_Q) {
      this.sound.castle();
    } else if (move.captured) {
      this.sound.capture();
    } else if (move.flag === FLAG_PROMO) {
      this.sound.promote();
    } else {
      this.sound.move();
    }
  }

  /** Check for checkmate, stalemate, draws. */
  _checkGameOver() {
    if (!hasLegalMove(this.board)) {
      if (this.board.inCheck()) {
        this.status = STATUS_CHECKMATE;
        this.winner = this.board.turn === WHITE ? BLACK : WHITE;
        setTimeout(() => this.sound.checkmate(), 150);
      } else {
        this.status = STATUS_STALEMATE;
      }
      return;
    }

    if (this.board.isDraw50()) {
      this.status = STATUS_DRAW_50;
      return;
    }

    if (this.board.isRepetition()) {
      this.status = STATUS_DRAW_REP;
      return;
    }

    if (this.board.isInsufficientMaterial()) {
      this.status = STATUS_DRAW_MAT;
      return;
    }
  }

  /** Schedule AI move (async to not block UI). */
  _scheduleAI() {
    this.isThinking = true;
    this._emit();

    // Use setTimeout to yield to the UI
    setTimeout(() => {
      const move = this.engine.getBestMove(this.board);
      this.isThinking = false;

      if (move) {
        this._executeMove(move);
      }
    }, 50);
  }

  /** Resign the current game. */
  resign(fromNetwork = false) {
    if (this.status !== STATUS_PLAYING) return;
    
    if (this.mode === MODE_ONLINE && !fromNetwork && this.network) {
      this.network.sendEvent('RESIGN');
    }

    this.status = STATUS_RESIGN;
    if (this.mode === MODE_PVE) {
      this.winner = this.playerColor === WHITE ? BLACK : WHITE;
    } else {
      this.winner = this.board.turn === WHITE ? BLACK : WHITE;
    }
    this._emit();
  }

  /** Get display-friendly status text. */
  getStatusText() {
    switch (this.status) {
      case STATUS_PLAYING:
        if (this.isThinking) return '🤖 AI đang suy nghĩ...';
        if (this.board.inCheck()) {
          return this.board.turn === WHITE ? '⚡ Trắng bị chiếu!' : '⚡ Đen bị chiếu!';
        }
        return this.board.turn === WHITE ? '⬜ Lượt Trắng' : '⬛ Lượt Đen';
      case STATUS_CHECKMATE:
        return this.winner === WHITE ? '🏆 Trắng thắng — Chiếu hết!' : '🏆 Đen thắng — Chiếu hết!';
      case STATUS_STALEMATE:
        return '🤝 Hòa — Hết nước đi!';
      case STATUS_DRAW_50:
        return '🤝 Hòa — Luật 50 nước!';
      case STATUS_DRAW_REP:
        return '🤝 Hòa — Lặp thế 3 lần!';
      case STATUS_DRAW_MAT:
        return '🤝 Hòa — Thiếu quân!';
      case STATUS_RESIGN:
        return this.winner === WHITE ? '🏆 Trắng thắng — Đối thủ đầu hàng!' : '🏆 Đen thắng — Đối thủ đầu hàng!';
      default:
        return '';
    }
  }
}
