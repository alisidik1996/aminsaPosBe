const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });

    const { rows } = await pool.query(
      'SELECT id, username, name, role FROM users WHERE username=$1 AND password=$2',
      [username, password]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Username atau password salah.' });

    res.json({ user: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, role FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/users
router.post('/users', async (req, res) => {
  try {
    const { username, password, name, role = 'kasir' } = req.body;
    if (!username || !password || !name)
      return res.status(400).json({ error: 'username, password, name wajib diisi.' });

    const { rows } = await pool.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1,$2,$3,$4) RETURNING id, username, name, role',
      [username, password, name, role]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Username sudah digunakan.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (username !== undefined) { fields.push(`username=$${idx++}`); vals.push(username); }
    if (password)               { fields.push(`password=$${idx++}`); vals.push(password); }
    if (name     !== undefined) { fields.push(`name=$${idx++}`);     vals.push(name); }
    if (role     !== undefined) { fields.push(`role=$${idx++}`);     vals.push(role); }

    if (!fields.length) return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });

    vals.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(',')} WHERE id=$${idx}`, vals);
    const { rows } = await pool.query(
      'SELECT id, username, name, role FROM users WHERE id=$1', [req.params.id]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Username sudah digunakan.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
