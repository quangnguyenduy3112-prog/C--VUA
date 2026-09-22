/* ============================================================
 *  renderer.js — DOM rendering: board, pieces, highlights
 * ============================================================
 *  Enhanced with: piece move animations, drag & drop, 
 *  coordinate labels on squares, visual polish.
 * ============================================================ */

import {
  EMPTY, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  WHITE, BLACK,
  pieceType, pieceColor,
  rankOf, fileOf, sqFrom, sqName,
  PIECE_UNICODE, FILE_NAMES, RANK_NAMES,
} from './constants.js';

/* ─── SVG Chess Pieces ───────────────────────────────────────
 *  High-quality inline SVG pieces for premium look.
 * ──────────────────────────────────────────────────────────── */
const SVG_PIECES = {
  // White pieces
  1: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  2: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/><path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000"/></g></svg>`,
  3: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-12.5-4" stroke-linejoin="miter"/></g></svg>`,
  4: `<svg viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M15 17v7h15v-7" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt"/><path d="M14 29.5L11 36h23l-3-6.5H14z" stroke-linecap="butt"/></g></svg>`,
  5: `<svg viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1 4 0 2 2 0 1 1-4 0z" transform="translate(15.5 -1.5)"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g></svg>`,
  6: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>`,
  // Black pieces
  9: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#333" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  10: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#333"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#333"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#ececec"/><path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#ececec"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#ececec" stroke="none"/></g></svg>`,
  11: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#333" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-12.5-4" stroke="#ececec" stroke-linejoin="miter"/></g></svg>`,
  12: `<svg viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3z" fill="#333" stroke-linecap="butt"/><path d="M12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" fill="#333" stroke-linecap="butt"/><path d="M14 29.5v-13h17v13H14z" fill="#333" stroke-linecap="butt"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" fill="#333" stroke-linecap="butt"/><path d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23" fill="none" stroke="#ececec" stroke-width="1" stroke-linejoin="miter"/></g></svg>`,
  13: `<svg viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#333"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" fill="#333" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="#333" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#ececec"/></g></svg>`,
  14: `<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#333" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#333"/><path d="M20 8h5" stroke-linejoin="miter"/><path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9" fill="none" stroke="#ececec"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="none" stroke="#ececec"/></g></svg>`,
};

/**
 * Renderer — handles all DOM rendering for the chess board.
 */
export class Renderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.boardEl   = null;
    this.squareEls = [];
    this.flipped   = false;
    this._dragState = null;  // { pieceEl, sq, startX, startY, ghostEl }
    this._init();
  }

  _init() {
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'chess-board';
    this.boardEl.id = 'chess-board';

    // Create 64 squares
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

  /** Get the internal square index from visual row/col. */
  visualToSq(vrow, vcol) {
    const rank = this.flipped ? vrow : 7 - vrow;
    const file = this.flipped ? 7 - vcol : vcol;
    return sqFrom(rank, file);
  }

  /** Get visual position for a given square index. */
  sqToVisual(sq) {
    const rank = rankOf(sq);
    const file = fileOf(sq);
    const vrow = this.flipped ? rank : 7 - rank;
    const vcol = this.flipped ? 7 - file : file;
    return { vrow, vcol };
  }

  /** Flip the board. */
  setFlipped(flipped) {
    this.flipped = flipped;
  }

  /**
   * Full board render.
   */
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

      // Build class list
      let cls = 'square ' + (isLight ? 'light' : 'dark');
      if (sq === selected) cls += ' selected';
      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) cls += ' last-move';
      if (board.inCheck() && p !== EMPTY && pieceType(p) === KING && pieceColor(p) === board.turn) {
        cls += ' in-check';
      }
      el.className = cls;

      // Piece
      if (p !== EMPTY && SVG_PIECES[p]) {
        el.innerHTML = `<div class="piece" data-piece="${p}">${SVG_PIECES[p]}</div>`;
      } else {
        el.innerHTML = '';
      }

      // Add file/rank labels inside squares if on edges
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

      // Legal move indicator
      if (legalDests.has(sq)) {
        const dot = document.createElement('div');
        dot.className = board.squares[sq] !== EMPTY ? 'capture-ring' : 'move-dot';
        el.appendChild(dot);
      }

      // Store square index for click handling
      el.dataset.sq = sq;
    }
  }

  /**
   * Render captured pieces panel.
   */
  renderCaptured(whiteCap, blackCap, whiteAdv, blackAdv, topId, bottomId) {
    const topEl = document.getElementById(topId);
    const bottomEl = document.getElementById(bottomId);
    if (!topEl || !bottomEl) return;

    // Based on flipped state, top is either black or white.
    // If not flipped, top is black, bottom is white.
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
      topEl.innerHTML = renderGroup(blackCap, blackAdv); // Black's captures (from white)
      bottomEl.innerHTML = renderGroup(whiteCap, whiteAdv); // White's captures (from black)
    } else {
      topEl.innerHTML = renderGroup(whiteCap, whiteAdv);
      bottomEl.innerHTML = renderGroup(blackCap, blackAdv);
    }
  }

  /**
   * Render move history.
   */
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

    // Auto-scroll to bottom
    el.scrollTop = el.scrollHeight;
  }
}
