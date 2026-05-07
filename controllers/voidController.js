const pool       = require('../config/db');
const OrderModel = require('../models/orderModel');
const BillModel  = require('../models/billModel');
const TableModel = require('../models/tableModel');

const VoidController = {
  /**
   * POST /api/void/table/:tableId
   * Void semua order & bill aktif di meja, reset meja ke available
   */
  voidTable: async (req, res) => {
    try {
      const { tableId } = req.params;
      const { reason = '' } = req.body;

      // Cari order aktif
      const order = await OrderModel.findActiveByTable(tableId);

      if (order) {
        // Void bill jika ada
        const bill = await BillModel.findByOrder(order.id).catch(() => null);
        if (bill && bill.status === 'unpaid') {
          await pool.query(
            `UPDATE bills SET status='voided', note=CONCAT(note, $1) WHERE id=$2`,
            [reason ? ` [VOID: ${reason}]` : ' [VOID]', bill.id]
          );
        }
        // Void order
        await pool.query(
          `UPDATE orders SET status='voided', note=CONCAT(note, $1) WHERE id=$2`,
          [reason ? ` [VOID: ${reason}]` : ' [VOID]', order.id]
        );
      }

      // Reset meja
      await TableModel.update(tableId, {
        status:   'available',
        openedAt: null,
        kasirId:  null,
      });

      res.json({ success: true, message: `Meja berhasil di-void.` });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  /**
   * POST /api/void/bill/:billId
   * Void bill tertentu (tanpa reset meja)
   */
  voidBill: async (req, res) => {
    try {
      const { billId } = req.params;
      const { reason = '' } = req.body;

      const bill = await BillModel.findById(billId);
      if (!bill) return res.status(404).json({ error: 'Bill tidak ditemukan.' });
      if (bill.status === 'paid') return res.status(400).json({ error: 'Bill sudah dibayar, tidak bisa di-void.' });

      await pool.query(
        `UPDATE bills SET status='voided', note=CONCAT(note, $1) WHERE id=$2`,
        [reason ? ` [VOID: ${reason}]` : ' [VOID]', billId]
      );
      await pool.query(
        `UPDATE orders SET status='voided' WHERE id=$1`,
        [bill.orderId]
      );
      await TableModel.update(bill.tableId, {
        status:   'available',
        openedAt: null,
        kasirId:  null,
      });

      res.json({ success: true, message: 'Bill berhasil di-void.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  /**
   * GET /api/void/history
   * Riwayat void
   */
  history: async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT b.id, b.table_name, b.total, b.note, b.created_at, b.kasir_name
        FROM bills b
        WHERE b.status = 'voided'
        ORDER BY b.created_at DESC
        LIMIT 50
      `);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = VoidController;
