/* ============================================================
 *  network.js — Network manager for online multiplayer (PeerJS)
 * ============================================================ */

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    
    // Callbacks
    this.onRoomCreated = null; // (roomId) => {}
    this.onConnected = null;   // (isHost) => {}
    this.onMoveReceived = null;// (moveObj) => {}
    this.onDisconnected = null;// () => {}
    this.onError = null;       // (errStr) => {}
  }

  _generateRoomId() {
    return 'CV-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // Create a new room (Host)
  createRoom() {
    this.isHost = true;
    const roomId = this._generateRoomId();
    
    // Disconnect old peer if any
    if (this.peer) this.peer.destroy();
    
    // Connect to PeerJS public server
    this.peer = new window.Peer(roomId);

    this.peer.on('open', (id) => {
      if (this.onRoomCreated) this.onRoomCreated(id);
    });

    this.peer.on('connection', (connection) => {
      // Allow only one connection
      if (this.conn && this.conn.open) {
        connection.close();
        return;
      }
      this._setupConnection(connection);
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError("Lỗi tạo phòng: " + err.message);
    });
  }

  // Join an existing room (Client)
  joinRoom(roomId) {
    this.isHost = false;
    
    if (this.peer) this.peer.destroy();
    
    // Client doesn't need a specific ID
    this.peer = new window.Peer();

    this.peer.on('open', () => {
      const connection = this.peer.connect(roomId, { reliable: true });
      this._setupConnection(connection);
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError("Lỗi kết nối: " + err.message);
    });
  }

  _setupConnection(connection) {
    this.conn = connection;

    this.conn.on('open', () => {
      if (this.onConnected) this.onConnected(this.isHost);
    });

    this.conn.on('data', (data) => {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        if (msg.type === 'MOVE') {
          if (this.onMoveReceived) this.onMoveReceived(msg.move);
        } else {
          if (this.onEventReceived) this.onEventReceived(msg.type, msg);
        }
      } catch (e) {
        console.error("Invalid data received:", data);
      }
    });

    this.conn.on('close', () => {
      this.conn = null;
      if (this.onDisconnected) this.onDisconnected();
    });

    this.conn.on('error', () => {
      this.conn = null;
      if (this.onDisconnected) this.onDisconnected();
    });
  }

  sendEvent(type, payload = null) {
    if (this.conn && this.conn.open) {
      this.conn.send({ type, ...payload });
    }
  }

  sendMove(moveObj) {
    this.sendEvent('MOVE', { move: moveObj });
  }

  disconnect() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
