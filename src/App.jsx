import { useState, useEffect } from 'react';
import './App.css';
import {
  signup,
  login,
  getCharacters,
  addCharacter,
  updateCharacter,
  deleteCharacter,
  resetDungeons,
} from './api';

/* ---------- helpers ---------- */
const sameId = (a, b) => String(a) === String(b);

const formatCoins = (n) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 100_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K';
  return n.toLocaleString();
};

/* ---------- auth page ---------- */
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'signup') {
        if (password !== confirm) {
          setError('Passwords do not match');
          setBusy(false);
          return;
        }
        await signup({ username: username.trim(), password });
        const res = await login({ username: username.trim(), password });
        onLogin(res.user);
      } else {
        const res = await login({ username: username.trim(), password });
        onLogin(res.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo-emoji">⚔️</span>
          <h2>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{mode === 'signup' ? 'Sign up to start tracking' : 'Sign in to your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="confirm">Confirm Password</label>
              <input id="confirm" type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          {mode === 'login' ? (
            <p>Don't have an account?{' '}<button className="link-btn" onClick={() => { setMode('signup'); setError(''); }}>Sign Up</button></p>
          ) : (
            <p>Already have an account?{' '}<button className="link-btn" onClick={() => { setMode('login'); setError(''); }}>Sign In</button></p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- main app ---------- */
function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tuyul_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('tuyul_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tuyul_user');
  };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return <Dashboard user={user} onLogout={handleLogout} />;
}

/* ---------- dashboard ---------- */
function Dashboard({ user, onLogout }) {
  const [tuyuls, setTuyuls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newCoins, setNewCoins] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const userId = user.id;

  useEffect(() => {
    getCharacters(userId).then(setTuyuls).catch((e) => alert(e.message)).finally(() => setLoading(false));
  }, [userId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { alert('Please enter a character name!'); return; }
    try {
      const created = await addCharacter({ user_id: userId, name: newName.trim(), nimbus_coins: Number(newCoins) || 0 });
      setTuyuls((p) => [...p, created]);
      setNewName(''); setNewCoins('');
    } catch (err) { alert(err.message); }
  };

  const handleToggleDungeon = async (tuyul) => {
    const updated = { ...tuyul, user_id: userId, dungeon_done: tuyul.dungeon_done ? 0 : 1 };
    try {
      const saved = await updateCharacter(tuyul.id, updated);
      setTuyuls((p) => p.map((t) => (sameId(t.id, tuyul.id) ? saved : t)));
    } catch (err) { alert(err.message); }
  };

  const handleToggleHardDungeon = async (tuyul) => {
    const updated = { ...tuyul, user_id: userId, hard_dungeon_done: tuyul.hard_dungeon_done ? 0 : 1 };
    try {
      const saved = await updateCharacter(tuyul.id, updated);
      setTuyuls((p) => p.map((t) => (sameId(t.id, tuyul.id) ? saved : t)));
    } catch (err) { alert(err.message); }
  };

  const handleUpdateCoins = async (tuyul, value) => {
    const coins = Math.max(0, Number(value) || 0);
    try {
      const saved = await updateCharacter(tuyul.id, { ...tuyul, user_id: userId, nimbus_coins: coins });
      setTuyuls((p) => p.map((t) => (sameId(t.id, tuyul.id) ? saved : t)));
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (tuyul) => {
    if (!window.confirm(`Delete "${tuyul.name}"?`)) return;
    try {
      await deleteCharacter(tuyul.id, { user_id: userId });
      setTuyuls((p) => p.filter((t) => !sameId(t.id, tuyul.id)));
    } catch (err) { alert(err.message); }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all dungeons?')) return;
    try {
      await resetDungeons({ user_id: userId });
      setTuyuls((p) => p.map((t) => ({ ...t, dungeon_done: 0, hard_dungeon_done: 0 })));
    } catch (err) { alert(err.message); }
  };

  const startEdit = (id, name) => { setEditingId(id); setEditValue(name); };
  const cancelEdit = () => { setEditingId(null); setEditValue(''); };
  const saveEdit = async (tuyul) => {
    if (!editValue.trim()) { cancelEdit(); return; }
    try {
      const saved = await updateCharacter(tuyul.id, { ...tuyul, user_id: userId, name: editValue.trim() });
      setTuyuls((p) => p.map((t) => (sameId(t.id, tuyul.id) ? saved : t)));
    } catch (err) { alert(err.message); }
    cancelEdit();
  };

  const total = tuyuls.length;
  const normalDone = tuyuls.filter((t) => t.dungeon_done).length;
  const hardDone = tuyuls.filter((t) => t.hard_dungeon_done).length;
  const coins = tuyuls.reduce((s, t) => s + Number(t.nimbus_coins || 0), 0);

  // row is "done" only when BOTH dungeons are checked
  const rowDone = (t) => t.dungeon_done && t.hard_dungeon_done;

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="logo-emoji">⚔️</span>
          <div>
            <h1>Tuyul Data Tracker</h1>
            <p className="subtitle">Optimize your daily game routine</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="user-badge">👤 {user.username}</span>
          <button onClick={onLogout} className="btn btn-outline">Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* stats */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info"><h3>{total}</h3><p>Total Clones</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚔️</div>
            <div className="stat-info"><h3>{normalDone} / {total}</h3><p>Normal Dungeon</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-info"><h3>{hardDone} / {total}</h3><p>Hard Dungeon</p></div>
          </div>
          <div className="stat-card gold">
            <div className="stat-icon">💰</div>
            <div className="stat-info"><h3>{formatCoins(coins)}</h3><p>Total Nimbus Coins</p></div>
          </div>
        </section>

        {/* add form */}
        <section className="actions-bar">
          <form onSubmit={handleAdd} className="add-tuyul-form">
            <input type="text" placeholder="Character Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="form-input" required />
            <input type="number" placeholder="Nimbus Coins" value={newCoins} onChange={(e) => setNewCoins(e.target.value)} className="form-input" min="0" />
            <button type="submit" className="btn btn-primary">+ Add Character</button>
          </form>
          <button type="button" onClick={handleReset} className="btn btn-danger" disabled={total === 0}>🔄 Reset All Dungeons</button>
        </section>

        {/* table */}
        <section className="table-container">
          {loading ? (
            <div className="empty-state"><p>Loading…</p></div>
          ) : total === 0 ? (
            <div className="empty-state">
              <span className="empty-emoji">🏜️</span>
              <h3>No characters tracked yet</h3>
              <p>Add your first clones character above!</p>
            </div>
          ) : (
            <table className="tuyul-table">
              <thead>
                <tr>
                  <th>Character Name</th>
                  <th className="text-center">Normal Dungeon</th>
                  <th className="text-center">Hard Dungeon</th>
                  <th>Nimbus Coins</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tuyuls.map((t) => (
                  <tr key={t.id} className={rowDone(t) ? 'row-done' : ''}>
                    <td data-label="Name">
                      {editingId !== null && sameId(editingId, t.id) ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(t)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') cancelEdit(); }}
                          className="table-name-input"
                          autoFocus
                        />
                      ) : (
                        <span className="char-name" onDoubleClick={() => startEdit(t.id, t.name)} title="Double-click to edit">
                          {t.name}
                        </span>
                      )}
                    </td>
                    <td data-label="Normal" className="text-center">
                      <label className="checkbox-container">
                        <input type="checkbox" checked={!!t.dungeon_done} onChange={() => handleToggleDungeon(t)} />
                        <span className="checkmark" />
                      </label>
                    </td>
                    <td data-label="Hard" className="text-center">
                      <label className="checkbox-container">
                        <input type="checkbox" checked={!!t.hard_dungeon_done} onChange={() => handleToggleHardDungeon(t)} />
                        <span className="checkmark hard" />
                      </label>
                    </td>
                    <td data-label="Coins">
                      <input type="number" value={t.nimbus_coins || 0} onChange={(e) => handleUpdateCoins(t, e.target.value)} className="table-input coins-input" min="0" />
                    </td>
                    <td data-label="Actions" className="text-center">
                      <button onClick={() => handleDelete(t)} className="btn-icon btn-delete" title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      <div className="ticks" />
      <footer className="app-footer"><p>Built with ❤️ for tracking daily farming routines.</p></footer>
    </div>
  );
}

export default App;
