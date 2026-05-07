const pool = require('../config/db');

async function getItems(orderId) {
  const { rows } = await pool.query(
    'SELECT oi.*, m.image FROM order_items oi LEFT JOIN menu m ON m.id=oi.menu_id WHERE oi.order_id=$1 ORDER BY oi.id',
    [orderId]
  );
  return rows.map(i => ({
    id: i.menu_id, name: i.name, price: i.price,
    station: i.station, qty: i.qty, image: i.image || '',
  }));
}

async function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id, tableId: row.table_id, kasirId: row.kasir_id,
    kasirName: row.kasir_name, note: row.note || '',
    status: row.status, createdAt: row.created_at,
    items: await getItems(row.id),
  };
}

const OrderModel = {
  findOpenByTable: async (tableId) => {
    const { rows } = await pool.query(
      "SELECT * FROM orders WHERE table_id=$1 AND status='open' ORDER BY id DESC LIMIT 1",
      [tableId]
    );
    return mapOrder(rows[0] || null);
  },

  findActiveByTable: async (tableId) => {
    const { rows } = await pool.query(
      "SELECT * FROM orders WHERE table_id=$1 AND status IN ('open','sent') ORDER BY id DESC LIMIT 1",
      [tableId]
    );
    return mapOrder(rows[0] || null);
  },

  findById: async (id) => {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [id]);
    return mapOrder(rows[0] || null);
  },

  create: async (tableId, kasirId, kasirName) => {
    const now = new Date().toISOString();
    const { rows } = await pool.query(
      "INSERT INTO orders (table_id, kasir_id, kasir_name, status, created_at) VALUES ($1,$2,$3,'open',$4) RETURNING *",
      [tableId, kasirId, kasirName, now]
    );
    return mapOrder(rows[0]);
  },

  update: async (id, fields) => {
    const cols = [], vals = [];
    let i = 1;
    if (fields.status !== undefined) { cols.push('status=$' + i++); vals.push(fields.status); }
    if (fields.note   !== undefined) { cols.push('note=$' + i++);   vals.push(fields.note); }
    if (cols.length) {
      vals.push(id);
      await pool.query('UPDATE orders SET ' + cols.join(',') + ' WHERE id=$' + i, vals);
    }
    if (fields.items !== undefined) {
      await pool.query('DELETE FROM order_items WHERE order_id=$1', [id]);
      for (const item of (fields.items || [])) {
        await pool.query(
          'INSERT INTO order_items (order_id, menu_id, name, price, station, qty) VALUES ($1,$2,$3,$4,$5,$6)',
          [id, item.id, item.name, item.price, item.station, item.qty]
        );
      }
    }
    const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [id]);
    return mapOrder(rows[0]);
  },
};

module.exports = OrderModel;
