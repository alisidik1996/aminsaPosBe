const OrderModel = require('../models/orderModel');

const OrderController = {
  getOpenByTable: async (req, res) => {
    try {
      const order = await OrderModel.findOpenByTable(req.params.tableId);
      res.json(order || null);   // null = tidak ada order open, bukan error
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getActiveByTable: async (req, res) => {
    try {
      const order = await OrderModel.findActiveByTable(req.params.tableId);
      res.json(order || null);   // null = tidak ada order aktif, bukan error
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getOne: async (req, res) => {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  create: async (req, res) => {
    try {
      const { tableId, kasirId, kasirName } = req.body;
      if (!tableId || !kasirId || !kasirName)
        return res.status(400).json({ error: 'tableId, kasirId, kasirName wajib diisi.' });
      res.status(201).json(await OrderModel.create(tableId, kasirId, kasirName));
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  update: async (req, res) => {
    try {
      res.json(await OrderModel.update(req.params.id, req.body));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  /**
   * POST /api/orders/:id/send
   * Kirim order secara atomik — update status, simpan items, kurangi stok
   * dalam satu transaksi PostgreSQL. Mencegah race condition antar kasir.
   */
  send: async (req, res) => {
    try {
      const { items, note } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items wajib diisi dan tidak boleh kosong.' });
      }
      const order = await OrderModel.sendAtomically(req.params.id, items, note);
      res.json(order);
    } catch (e) {
      console.error(e);
      // Kembalikan pesan error yang informatif (misal stok tidak cukup)
      res.status(400).json({ error: e.message || 'Gagal mengirim order.' });
    }
  },
};

module.exports = OrderController;
