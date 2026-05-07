const TableModel = require('../models/tableModel');

const TableController = {
  getAll: async (req, res) => {
    try {
      res.json(await TableModel.findAll());
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getOne: async (req, res) => {
    try {
      const table = await TableModel.findById(req.params.id);
      if (!table) return res.status(404).json({ error: 'Meja tidak ditemukan.' });
      res.json(table);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  update: async (req, res) => {
    try {
      const table = await TableModel.update(req.params.id, req.body);
      if (!table) return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });
      res.json(table);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = TableController;
