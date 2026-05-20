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
};

module.exports = OrderController;
