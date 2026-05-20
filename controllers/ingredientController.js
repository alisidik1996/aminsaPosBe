const IngredientModel = require('../models/ingredientModel');
const RecipeModel     = require('../models/recipeModel');

const IngredientController = {
  getAll: async (req, res) => {
    try {
      const items = await IngredientModel.findAllWithInactive();
      res.json(items);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getOne: async (req, res) => {
    try {
      const item = await IngredientModel.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Bahan tidak ditemukan.' });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  create: async (req, res) => {
    try {
      const { name, unit, min_stock, cost_per_unit } = req.body;
      if (!name?.trim() || !unit?.trim())
        return res.status(400).json({ error: 'Nama dan satuan wajib diisi.' });

      // Cek duplikat
      const existing = await IngredientModel.findByName(name.trim());
      if (existing)
        return res.status(400).json({ error: `Bahan "${name}" sudah ada.` });

      const item = await IngredientModel.create(
        name.trim(), unit.trim(),
        parseFloat(min_stock) || 0,
        cost_per_unit ? parseFloat(cost_per_unit) : null
      );
      res.status(201).json(item);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  update: async (req, res) => {
    try {
      const fields = {};
      const { name, unit, stock, min_stock, cost_per_unit, active } = req.body;
      if (name !== undefined)         fields.name          = name.trim();
      if (unit !== undefined)         fields.unit          = unit.trim();
      if (stock !== undefined)        fields.stock         = parseFloat(stock);
      if (min_stock !== undefined)    fields.min_stock     = parseFloat(min_stock);
      if (cost_per_unit !== undefined) fields.cost_per_unit = cost_per_unit ? parseFloat(cost_per_unit) : null;
      if (active !== undefined)       fields.active        = parseInt(active);

      const item = await IngredientModel.update(req.params.id, fields);
      if (!item) return res.status(404).json({ error: 'Bahan tidak ditemukan.' });
      res.json(item);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // PATCH /api/ingredients/:id/stock — tambah/kurangi stok
  adjustStock: async (req, res) => {
    try {
      const { delta } = req.body;
      if (delta === undefined || isNaN(parseFloat(delta)))
        return res.status(400).json({ error: 'delta wajib diisi (angka positif/negatif).' });

      const item = await IngredientModel.updateStock(req.params.id, parseFloat(delta));
      if (!item) return res.status(404).json({ error: 'Bahan tidak ditemukan.' });

      // Sync semua menu yang pakai bahan ini
      await RecipeModel.syncAllMenusUsingIngredient(req.params.id);

      res.json(item);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  delete: async (req, res) => {
    try {
      const inUse = await IngredientModel.isUsedInRecipes(req.params.id);
      if (inUse)
        return res.status(400).json({ error: 'Bahan masih digunakan di resep. Hapus dari resep terlebih dahulu.' });

      const item = await IngredientModel.delete(req.params.id);
      if (!item) return res.status(404).json({ error: 'Bahan tidak ditemukan.' });
      res.json({ message: 'Bahan berhasil dihapus.', item });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = IngredientController;
