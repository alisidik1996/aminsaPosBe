const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

async function getAllItems(orderIds) {
  if (!orderIds || !orderIds.length) return [];

  const merged = {};
  for (const oid of orderIds) {
    const { rows } = await pool.query(
      'SELECT oi.*, m.image FROM order_items oi LEFT JOIN menu m ON m.id=oi.menu_id WHERE oi.order_id=$1 ORDER BY oi.id',
      [oid]
    );
    rows.forEach(i => {
      const key = i.menu_id;
      if (merged[key]) {
        merged[key].qty += i.qty;
      } else {
        merged[key] = {
          id:      i.menu_id,
          name:    i.name,
          price:   i.price,
          station: i.station,
          qty:     i.qty,
          image:   i.image || '',
        };
      }
    });
  }
  return Object.values(merged);
}

async function mapBill(row) {
  if (!row) return null;

  // order_ids adalah JSONB array di PostgreSQL
  let orderIds = row.order_ids || [];
  if (!orderIds.length && row.order_id) orderIds = [row.order_id];

  const items    = await getAllItems(orderIds);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = Math.round(subtotal * 0.1);
  const total    = subtotal + tax;

  return {
    id:            row.id,
    orderId:       row.order_id,
    orderIds,
    tableId:       row.table_id,
    tableName:     row.table_name,
    subtotal,
    tax,
    total,
    note:          row.note || '',
    status:        row.status,
    kasirId:       row.kasir_id,
    kasirName:     row.kasir_name,
    createdAt:     row.created_at,
    paidAt:        row.paid_at || null,
    paymentMethod: row.payment_method || null,
    paymentDetail: row.payment_detail || null,
    items,
  };
}

// GET /api/bills/order/:orderId
router.get('/order/:orderId', async (req, res) => {
  try {
    const id = parseInt(req.params.orderId);
    const { rows } = await pool.query(
      `SELECT * FROM bills
       WHERE (order_id=$1 OR order_ids @> $2::jsonb)
       AND status='unpaid'
       ORDER BY id DESC LIMIT 1`,
      [id, JSON.stringify([id])]
    );
    if (!rows.length) return res.status(404).json({ error: 'Bill tidak ditemukan.' });
    res.json(await mapBill(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/bills/table/:tableId
router.get('/table/:tableId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM bills WHERE table_id=$1 AND status='unpaid' ORDER BY id DESC LIMIT 1`,
      [req.params.tableId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tidak ada bill aktif.' });
    res.json(await mapBill(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/bills/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bills WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Bill tidak ditemukan.' });
    res.json(await mapBill(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/bills
router.post('/', async (req, res) => {
  try {
    const { orderId, tableId, tableName, items, note = '', kasirId, kasirName } = req.body;
    if (!orderId || !tableId || !tableName || !items || !kasirId || !kasirName)
      return res.status(400).json({ error: 'Field wajib: orderId, tableId, tableName, items, kasirId, kasirName.' });

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const tax      = Math.round(subtotal * 0.1);
    const total    = subtotal + tax;
    const now      = new Date().toISOString();
    const orderIds = JSON.stringify([orderId]);

    const { rows } = await pool.query(
      `INSERT INTO bills
        (order_id, order_ids, table_id, table_name, subtotal, tax, total, note, status, kasir_id, kasir_name, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'unpaid',$9,$10,$11) RETURNING *`,
      [orderId, orderIds, tableId, tableName, subtotal, tax, total, note, kasirId, kasirName, now]
    );
    res.status(201).json(await mapBill(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/bills/:id/add-order
router.post('/:id/add-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId wajib diisi.' });

    const { rows: billRows } = await pool.query('SELECT * FROM bills WHERE id=$1', [req.params.id]);
    if (!billRows.length) return res.status(404).json({ error: 'Bill tidak ditemukan.' });
    const bill = billRows[0];
    if (bill.status === 'paid') return res.status(400).json({ error: 'Bill sudah dibayar.' });

    let orderIds = bill.order_ids || [];
    if (!orderIds.length) orderIds = [bill.order_id];
    if (!orderIds.includes(orderId)) orderIds.push(orderId);

    const items    = await getAllItems(orderIds);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const tax      = Math.round(subtotal * 0.1);
    const total    = subtotal + tax;

    await pool.query(
      'UPDATE bills SET order_ids=$1, subtotal=$2, tax=$3, total=$4 WHERE id=$5',
      [JSON.stringify(orderIds), subtotal, tax, total, req.params.id]
    );

    const { rows } = await pool.query('SELECT * FROM bills WHERE id=$1', [req.params.id]);
    res.json(await mapBill(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/bills/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status, paidAt, paymentMethod, paymentDetail } = req.body;
    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (status        !== undefined) { fields.push(`status=$${idx++}`);         vals.push(status); }
    if (paidAt        !== undefined) { fields.push(`paid_at=$${idx++}`);        vals.push(paidAt); }
    if (paymentMethod !== undefined) { fields.push(`payment_method=$${idx++}`); vals.push(paymentMethod); }
    if (paymentDetail !== undefined) { fields.push(`payment_detail=$${idx++}`); vals.push(JSON.stringify(paymentDetail)); }

    if (!fields.length) return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });

    vals.push(req.params.id);
    await pool.query(`UPDATE bills SET ${fields.join(',')} WHERE id=$${idx}`, vals);

    const { rows } = await pool.query('SELECT * FROM bills WHERE id=$1', [req.params.id]);
    res.json(await mapBill(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
