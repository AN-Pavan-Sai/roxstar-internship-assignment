import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function SpinWheelGame({ userId, isAdmin }) {
  const [wheelId, setWheelId] = useState('');
  const [status, setStatus] = useState('IDLE'); 
  const [winnerPool, setWinnerPool] = useState(0);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (wheelId) {
      socket.emit('join_room', { wheelId });
    }

    socket.on('user_joined', (data) => {
      setWinnerPool(data.currentPool);
      setLogs((prev) => [...prev, `👤 User ${data.userId} joined the room.`]);
    });

    socket.on('game_started', (data) => {
      setStatus('ACTIVE');
      setLogs((prev) => [...prev, data.message]);
    });

    socket.on('user_eliminated', (data) => {
      setLogs((prev) => [...prev, `User ${data.userId} has been eliminated!`]);
      if (data.userId === userId) setStatus('ELIMINATED');
    });

    socket.on('game_over', (data) => {
      setStatus(data.winnerId === userId ? 'WINNER' : 'COMPLETED');
      setLogs((prev) => [...prev, `Game Over! Winner: User ${data.winnerId}`]);
    });

    socket.on('game_aborted', (data) => {
      setStatus('IDLE');
      setLogs((prev) => [...prev, data.message]);
    });

    return () => {
      socket.off('user_joined');
      socket.off('game_started');
      socket.off('user_eliminated');
      socket.off('game_over');
      socket.off('game_aborted');
    };
  }, [wheelId, userId]);

  const initializeGame = async () => {
    const res = await fetch('http://localhost:3001/api/wheel/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId: userId })
    });
    const data = await res.json();
    if (data.id) {
      setWheelId(data.id);
      setStatus('INITIALIZED');
    } else {
      alert(data.error);
    }
  };

  const joinGame = async () => {
    const res = await fetch('http://localhost:3001/api/wheel/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, wheelId })
    });
    const data = await res.json();
    if (data.error) alert(data.error);
  };

  const manuallyStartGame = async () => {
    const res = await fetch('http://localhost:3001/api/wheel/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId: userId, wheelId })
    });
    const data = await res.json();
    if (data.error) alert(data.error);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px' }}>
      <h3>🎡 Spin Wheel Matchroom</h3>
      <p>Room ID: <code>{wheelId || 'None'}</code></p>
      <p>Your Status: <strong>{status}</strong></p>
      <h4>Active Winner Pool: {winnerPool} Coins</h4>

      <div style={{ margin: '15px 0' }}>
        {isAdmin && status === 'IDLE' && (
          <button onClick={initializeGame}>Initialize Room (Admin)</button>
        )}
        
        {!isAdmin && status === 'IDLE' && (
          <input 
            type="text" 
            placeholder="Paste Wheel Room ID" 
            onChange={(e) => setWheelId(e.target.value)} 
          />
        )}

        {wheelId && status === 'INITIALIZED' && !isAdmin && (
          <button onClick={joinGame}>Pay Entry Fee & Join</button>
        )}

        {isAdmin && status === 'INITIALIZED' && (
          <button onClick={manuallyStartGame}>Force Start (Admin)</button>
        )}
      </div>

      <div style={{ background: '#333', color: '#fff', padding: '10px', height: '150px', overflowY: 'auto' }}>
        <h5>Live Room Feed Ticker</h5>
        {logs.map((log, index) => <p key={index} style={{ margin: '3px 0', fontSize: '13px' }}>{log}</p>)}
      </div>
    </div>
  );
}