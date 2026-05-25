const pool = require('../config/db');

async function getItems(orderId) {
  const { rows } = await pool.query(
    'SELECT oi.*, m.image FROM order_items oi LEFT JOIN menu m ON m.id=oi.menu_id WHERE oi.order_id=$1 ORDER BY oi.id',
    [orderId]
  );
  return rows.map(i => ({
    id: i.menu_id, name: i.name, price: i.price,
    station: i.station, qty: i.qty, image: i.image || '',
    completed_at: i.completed_at || null,
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

  /**
   * Kirim order secara atomik:
   * 1. Simpan items ke order_items
   * 2. Update status order → 'sent'
   * 3. Kurangi stok menu dengan row-level lock (FOR UPDATE)
   * 4. Validasi stok tidak minus — jika kurang, ROLLBACK dan lempar error
   * Semua dalam satu transaksi PostgreSQL.
   */
  sendAtomically: async (id, items, note) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Cek order masih berstatus 'open'
      const { rows: orderRows } = await client.query(
        "SELECT * FROM orders WHERE id=$1 AND status='open' FOR UPDATE",
        [id]
      );
      if (!orderRows[0]) {
        throw new Error('Order tidak ditemukan atau sudah dikirim sebelumnya.');
      }

      // Simpan items — harga diambil dari DB, BUKAN dari frontend
      await client.query('DELETE FROM order_items WHERE order_id=$1', [id]);
      for (const item of items) {
        // Re-fetch harga resmi dari tabel menu
        const { rows: priceRows } = await client.query(
          'SELECT price, name, station FROM menu WHERE id=$1',
          [item.id]
        );
        if (!priceRows[0]) {
          throw new Error(`Menu dengan ID ${item.id} tidak ditemukan.`);
        }
        const trustedPrice   = priceRows[0].price;    // harga dari DB
        const trustedName    = priceRows[0].name;     // nama dari DB
        const trustedStation = priceRows[0].station;  // station dari DB

        await client.query(
          'INSERT INTO order_items (order_id, menu_id, name, price, station, qty) VALUES ($1,$2,$3,$4,$5,$6)',
          [id, item.id, trustedName, trustedPrice, trustedStation, item.qty]
        );
      }

      // Kurangi stok dengan row-level lock per menu item
      for (const item of items) {
        // Lock baris menu ini agar kasir lain tidak bisa baca stok lama
        const { rows: menuRows } = await client.query(
          'SELECT id, name, stock FROM menu WHERE id=$1 FOR UPDATE',
          [item.id]
        );
        if (!menuRows[0]) {
          throw new Error(`Menu "${item.name}" tidak ditemukan.`);
        }
        const currentStock = menuRows[0].stock;
        const newStock = currentStock - item.qty;
        if (newStock < 0) {
          throw new Error(
            `Stok "${menuRows[0].name}" tidak cukup. ` +
            `Tersedia: ${currentStock}, dibutuhkan: ${item.qty}.`
          );
        }
        await client.query(
          'UPDATE menu SET stock=$1 WHERE id=$2',
          [newStock, item.id]
        );
      }

      // Update status order dan note
      const noteVal = note !== undefined ? note : '';
      await client.query(
        "UPDATE orders SET status='sent', note=$1 WHERE id=$2",
        [noteVal, id]
      );

      await client.query('COMMIT');

      const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [id]);
      return mapOrder(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = OrderModel;
