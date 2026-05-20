const BillModel = require('../models/billModel');

const BillController = {
  getByOrder: async (req, res) => {
    try {
      const bill = await BillModel.findByOrder(req.params.orderId);
      res.json(bill || null);   // null = tidak ada bill, bukan error
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getByTable: async (req, res) => {
    try {
      const bill = await BillModel.findByTable(req.params.tableId);
      res.json(bill || null);   // null = tidak ada bill aktif, bukan error
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getOne: async (req, res) => {
    try {
      const bill = await BillModel.findById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Bill tidak ditemukan.' });
      res.json(bill);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  create: async (req, res) => {
    try {
      const { orderId, tableId, tableName, items, note = '', kasirId, kasirName } = req.body;
      if (!orderId || !tableId || !tableName || !items || !kasirId || !kasirName)
        return res.status(400).json({ error: 'Field wajib: orderId, tableId, tableName, items, kasirId, kasirName.' });
      res.status(201).json(await BillModel.create({ orderId, tableId, tableName, items, note, kasirId, kasirName }));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  addOrder: async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: 'orderId wajib diisi.' });
      const bill = await BillModel.findById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Bill tidak ditemukan.' });
      if (bill.status === 'paid') return res.status(400).json({ error: 'Bill sudah dibayar.' });
      res.json(await BillModel.addOrder(req.params.id, orderId));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  update: async (req, res) => {
    try {
      const bill = await BillModel.update(req.params.id, req.body);
      if (!bill) return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });
      res.json(bill);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = BillController;
