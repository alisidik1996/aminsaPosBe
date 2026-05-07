const CategoryModel = require('../models/categoryModel');

const CategoryController = {
  getAll: async (req, res) => {
    try {
      res.json(await CategoryModel.findAll());
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  create: async (req, res) => {
    try {
      const { name, station } = req.body;
      if (!name || !station)
        return res.status(400).json({ error: 'name dan station wajib diisi.' });
      if (!['kitchen', 'bar'].includes(station))
        return res.status(400).json({ error: 'station harus kitchen atau bar.' });
      const cat = await CategoryModel.create(name.trim(), station);
      res.status(201).json(cat);
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ error: 'Nama kategori sudah ada.' });
      res.status(500).json({ error: 'Server error.' });
    }
  },

  update: async (req, res) => {
    try {
      const { name, station } = req.body;
      if (!name || !station)
        return res.status(400).json({ error: 'name dan station wajib diisi.' });
      if (!['kitchen', 'bar'].includes(station))
        return res.status(400).json({ error: 'station harus kitchen atau bar.' });
      const cat = await CategoryModel.update(req.params.id, name.trim(), station);
      if (!cat) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
      res.json(cat);
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ error: 'Nama kategori sudah ada.' });
      res.status(500).json({ error: 'Server error.' });
    }
  },

  delete: async (req, res) => {
    try {
      await CategoryModel.delete(req.params.id);
      res.json({ success: true });
    } catch (e) {
      if (e.message.includes('masih digunakan'))
        return res.status(400).json({ error: e.message });
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = CategoryController;
