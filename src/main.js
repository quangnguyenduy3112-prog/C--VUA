/* ============================================================
 *  main.js — Application entry point
 * ============================================================ */

import { UI } from './ui.js';

// Initialize the application immediately since type="module" is deferred
window.chessApp = new UI();
