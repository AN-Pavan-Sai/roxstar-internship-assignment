import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import SpinWheelGame from './components/SpinWheelGame';

export default function App() {
  const [user, setUser] = useState(null);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('roxstar_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        // Refresh user data from server
        fetch(`${import.meta.env.VITE_API_URL}/api/users/${parsed.id}`)
          .then(r => r.json())
          .then(data => {
            if (data && data.id) {
              setUser(data);
              localStorage.setItem('roxstar_user', JSON.stringify(data));
            }
          })
          .catch(() => {}); // Silent fail if server not ready
      } catch { /* ignore */ }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('roxstar_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('roxstar_user');
  };

  const handleCoinsUpdate = (newCoins) => {
    setUser(prev => {
      const updated = { ...prev, coins: newCoins };
      localStorage.setItem('roxstar_user', JSON.stringify(updated));
      return updated;
    });
  };

  // Not logged in => Show Login Screen
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Logged in => Show Game
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          Roxstar Arena
          <span>Spin & Win</span>
        </div>

        <div className="user-info">
          {user.role === 'ADMIN' && (
            <span className="user-role-badge">Admin</span>
          )}
          <div className="user-details">
            <div className="user-name">{user.username}</div>
            <div className="user-coins">
              <span className="coin-icon">$</span>
              {user.coins?.toLocaleString() || 0} coins
            </div>
          </div>
          <div className="user-avatar">
            {user.username[0]}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        <SpinWheelGame user={user} onCoinsUpdate={handleCoinsUpdate} />
      </main>
    </div>
  );
}