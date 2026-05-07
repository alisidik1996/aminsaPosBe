const MenuModel = require('../models/menuModel');

const MenuController = {
  getAll: async (req, res) => {
    try {
      res.json(await MenuModel.findAll(req.query.category));
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getCategories: async (req, res) => {
    try {
      res.json(await MenuModel.findCategories());
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getOne: async (req, res) => {
    try {
      const item = await MenuModel.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Menu tidak ditemukan.' });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  create: async (req, res) => {
    try {
      const { name, price, category, station, stock = 0, image = '' } = req.body;
      if (!name || !price || !category || !station)
        return res.status(400).json({ error: 'name, price, category, station wajib diisi.' });
      res.status(201).json(await MenuModel.create(name, price, category, station, stock, image));
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  update: async (req, res) => {
    try {
      // stock tidak boleh diupdate lewat endpoint ini — gunakan PATCH /:id/stock
      const { stock: _ignored, ...safeBody } = req.body;
      const item = await MenuModel.update(req.params.id, safeBody);
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  updateStock: async (req, res) => {
    try {
      const { stock } = req.body;
      if (stock === undefined || stock < 0)
        return res.status(400).json({ error: 'Stok tidak valid.' });
      res.json(await MenuModel.updateStock(req.params.id, stock));
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  remove: async (req, res) => {
    try {
      await MenuModel.softDelete(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = MenuController;
