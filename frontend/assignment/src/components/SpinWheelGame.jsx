import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import SpinWheelVisual from './SpinWheelVisual';
import ParticipantList from './ParticipantList';

const API = 'https://roxstar-backend.onrender.com/api';
const socket = io('https://roxstar-backend.onrender.com')

export default function SpinWheelGame({ user, onCoinsUpdate }) {
  const [wheelId, setWheelId] = useState('');
  const [wheelData, setWheelData] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [participants, setParticipants] = useState([]);
  const [winnerPool, setWinnerPool] = useState(0);
  const [adminPool, setAdminPool] = useState(0);
  const [appPool, setAppPool] = useState(0);
  const [entryFee, setEntryFee] = useState(50);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [winnerId, setWinnerId] = useState(null);
  const [winnerUsername, setWinnerUsername] = useState('');
  const [showGameOver, setShowGameOver] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinWheelInput, setJoinWheelInput] = useState('');
  const [history, setHistory] = useState([]);
  const tickerRef = useRef(null);
  const countdownRef = useRef(null);

  const isAdmin = user.role === 'ADMIN';

  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    setLogs(prev => [{ message, type, time }, ...prev]);
  }, []);

  // Fetch active wheel on mount
  useEffect(() => {
    fetchActiveWheel();
    fetchHistory();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (wheelId) {
      socket.emit('join_room', { wheelId });
    }

    socket.on('wheel_created', (data) => {
      addLog(`New game room created! Entry: ${data.entryFee} coins`, 'info');
      fetchActiveWheel();
    });

    socket.on('user_joined', (data) => {
      setWinnerPool(data.currentPool);
      setParticipants(data.participants || []);
      addLog(`${data.username || data.userId.substring(0, 8)} joined the arena`, 'join');
    });

    socket.on('game_started', (data) => {
      setStatus('ACTIVE');
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setCountdown(null);
      addLog('The wheel is now spinning! Eliminations starting...', 'info');
    });

    socket.on('user_eliminated', (data) => {
      setParticipants(prev =>
        prev.map(p => p.userId === data.userId ? { ...p, isEliminated: true } : p)
      );
      const eliminatedName = participants.find(p => p.userId === data.userId)?.username || data.userId.substring(0, 8);
      addLog(`${eliminatedName} has been eliminated!`, 'eliminate');
    });

    socket.on('game_over', (data) => {
      const winnerName = participants.find(p => p.userId === data.winnerId)?.username || data.winnerId.substring(0, 8);
      setWinnerId(data.winnerId);
      setWinnerUsername(winnerName);
      setStatus('COMPLETED');
      addLog(`Game Over! ${winnerName} wins the prize pool!`, 'winner');
      setShowGameOver(true);

      // Refresh user data
      refreshUser();
      fetchHistory();
    });

    socket.on('game_aborted', (data) => {
      setStatus('IDLE');
      setWheelId('');
      setWheelData(null);
      setParticipants([]);
      setWinnerPool(0);
      setAdminPool(0);
      setAppPool(0);
      setHasJoined(false);
      setCountdown(null);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      addLog(data.message || 'Game aborted. Coins refunded.', 'abort');
      refreshUser();
    });

    return () => {
      socket.off('wheel_created');
      socket.off('user_joined');
      socket.off('game_started');
      socket.off('user_eliminated');
      socket.off('game_over');
      socket.off('game_aborted');
    };
  }, [wheelId, participants]);

  // Auto-scroll ticker
  useEffect(() => {
    if (tickerRef.current) {
      tickerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const refreshUser = async () => {
    try {
      const res = await fetch(`${API}/users/${user.id}`);
      const data = await res.json();
      if (data.coins !== undefined) {
        onCoinsUpdate(data.coins);
      }
    } catch (e) { /* ignore */ }
  };

  const fetchActiveWheel = async () => {
    try {
      const res = await fetch(`${API}/wheel/active`);
      const data = await res.json();
      if (data && data.id) {
        setWheelId(data.id);
        setWheelData(data);
        setStatus(data.status);
        setEntryFee(data.entryFee);
        setWinnerPool(data.winnerPool);
        setAdminPool(data.adminPool);
        setAppPool(data.appPool);

        const parts = (data.participants || []).map(p => ({
          userId: p.userId,
          username: p.user?.username || p.userId.substring(0, 8),
          isEliminated: p.isEliminated
        }));
        setParticipants(parts);

        const userJoined = parts.some(p => p.userId === user.id);
        setHasJoined(userJoined);

        // Start countdown if INITIALIZED
        if (data.status === 'INITIALIZED' && data.createdAt) {
          startCountdown(data.createdAt);
        }

        socket.emit('join_room', { wheelId: data.id });
      }
    } catch (e) { /* ignore */ }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/wheel/history`);
      const data = await res.json();
      setHistory(data || []);
    } catch (e) { /* ignore */ }
  };

  const startCountdown = (createdAt) => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    const created = new Date(createdAt).getTime();
    const deadline = created + 3 * 60 * 1000; // 3 minutes

    countdownRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 1000);
  };

  const formatCountdown = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const initializeGame = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/wheel/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: user.id })
      });
      const data = await res.json();
      if (data.id) {
        setWheelId(data.id);
        setWheelData(data);
        setStatus('INITIALIZED');
        setEntryFee(data.entryFee);
        setWinnerPool(0);
        setAdminPool(0);
        setAppPool(0);
        setParticipants([]);
        setWinnerId(null);
        setShowGameOver(false);
        setHasJoined(false);
        addLog(`Admin initialized game room. Entry fee: ${data.entryFee} coins`, 'info');
        socket.emit('join_room', { wheelId: data.id });
        startCountdown(data.createdAt);
      } else {
        addLog(`Error: ${data.error}`, 'abort');
      }
    } catch (err) {
      addLog('Failed to initialize game', 'abort');
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (targetWheelId) => {
    const wId = targetWheelId || wheelId;
    if (!wId) {
      addLog('No wheel ID provided', 'abort');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/wheel/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, wheelId: wId })
      });
      const data = await res.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, 'abort');
      } else {
        setWheelId(wId);
        setHasJoined(true);
        if (data.updatedUser) {
          onCoinsUpdate(data.updatedUser.coins);
        }
        addLog(`You joined the arena! Entry fee: ${entryFee} coins deducted.`, 'join');
        socket.emit('join_room', { wheelId: wId });

        // Update wheel data
        if (data.updatedWheel) {
          setWinnerPool(data.updatedWheel.winnerPool);
          setAdminPool(data.updatedWheel.adminPool);
          setAppPool(data.updatedWheel.appPool);
        }
      }
    } catch (err) {
      addLog('Failed to join game', 'abort');
    } finally {
      setLoading(false);
    }
  };

  const manualStart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/wheel/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: user.id, wheelId })
      });
      const data = await res.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, 'abort');
      } else {
        addLog('Admin triggered manual start!', 'info');
      }
    } catch (err) {
      addLog('Failed to start game', 'abort');
    } finally {
      setLoading(false);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(wheelId);
    addLog('Room ID copied to clipboard', 'info');
  };

  const resetGame = () => {
    setShowGameOver(false);
    setWheelId('');
    setWheelData(null);
    setStatus('IDLE');
    setParticipants([]);
    setWinnerPool(0);
    setAdminPool(0);
    setAppPool(0);
    setEntryFee(50);
    setWinnerId(null);
    setWinnerUsername('');
    setHasJoined(false);
    setCountdown(null);
    fetchActiveWheel();
    fetchHistory();
  };

  // ===== RENDER NO ACTIVE GAME =====
  if (status === 'IDLE' && !wheelId) {
    return (
      <div className="no-game-container">
        <div className="empty-state">
          <span className="empty-icon" style={{ fontSize: '2.5rem', letterSpacing: '-0.05em' }}>SPIN</span>
          <h3>No Active Game</h3>
          <p>
            {isAdmin
              ? 'Create a new spin wheel room to start the action!'
              : 'Waiting for an admin to create a game room. You can also join using a Room ID.'}
          </p>

          {isAdmin && (
            <button className="btn btn-primary btn-lg" onClick={initializeGame} disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Create Game Room'}
            </button>
          )}

          {!isAdmin && (
            <div style={{ display: 'flex', gap: '10px', maxWidth: '400px', width: '100%' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Paste Room ID to join..."
                value={joinWheelInput}
                onChange={(e) => setJoinWheelInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (joinWheelInput.trim()) {
                    setWheelId(joinWheelInput.trim());
                    socket.emit('join_room', { wheelId: joinWheelInput.trim() });
                    fetchActiveWheel();
                  }
                }}
                disabled={!joinWheelInput.trim()}
              >
                Find
              </button>
            </div>
          )}
        </div>

        {/* Game History */}
        {history.length > 0 && (
          <div className="history-section" style={{ width: '100%', maxWidth: '600px' }}>
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Recent Games</h3>
            <div className="history-grid">
              {history.slice(0, 5).map(h => {
                const winner = h.participants?.find(p => !p.isEliminated);
                return (
                  <div key={h.id} className="history-item">
                    <div className="history-item-info">
                      <span className="history-item-players">
                        {h.participants?.length || 0} players · {h.status === 'COMPLETED' ? 'Completed' : 'Aborted'}
                      </span>
                      {winner && (
                        <span className="history-item-winner">
                          Winner: {winner.user?.username || 'Unknown'}
                        </span>
                      )}
                    </div>
                    {h.status === 'COMPLETED' && (
                      <span className="history-item-amount">{h.winnerPool} coins</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ticker always visible */}
        {logs.length > 0 && (
          <div className="card ticker-section" style={{ width: '100%', maxWidth: '600px', marginTop: '24px' }}>
            <div className="ticker-box">
              <div className="ticker-header">
                <span className="ticker-dot"></span>
                <h4>Activity Feed</h4>
              </div>
              <div className="ticker-feed" ref={tickerRef}>
                {logs.map((log, i) => (
                  <div key={i} className={`ticker-entry event-${log.type}`}>
                    <span className="ticker-time">{log.time}</span>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== RENDER ACTIVE GAME =====
  return (
    <div>
      {/* Game Over Overlay */}
      {showGameOver && (
        <div className="game-over-overlay" onClick={() => setShowGameOver(false)}>
          <div className="game-over-card" onClick={e => e.stopPropagation()}>
            <span className="confetti-emoji" style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>GG!</span>
            <h2>{winnerId === user.id ? 'You Won!' : 'Game Over!'}</h2>
            <div className="winner-name">
              Winner: {winnerUsername || 'Unknown'}
            </div>
            <div className="winner-amount">
              Won {winnerPool} coins from the prize pool
            </div>
            <button className="btn btn-primary btn-lg btn-full" onClick={resetGame}>
              {isAdmin ? 'New Game' : 'Back to Lobby'}
            </button>
          </div>
        </div>
      )}

      <div className="game-layout">
        {/* LEFT COLUMN - Wheel & Pool */}
        <div>
          {/* Room Header */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Spin Wheel Arena</div>
                <div className="card-subtitle">
                  {status === 'INITIALIZED' ? 'Waiting for players...' :
                    status === 'ACTIVE' ? 'Game in progress!' :
                      status === 'COMPLETED' ? 'Game finished!' : 'Loading...'}
                </div>
              </div>
              <span className={`status-badge status-${status.toLowerCase()}`}>
                {status}
              </span>
            </div>

            {wheelId && (
              <div className="room-id-display">
                <span className="room-id-label">Room ID</span>
                <span className="room-id-value">{wheelId}</span>
                <button className="copy-btn" onClick={copyRoomId} title="Copy Room ID">Copy</button>
              </div>
            )}

            <div className="entry-fee-badge" style={{ marginTop: '12px' }}>
              Entry Fee: {entryFee} coins
            </div>
          </div>

          {/* Countdown Timer */}
          {status === 'INITIALIZED' && countdown !== null && (
            <div className="countdown-display">
              <div className="countdown-label">Auto-start / abort in</div>
              <div className="countdown-value">{formatCountdown(countdown)}</div>
            </div>
          )}

          {/* Spin Wheel Visual */}
          <div className="card">
            <SpinWheelVisual
              participants={participants}
              status={status}
              winnerId={winnerId}
            />
          </div>

          {/* Prize Pool */}
          <div className="pool-display" style={{ marginTop: '20px' }}>
            <div className="pool-label">Prize Pool</div>
            <div className="pool-amount">
              <span className="coin-emoji" style={{ fontWeight: 800, color: 'var(--accent-gold-light)' }}>$</span>
              {winnerPool + adminPool + appPool}
            </div>
            <div className="pool-breakdown">
              <div className="pool-item">
                <div className="pool-item-label">Winner</div>
                <div className="pool-item-value winner">{winnerPool}</div>
              </div>
              <div className="pool-item">
                <div className="pool-item-label">Admin</div>
                <div className="pool-item-value admin">{adminPool}</div>
              </div>
              <div className="pool-item">
                <div className="pool-item-label">Platform</div>
                <div className="pool-item-value app">{appPool}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="controls-section">
            {/* User Join Controls */}
            {!isAdmin && status === 'INITIALIZED' && !hasJoined && (
              <button className="btn btn-gold btn-lg btn-full" onClick={() => joinGame()} disabled={loading}>
                {loading ? <span className="spinner"></span> : `Pay ${entryFee} Coins & Join`}
              </button>
            )}

            {!isAdmin && hasJoined && status === 'INITIALIZED' && (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--status-active)', fontWeight: 600, fontSize: '0.9rem' }}>
                You've joined! Waiting for game to start...
              </div>
            )}

            {/* Admin Controls */}
            {isAdmin && status === 'INITIALIZED' && (
              <button className="btn btn-danger btn-lg btn-full" onClick={manualStart} disabled={loading || participants.length < 3}>
                {loading ? <span className="spinner"></span> : `Force Start Game (${participants.length}/3 min)`}
              </button>
            )}

            {status === 'COMPLETED' && (
              <button className="btn btn-primary btn-lg btn-full" onClick={resetGame}>
                {isAdmin ? 'Create New Game' : 'Back to Lobby'}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Participants & Ticker */}
        <div>
          <ParticipantList
            participants={participants}
            currentUserId={user.id}
            winnerId={winnerId}
          />

          <div className="card ticker-section" style={{ marginTop: '20px' }}>
            <div className="ticker-box">
              <div className="ticker-header">
                <span className="ticker-dot"></span>
                <h4>Live Event Feed</h4>
              </div>
              <div className="ticker-feed" ref={tickerRef}>
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Waiting for events...
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`ticker-entry event-${log.type}`}>
                      <span className="ticker-time">{log.time}</span>
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}