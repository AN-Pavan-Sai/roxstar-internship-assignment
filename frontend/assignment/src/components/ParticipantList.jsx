export default function ParticipantList({ participants = [], currentUserId, winnerId }) {
  if (participants.length === 0) {
    return (
      <div className="card participants-section">
        <div className="card-header">
          <div>
            <div className="card-title">Participants</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          No players have joined yet
        </div>
      </div>
    );
  }

  // Sort: winner first, then active, then eliminated
  const sorted = [...participants].sort((a, b) => {
    if (winnerId) {
      if (a.userId === winnerId) return -1;
      if (b.userId === winnerId) return 1;
    }
    if (a.isEliminated && !b.isEliminated) return 1;
    if (!a.isEliminated && b.isEliminated) return -1;
    return 0;
  });

  return (
    <div className="card participants-section">
      <div className="participants-header">
        <div className="card-title">Players</div>
        <div className="participants-count">
          <strong>{participants.filter(p => !p.isEliminated).length}</strong> / {participants.length} alive
        </div>
      </div>

      <div className="participants-grid">
        {sorted.map((p) => {
          const isYou = p.userId === currentUserId;
          const isWinner = p.userId === winnerId;
          const avatarLetter = (p.username || p.userId || '?')[0];

          let rowClass = 'participant-row';
          if (isWinner) rowClass += ' winner';
          else if (p.isEliminated) rowClass += ' eliminated';
          if (isYou) rowClass += ' is-you';

          let statusLabel = 'active';
          let statusClass = 'active';
          if (isWinner) { statusLabel = 'winner'; statusClass = 'winner'; }
          else if (p.isEliminated) { statusLabel = 'eliminated'; statusClass = 'eliminated'; }

          return (
            <div key={p.userId} className={rowClass}>
              <div className="participant-avatar" style={isWinner ? { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' } : {}}>
                {avatarLetter}
              </div>
              <div className="participant-info">
                <div className="participant-name">
                  {p.username || p.userId.substring(0, 8)}
                  {isYou && <span className="you-tag">(you)</span>}
                </div>
              </div>
              <span className={`participant-status ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
