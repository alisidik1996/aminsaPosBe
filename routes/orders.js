const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

async function getOrderItems(orderId) {
  const { rows } = await pool.query(
    'SELECT oi.*, m.image FROM order_items oi LEFT JOIN menu m ON m.id=oi.menu_id WHERE oi.order_id=$1 ORDER BY oi.id',
    [orderId]
  );
  return rows.map(i => ({
    id:      i.menu_id,
    name:    i.name,
    price:   i.price,
    station: i.station,
    qty:     i.qty,
    image:   i.image || '',
  }));
}

async function mapOrder(row) {
  if (!row) return null;
  return {
    id:        row.id,
    tableId:   row.table_id,
    kasirId:   row.kasir_id,
    kasirName: row.kasir_name,
    note:      row.note || '',
    status:    row.status,
    createdAt: row.created_at,
    items:     await getOrderItems(row.id),
  };
}

// GET /api/orders/table/:tableId — open
router.get('/table/:tableId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE table_id=$1 AND status='open' ORDER BY id DESC LIMIT 1`,
      [req.params.tableId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tidak ada order aktif.' });
    res.json(await mapOrder(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/orders/table/:tableId/active — open atau sent
router.get('/table/:tableId/active', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE table_id=$1 AND status IN ('open','sent') ORDER BY id DESC LIMIT 1`,
      [req.params.tableId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tidak ada order aktif.' });
    res.json(await mapOrder(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Order tidak ditemukan.' });
    res.json(await mapOrder(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const { tableId, kasirId, kasirName } = req.body;
    if (!tableId || !kasirId || !kasirName)
      return res.status(400).json({ error: 'tableId, kasirId, kasirName wajib diisi.' });

    const now = new Date().toISOString();
    const { rows } = await pool.query(
      `INSERT INTO orders (table_id, kasir_id, kasir_name, status, created_at)
       VALUES ($1,$2,$3,'open',$4) RETURNING *`,
      [tableId, kasirId, kasirName, now]
    );
    res.status(201).json(await mapOrder(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/orders/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status, note, items } = req.body;

    // Update status/note
    const fields = [];
    const vals   = [];
    let   idx    = 1;
    if (status !== undefined) { fields.push(`status=$${idx++}`); vals.push(status); }
    if (note   !== undefined) { fields.push(`note=$${idx++}`);   vals.push(note); }
    if (fields.length) {
      vals.push(req.params.id);
      await pool.query(`UPDATE orders SET ${fields.join(',')} WHERE id=$${idx}`, vals);
    }

    // Sync items
    if (items !== undefined) {
      await pool.query('DELETE FROM order_items WHERE order_id=$1', [req.params.id]);
      for (const item of (items || [])) {
        await pool.query(
          'INSERT INTO order_items (order_id, menu_id, name, price, station, qty) VALUES ($1,$2,$3,$4,$5,$6)',
          [req.params.id, item.id, item.name, item.price, item.station, item.qty]
        );
      }
    }

    const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    res.json(await mapOrder(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
