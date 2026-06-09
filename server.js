import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'tuyul_db',
  waitForConnections: true,
  connectionLimit: 10,
});

try {
  const [rows] = await db.query('SELECT 1');
  console.log('✅ MySQL connected');
} catch (err) {
  console.error('❌ MySQL connection failed:', err.message || err.code || err);
  process.exit(1);
}

// ==================== AUTH ROUTES ====================

app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username.trim(), hashedPassword]
    );
    const [rows] = await db.query('SELECT id, username, created_at FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Account created', user: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username, created_at: user.created_at },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== CHARACTER ROUTES ====================
// All routes scoped to user_id — each user sees only their own characters

app.get('/api/characters', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM characters WHERE user_id = ? ORDER BY id', [user_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

app.post('/api/characters', async (req, res) => {
  const { user_id, name, nimbus_coins } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO characters (user_id, name, nimbus_coins) VALUES (?, ?, ?)',
      [user_id, name, Number(nimbus_coins) || 0]
    );
    const [rows] = await db.query('SELECT * FROM characters WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/characters/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id, name, nimbus_coins, dungeon_done, hard_dungeon_done } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    // Ensure the character belongs to this user
    const [existing] = await db.query('SELECT id FROM characters WHERE id = ? AND user_id = ?', [id, user_id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    await db.query(
      'UPDATE characters SET name = ?, nimbus_coins = ?, dungeon_done = ?, hard_dungeon_done = ? WHERE id = ? AND user_id = ?',
      [name, Number(nimbus_coins) || 0, dungeon_done ? 1 : 0, hard_dungeon_done ? 1 : 0, id, user_id]
    );
    const [rows] = await db.query('SELECT * FROM characters WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/characters/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  try {
    const [result] = await db.query('DELETE FROM characters WHERE id = ? AND user_id = ?', [id, user_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/reset-dungeons', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  try {
    await db.query('UPDATE characters SET dungeon_done = 0, hard_dungeon_done = 0 WHERE user_id = ?', [user_id]);
    res.json({ message: 'All dungeons reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
