const pool = require('../config/db');

const StationModel = {
  // Ambil semua order items untuk station tertentu yang belum selesai
  getPendingItems: async (station) => {
    const { rows } = await pool.query(`
      SELECT 
        oi.id, oi.order_id, oi.menu_id, oi.name, oi.price, oi.station, oi.qty, oi.completed_at,
        o.table_id, o.kasir_name, o.note AS order_note, o.created_at AS order_created,
        t.name AS table_name
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN tables_pos t ON t.id = o.table_id
      WHERE oi.station = $1 
        AND o.status = 'sent'
        AND oi.completed_at IS NULL
      ORDER BY o.created_at ASC, oi.id ASC
    `, [station]);
    return rows;
  },

  // Ambil semua order items untuk station tertentu (termasuk yang sudah selesai)
  getAllItems: async (station) => {
    const { rows } = await pool.query(`
      SELECT 
        oi.id, oi.order_id, oi.menu_id, oi.name, oi.price, oi.station, oi.qty, oi.completed_at,
        o.table_id, o.kasir_name, o.note AS order_note, o.created_at AS order_created,
        t.name AS table_name
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN tables_pos t ON t.id = o.table_id
      WHERE oi.station = $1 AND o.status = 'sent'
      ORDER BY oi.completed_at IS NULL DESC, o.created_at ASC, oi.id ASC
    `, [station]);
    return rows;
  },

  // Mark item sebagai selesai
  completeItem: async (itemId) => {
    const { rows } = await pool.query(`
      UPDATE order_items 
      SET completed_at = $1 
      WHERE id = $2 
      RETURNING id, order_id, menu_id, name, station, qty, completed_at
    `, [new Date().toISOString(), itemId]);
    return rows[0] || null;
  },

  // Mark item sebagai belum selesai (undo)
  undoCompleteItem: async (itemId) => {
    const { rows } = await pool.query(`
      UPDATE order_items 
      SET completed_at = NULL 
      WHERE id = $1 
      RETURNING id, order_id, menu_id, name, station, qty, completed_at
    `, [itemId]);
    return rows[0] || null;
  },

  // Cek apakah semua items di suatu order sudah selesai
  isOrderComplete: async (orderId) => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS pending_count
      FROM order_items 
      WHERE order_id = $1 AND completed_at IS NULL
    `, [orderId]);
    return parseInt(rows[0].pending_count) === 0;
  },
};

module.exports = StationModel;