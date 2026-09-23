/* ============================================================
 *  ui.js — UI controls, menus, modals, event binding
 * ============================================================ */

import { Game, MODE_PVP, MODE_PVE, STATUS_PLAYING } from './game.js';
import { Renderer } from './renderer.js';
import { QUEEN, ROOK, BISHOP, KNIGHT, WHITE, BLACK, pieceColor, pieceType } from './constants.js';

export class UI {
  constructor() {
    this.game     = new Game();
    this.renderer = new Renderer('board-container');
    this._bindEvents();
    this._showMenu();

    this.game.onChange(() => this._onGameUpdate());
  }

  /* ─── Event binding ────────────────────────────────────── */
  _bindEvents() {
    // Board click
    this.renderer.boardEl.addEventListener('click', (e) => {
      const squareEl = e.target.closest('.square');
      if (!squareEl) return;
      const sq = parseInt(squareEl.dataset.sq);
      if (isNaN(sq)) return;
      this.game.clickSquare(sq);
    });

    // Drag start on piece (mousedown)
    this.renderer.boardEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // left click only
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

      // Select this square
      this.game.clickSquare(sq);
      
      // Start drag
      const pieceEl = squareEl.querySelector('.piece');
      if (!pieceEl) return;
      
      const boardRect = this.renderer.boardEl.getBoundingClientRect();
      const sqSize = boardRect.width / 8;
      
      // Create ghost piece for dragging
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
      
      // Dim original piece
      pieceEl.style.opacity = '0.3';
      
      this._dragState = {
        sq,
        ghost,
        pieceEl,
        sqSize,
        boardRect,
      };
    });

    // Drag move
    document.addEventListener('mousemove', (e) => {
      if (!this._dragState) return;
      const { ghost, sqSize } = this._dragState;
      ghost.style.left = (e.clientX - sqSize * 0.425) + 'px';
      ghost.style.top = (e.clientY - sqSize * 0.425) + 'px';
    });

    // Drag end
    document.addEventListener('mouseup', (e) => {
      if (!this._dragState) return;
      const { ghost, pieceEl, boardRect, sqSize, sq: fromSq } = this._dragState;
      
      // Remove ghost
      ghost.remove();
      if (pieceEl) pieceEl.style.opacity = '';
      
      // Find drop target
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

    // ── Mobile Touch: Drag-and-Drop + Tap ────────────────────
    this._touchDragState = null;

    this.renderer.boardEl.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const squareEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.square');
      if (!squareEl) return;
      const sq = parseInt(squareEl.dataset.sq);
      if (isNaN(sq)) return;

      const piece = this.game.board.squares[sq];
      const isOwnPiece = piece !== 0 &&
        this.game.status === STATUS_PLAYING &&
        !this.game.isThinking &&
        this.game.isPlayerTurn() &&
        pieceColor(piece) === this.game.board.turn;

      // If it's our own piece, start a drag
      if (isOwnPiece) {
        e.preventDefault();
        this.game.clickSquare(sq); // Select the piece (shows legal moves)

        const pieceEl = squareEl.querySelector('.piece');
        if (!pieceEl) return;

        const boardRect = this.renderer.boardEl.getBoundingClientRect();
        const sqSize = boardRect.width / 8;

        // Create ghost piece
        const ghost = pieceEl.cloneNode(true);
        ghost.className = 'piece dragging-piece';
        ghost.style.cssText = `
          position: fixed;
          width: ${sqSize * 0.95}px;
          height: ${sqSize * 0.95}px;
          pointer-events: none;
          z-index: 1000;
          opacity: 0.9;
          filter: drop-shadow(0 6px 16px rgba(0,0,0,0.6));
          transform: scale(1.2);
          transition: none;
        `;
        ghost.style.left = (touch.clientX - sqSize * 0.475) + 'px';
        ghost.style.top = (touch.clientY - sqSize * 0.95) + 'px'; // Offset above finger
        document.body.appendChild(ghost);

        pieceEl.style.opacity = '0.3';

        this._touchDragState = {
          sq,
          ghost,
          pieceEl,
          sqSize,
          boardRect,
          moved: false,
        };
      } else {
        // Tapping on empty/enemy square to complete a move (if piece already selected)
        this.game.clickSquare(sq);
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!this._touchDragState) return;
      e.preventDefault();
      const touch = e.touches[0];
      const { ghost, sqSize } = this._touchDragState;
      ghost.style.left = (touch.clientX - sqSize * 0.475) + 'px';
      ghost.style.top = (touch.clientY - sqSize * 0.95) + 'px';
      this._touchDragState.moved = true;
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!this._touchDragState) return;
      const { ghost, pieceEl, boardRect, sqSize, sq: fromSq, moved } = this._touchDragState;

      ghost.remove();
      if (pieceEl) pieceEl.style.opacity = '';
      this._touchDragState = null;

      if (!moved) return; // Pure tap, already handled by touchstart

      const touch = e.changedTouches[0];
      const col = Math.floor((touch.clientX - boardRect.left) / sqSize);
      const row = Math.floor((touch.clientY - boardRect.top) / sqSize);

      if (col >= 0 && col < 8 && row >= 0 && row < 8) {
        const dropSq = this.renderer.visualToSq(row, col);
        if (dropSq !== fromSq) {
          this.game.clickSquare(dropSq);
        }
      }
    });

    // New game button
    document.getElementById('btn-new-game').addEventListener('click', () => this._showMenu());

    // Resign button
    document.getElementById('btn-resign').addEventListener('click', () => {
      if (this.game.status === STATUS_PLAYING) {
        if (this.game.moveList.length > 0) {
          this.game.resign();
        }
      }
    });

    // Flip board
    document.getElementById('btn-flip').addEventListener('click', () => {
      this.renderer.setFlipped(!this.renderer.flipped);
      this._onGameUpdate();
    });

    // Menu buttons
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
    document.getElementById('menu-online').addEventListener('click', () => {
      this._hideMenu();
      this._showNetworkChoice();
    });

    // Network UI
    document.getElementById('btn-create-room').addEventListener('click', () => {
      this._showNetworkWaiting("Đang khởi tạo phòng...");
      if (this.game.network) {
        this.game.network.onRoomCreated = (id) => {
          document.getElementById('display-room-code').textContent = id;
        };
        this.game.network.onConnected = (isHost) => {
          this._hideNetworkModal();
          this.renderer.setFlipped(false); // Host is White
          this.game.newGame(MODE_ONLINE, WHITE, true);
        };
        this.game.network.onError = (err) => {
          alert(err);
          this._showNetworkChoice();
        };
        this.game.network.createRoom();
      }
    });

    document.getElementById('btn-join-room').addEventListener('click', () => {
      const code = document.getElementById('input-room-code').value.trim().toUpperCase();
      if (!code) {
        alert("Vui lòng nhập mã phòng!");
        return;
      }
      this._showNetworkWaiting("Đang kết nối tới phòng...");
      if (this.game.network) {
        this.game.network.onConnected = (isHost) => {
          this._hideNetworkModal();
          this.renderer.setFlipped(true); // Joiner is Black
          this.game.newGame(MODE_ONLINE, BLACK, true);
        };
        this.game.network.onError = (err) => {
          alert(err);
          this._showNetworkChoice();
        };
        this.game.network.joinRoom(code);
      }
    });

    document.getElementById('btn-cancel-network').addEventListener('click', () => {
      if (this.game.network) this.game.network.disconnect();
      this._hideNetworkModal();
      this._showMenu();
    });

    // AI difficulty slider
    const slider = document.getElementById('ai-time');
    const sliderLabel = document.getElementById('ai-time-label');
    if (slider) {
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        sliderLabel.textContent = val < 1000 ? `${val}ms` : `${(val / 1000).toFixed(1)}s`;
        this.game.engine.setThinkTime(val);
      });
    }

    // Promotion modal
    document.querySelectorAll('.promo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = parseInt(btn.dataset.type);
        this._hidePromotion();
        this.game.promoteWith(type);
      });
    });

    // Close menu on overlay click
    document.getElementById('menu-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        if (this.game.moveList.length > 0) {
          this._hideMenu();
        }
      }
    });

    // Keyboard shortcuts
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

  /* ─── Game state update callback ───────────────────────── */
  _onGameUpdate() {
    // Render board
    this.renderer.render(this.game);

    // Calculate captured pieces material advantage
    const sortPieces = (arr) => {
      const order = { 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 };
      return [...arr].sort((a, b) => (order[pieceType(a)] || 9) - (order[pieceType(b)] || 9));
    };

    const whiteCap = sortPieces(this.game.capturedBlack); // Pieces white captured
    const blackCap = sortPieces(this.game.capturedWhite); // Pieces black captured

    const valMap = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9 };
    let whiteMatVal = 0, blackMatVal = 0;
    for (const p of this.game.capturedBlack) whiteMatVal += valMap[pieceType(p)] || 0;
    for (const p of this.game.capturedWhite) blackMatVal += valMap[pieceType(p)] || 0;
    const whiteAdv = whiteMatVal - blackMatVal;
    const blackAdv = blackMatVal - whiteMatVal;

    // Render captured pieces
    this.renderer.renderCaptured(
      whiteCap,
      blackCap,
      whiteAdv,
      blackAdv,
      'opponent-captured',
      'player-captured'
    );

    // Render move list
    this.renderer.renderMoveList(this.game.moveList, 'move-list');

    // Status texts
    const statusEl = document.getElementById('status-text');
    statusEl.textContent = this.game.getStatusText();

    const isWhiteTurn = this.game.board.turn === WHITE;
    
    // Player and opponent turn status
    const pStatus = document.getElementById('player-status');
    const oStatus = document.getElementById('opponent-status');
    const oName = document.getElementById('opponent-name');
    const oAvatar = document.getElementById('opponent-avatar');
    
    // Update opponent name and avatar based on mode
    if (this.game.mode === MODE_PVP || this.game.mode === 'online') {
      oName.textContent = "Đối thủ";
      oAvatar.textContent = "👤"; // Or another appropriate emoji like 🥷 or 🧑‍💻
    } else {
      oName.textContent = "Máy tính";
      oAvatar.textContent = "🤖";
    }

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

    // Status bar styling based on game state
    if (this.game.status === 'checkmate' || this.game.status === 'resign') {
      statusEl.classList.add('status-win');
      statusEl.classList.remove('status-draw');
    } else if (this.game.status.startsWith('draw') || this.game.status === 'stalemate' || this.game.status === 'insufficient' || this.game.status === 'repetition') {
      statusEl.classList.add('status-draw');
      statusEl.classList.remove('status-win');
    } else {
      statusEl.classList.remove('status-win', 'status-draw');
    }

    // Thinking indicator (Top/Bottom)
    const thinkingEl = document.getElementById('thinking-indicator');
    const oppThinking = document.getElementById('opponent-thinking');
    const pThinking = document.getElementById('player-thinking');
    
    thinkingEl.style.display = this.game.isThinking ? 'flex' : 'none';
    
    if (this.game.isThinking) {
       // Since only AI thinks in this implementation
       oppThinking.style.display = 'block';
       pThinking.style.display = 'none';
    } else {
       oppThinking.style.display = 'none';
       pThinking.style.display = 'none';
    }

    // Show search info
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

    // Promotion dialog
    if (this.game.pendingPromotion) {
      this._showPromotion();
    }

    // Game over effects
    if (this.game.status !== STATUS_PLAYING && !this.game.isThinking) {
      this._showGameOver();
    }
  }

  /* ─── Menu ─────────────────────────────────────────────── */
  _showMenu() {
    document.getElementById('menu-overlay').classList.add('active');
  }
  _hideMenu() {
    document.getElementById('menu-overlay').classList.remove('active');
  }

  /* ─── Network Modal ────────────────────────────────────── */
  _showNetworkChoice() {
    document.getElementById('network-overlay').classList.add('active');
    document.getElementById('network-choice-view').style.display = 'block';
    document.getElementById('network-waiting-view').style.display = 'none';
    document.getElementById('input-room-code').value = '';
  }

  _showNetworkWaiting(msg) {
    document.getElementById('network-choice-view').style.display = 'none';
    const waitingView = document.getElementById('network-waiting-view');
    waitingView.style.display = 'block';
    waitingView.querySelector('span').textContent = msg;
    document.getElementById('display-room-code').textContent = '...';
  }

  _hideNetworkModal() {
    document.getElementById('network-overlay').classList.remove('active');
  }

  /* ─── Promotion dialog ─────────────────────────────────── */
  _showPromotion() {
    document.getElementById('promotion-modal').classList.add('active');
  }
  _hidePromotion() {
    document.getElementById('promotion-modal').classList.remove('active');
  }

  /* ─── Game over ────────────────────────────────────────── */
  _showGameOver() {
    const el = document.getElementById('game-over-modal');
    const textEl = document.getElementById('game-over-text');
    textEl.textContent = this.game.getStatusText();
    
    // Add game stats
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
