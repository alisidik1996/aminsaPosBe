const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

function mapTable(row) {
  return {
    id:       row.id,
    name:     row.name,
    status:   row.status,
    openedAt: row.opened_at || null,
    kasirId:  row.kasir_id  || null,
  };
}

// GET /api/tables
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tables_pos ORDER BY id');
    res.json(rows.map(mapTable));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/tables/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tables_pos WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Meja tidak ditemukan.' });
    res.json(mapTable(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/tables/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status, openedAt, kasirId } = req.body;
    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (status   !== undefined) { fields.push(`status=$${idx++}`);    vals.push(status); }
    if (openedAt !== undefined) { fields.push(`opened_at=$${idx++}`); vals.push(openedAt); }
    if (kasirId  !== undefined) { fields.push(`kasir_id=$${idx++}`);  vals.push(kasirId); }

    if (!fields.length)
      return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });

    vals.push(req.params.id);
    await pool.query(
      `UPDATE tables_pos SET ${fields.join(',')} WHERE id=$${idx}`,
      vals
    );
    const { rows } = await pool.query('SELECT * FROM tables_pos WHERE id=$1', [req.params.id]);
    res.json(mapTable(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
