const pool = require('../config/db');

async function getAllItems(orderIds) {
  if (!orderIds?.length) return [];
  const merged = {};
  for (const oid of orderIds) {
    const { rows } = await pool.query(
      'SELECT oi.*, m.image FROM order_items oi LEFT JOIN menu m ON m.id=oi.menu_id WHERE oi.order_id=$1 ORDER BY oi.id',
      [oid]
    );
    rows.forEach(i => {
      if (merged[i.menu_id]) merged[i.menu_id].qty += i.qty;
      else merged[i.menu_id] = { id: i.menu_id, name: i.name, price: i.price, station: i.station, qty: i.qty, image: i.image || '' };
    });
  }
  return Object.values(merged);
}

async function mapBill(row) {
  if (!row) return null;
  let orderIds = row.order_ids || [];
  if (!orderIds.length && row.order_id) orderIds = [row.order_id];
  const items    = await getAllItems(orderIds);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = Math.round(subtotal * 0.1);
  return {
    id: row.id, orderId: row.order_id, orderIds,
    tableId: row.table_id, tableName: row.table_name,
    subtotal, tax, total: subtotal + tax,
    note: row.note || '', status: row.status,
    kasirId: row.kasir_id, kasirName: row.kasir_name,
    createdAt: row.created_at, paidAt: row.paid_at || null,
    paymentMethod: row.payment_method || null,
    paymentDetail: row.payment_detail || null,
    items,
  };
}

const BillModel = {
  findByOrder: async (orderId) => {
    const id = parseInt(orderId);
    const { rows } = await pool.query(
      "SELECT * FROM bills WHERE (order_id=$1 OR order_ids @> $2::jsonb) AND status='unpaid' ORDER BY id DESC LIMIT 1",
      [id, JSON.stringify([id])]
    );
    return mapBill(rows[0] || null);
  },

  findByTable: async (tableId) => {
    const { rows } = await pool.query(
      "SELECT * FROM bills WHERE table_id=$1 AND status='unpaid' ORDER BY id DESC LIMIT 1",
      [tableId]
    );
    return mapBill(rows[0] || null);
  },

  findById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM bills WHERE id=$1', [id]);
    return mapBill(rows[0] || null);
  },

  create: async ({ orderId, tableId, tableName, note, kasirId, kasirName }) => {
    // Ambil items langsung dari order_items JOIN menu — TIDAK percaya harga dari frontend
    const { rows: itemRows } = await pool.query(`
      SELECT oi.menu_id, oi.name, oi.qty, oi.station,
             m.price AS price,   -- harga resmi dari DB
             m.image
      FROM order_items oi
      JOIN menu m ON m.id = oi.menu_id
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `, [orderId]);

    if (!itemRows.length) {
      throw new Error('Order tidak memiliki item.');
    }

    const subtotal = itemRows.reduce((s, i) => s + i.price * i.qty, 0);
    const tax      = Math.round(subtotal * 0.1);
    const now      = new Date().toISOString();

    // Update harga di order_items sesuai harga DB (koreksi jika ada manipulasi)
    for (const i of itemRows) {
      await pool.query(
        'UPDATE order_items SET price=$1 WHERE order_id=$2 AND menu_id=$3',
        [i.price, orderId, i.menu_id]
      );
    }

    const { rows } = await pool.query(
      "INSERT INTO bills (order_id, order_ids, table_id, table_name, subtotal, tax, total, note, status, kasir_id, kasir_name, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'unpaid',$9,$10,$11) RETURNING *",
      [orderId, JSON.stringify([orderId]), tableId, tableName, subtotal, tax, subtotal + tax, note || '', kasirId, kasirName, now]
    );
    return mapBill(rows[0]);
  },

  addOrder: async (id, orderId) => {
    const { rows: br } = await pool.query('SELECT * FROM bills WHERE id=$1', [id]);
    if (!br[0]) return null;
    let orderIds = br[0].order_ids || [];
    if (!orderIds.length) orderIds = [br[0].order_id];
    if (!orderIds.includes(orderId)) orderIds.push(orderId);
    const items    = await getAllItems(orderIds);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const tax      = Math.round(subtotal * 0.1);
    await pool.query(
      'UPDATE bills SET order_ids=$1, subtotal=$2, tax=$3, total=$4 WHERE id=$5',
      [JSON.stringify(orderIds), subtotal, tax, subtotal + tax, id]
    );
    const { rows } = await pool.query('SELECT * FROM bills WHERE id=$1', [id]);
    return mapBill(rows[0]);
  },

  update: async (id, fields) => {
    const cols = [], vals = [];
    let i = 1;
    if (fields.status        !== undefined) { cols.push('status=$' + i++);          vals.push(fields.status); }
    if (fields.paidAt        !== undefined) { cols.push('paid_at=$' + i++);         vals.push(fields.paidAt); }
    if (fields.paymentMethod !== undefined) { cols.push('payment_method=$' + i++);  vals.push(fields.paymentMethod); }
    if (fields.paymentDetail !== undefined) { cols.push('payment_detail=$' + i++);  vals.push(JSON.stringify(fields.paymentDetail)); }
    if (!cols.length) return null;
    vals.push(id);
    await pool.query('UPDATE bills SET ' + cols.join(',') + ' WHERE id=$' + i, vals);
    const { rows } = await pool.query('SELECT * FROM bills WHERE id=$1', [id]);
    return mapBill(rows[0]);
  },
};

module.exports = BillModel;
