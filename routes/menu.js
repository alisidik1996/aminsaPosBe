const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

// GET /api/menu?category=Makanan
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let result;
    if (category && category !== 'Semua') {
      result = await pool.query(
        'SELECT * FROM menu WHERE active=1 AND category=$1 ORDER BY id',
        [category]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM menu WHERE active=1 ORDER BY category, id'
      );
    }
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/menu/categories
router.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT category FROM menu WHERE active=1 ORDER BY category'
    );
    res.json(['Semua', ...rows.map(r => r.category)]);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM menu WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Menu tidak ditemukan.' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/menu/:id/stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0)
      return res.status(400).json({ error: 'Stok tidak valid.' });

    await pool.query('UPDATE menu SET stock=$1 WHERE id=$2', [stock, req.params.id]);
    const { rows } = await pool.query('SELECT * FROM menu WHERE id=$1', [req.params.id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/menu/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, price, category, station, stock, image, active } = req.body;
    await pool.query(
      'UPDATE menu SET name=$1, price=$2, category=$3, station=$4, stock=$5, image=$6, active=$7 WHERE id=$8',
      [name, price, category, station, stock, image, active ?? 1, req.params.id]
    );
    const { rows } = await pool.query('SELECT * FROM menu WHERE id=$1', [req.params.id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/menu
router.post('/', async (req, res) => {
  try {
    const { name, price, category, station, stock = 0, image = '' } = req.body;
    if (!name || !price || !category || !station)
      return res.status(400).json({ error: 'Field name, price, category, station wajib diisi.' });

    const { rows } = await pool.query(
      'INSERT INTO menu (name, price, category, station, stock, image) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, price, category, station, stock, image]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE menu SET active=0 WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
