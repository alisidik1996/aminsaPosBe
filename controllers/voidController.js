const pool       = require('../config/db');
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

      // Void semua bill unpaid di meja ini
      const { rows: bills } = await pool.query(
        "SELECT * FROM bills WHERE table_id=$1 AND status='unpaid'",
        [tableId]
      );
      for (const bill of bills) {
        await pool.query(
          "UPDATE bills SET status='voided', note=COALESCE(note, '') || $1::TEXT WHERE id=$2",
          [reason ? ` [VOID: ${reason}]` : ' [VOID]', bill.id]
        );
        // Void semua order terkait bill
        const orderIds = bill.order_ids?.length ? bill.order_ids : (bill.order_id ? [bill.order_id] : []);
        for (const oid of orderIds) {
          await pool.query(
            "UPDATE orders SET status='voided', note=COALESCE(note, '') || $1::TEXT WHERE id=$2",
            [reason ? ` [VOID: ${reason}]` : ' [VOID]', oid]
          );
        }
      }

      // Void semua order aktif yang mungkin belum punya bill
      await pool.query(
        "UPDATE orders SET status='voided', note=COALESCE(note, '') || $1::TEXT WHERE table_id=$2 AND status IN ('open','sent')",
        [reason ? ` [VOID: ${reason}]` : ' [VOID]', tableId]
      );

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

      const { rows: billRows } = await pool.query('SELECT * FROM bills WHERE id=$1', [billId]);
      if (!billRows[0]) return res.status(404).json({ error: 'Bill tidak ditemukan.' });
      const bill = {
        status:   billRows[0].status,
        orderId:  billRows[0].order_id,
        orderIds: billRows[0].order_ids || [],
        tableId:  billRows[0].table_id,
      };
      if (bill.status === 'paid') return res.status(400).json({ error: 'Bill sudah dibayar, tidak bisa di-void.' });

      await pool.query(
        "UPDATE bills SET status='voided', note=COALESCE(note, '') || $1::TEXT WHERE id=$2",
        [reason ? ` [VOID: ${reason}]` : ' [VOID]', billId]
      );

      // Void semua order yang terkait dengan bill ini
      const orderIds = bill.orderIds?.length ? bill.orderIds : [bill.orderId];
      for (const oid of orderIds) {
        await pool.query(
          `UPDATE orders SET status='voided' WHERE id=$1`,
          [oid]
        );
      }

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
