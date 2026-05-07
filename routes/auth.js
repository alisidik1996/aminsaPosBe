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

module.exports = router;
